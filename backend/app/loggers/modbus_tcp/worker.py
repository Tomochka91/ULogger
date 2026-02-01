# Copyright (c) 2025
# TTL & SEM Engineering Team
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.


# backend/app/loggers/modbus_tcp/worker.py
"""
Modbus TCP connection worker.

This worker implements periodic polling of Modbus holding registers over TCP and (optionally)
writes the resulting values to a database.

High-level behavior:
- Connects to a Modbus TCP endpoint (host:port) using `pymodbus` (or an injected client in tests).
- Reconnects automatically when `autoconnect=True`.
- Polls configured slaves (Unit IDs) and their variables on a fixed `poll_interval`.
- Reads 1 or 2 holding registers per variable depending on `encoding`.
- Decodes register values into Python numbers (u16/s16/u32/s32/float32, ABCD/CDAB word order),
  and applies optional linear scaling (y = k*x + b).
- Maintains "last known good" values per variable; when a read fails, the previous value (or
  configured default) is used in the payload.
- If DB writing is enabled (`config.enabled=True`) and a `query_template` is configured, builds
  a parameterized SQL query and writes it using the provided `DBWriter`.

Threading model:
- The worker runs in a background thread started via `start()`.
- `stop()` requests shutdown and the loop exits on the next check / wait.
"""

import threading
import time
from typing import Optional, Dict, List, Protocol, runtime_checkable, Union, Any
from struct import pack, unpack
from datetime import datetime

from pymodbus.client import ModbusTcpClient

from backend.app.loggers.base import BaseConnectionWorker, WorkerState
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.modbus_tcp.config import (
    ModbusTcpConfig,
    ModbusTcpSlaveConfig,
    ModbusTcpVariableConfig,
    ModbusTcpValueEncoding,
)
from backend.app.core.query_template import build_query
from backend.app.core.db_writer import BaseDBWriter

Number = Union[int, float]


@runtime_checkable
class ModbusTcpClientProtocol(Protocol):
    """
    Minimal protocol required from a Modbus TCP client.

    This is used to allow dependency injection in tests (fake clients) while keeping
    the runtime implementation compatible with `pymodbus`.
    """
    def connect(self) -> bool: ...
    def close(self) -> None: ...
    def read_holding_registers(self, address: int, count: int, device_id: int) -> Any: ...


class ModbusTcpConnectionWorker(BaseConnectionWorker):
    """
    Modbus TCP worker.

    Responsibilities:
    - Connect to a TCP endpoint (host:port)
    - Reconnect when needed (autoconnect=True)
    - Poll configured slaves/variables on `poll_interval`
    - Decode register values (16/32-bit, signed/unsigned, float, ABCD/CDAB word order, scaling)
    - Optionally write results to DB via `query_template` + `DBWriter` (when enabled=True)
    """

    _RECONNECT_INTERVAL = 2.0  # секунд

    def __init__(
        self,
        config: LoggerConnectionConfig,
        db_writer: Optional[BaseDBWriter] = None,
        client: Optional[ModbusTcpClientProtocol] = None,
    ) -> None:
        super().__init__()

        if config.type != ConnectionType.modbus_tcp:
            raise ValueError("ModbusTcpConnectionWorker requires connection.type = 'modbus_tcp'")

        self._config = config
        self._tcp_config: ModbusTcpConfig = self._ensure_tcp_config(config)
        self._db_writer = db_writer

        self._client_lock = threading.Lock()
        self._client: Optional[ModbusTcpClientProtocol] = client

        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._thread_lock = threading.Lock()

        # Last successful values (per variable name)
        self._values_lock = threading.Lock()
        self._values: Dict[str, Number] = {}

        self._init_extra_metrics({
            "connect_fail_total": 0,
            "reconnects_total": 0,

            "polls_total": 0,
            "poll_latency_ms_last": None,
            "poll_latency_ms_avg": None,

            "requests_total": 0,
            "request_latency_ms_last": None,
            "request_latency_ms_avg": None,

            "responses_error_total": 0,
            "registers_read_total": 0,

            "variables_ok_total": 0,
            "variables_fail_total": 0,
        })

    # ---------------- helpers ----------------

    @staticmethod
    def _ensure_tcp_config(config: LoggerConnectionConfig) -> ModbusTcpConfig:
        tcp = getattr(config, "modbus_tcp", None)
        if tcp is None:
            raise ValueError("ModbusTcpConnectionWorker requires modbus_tcp config")
        return tcp

    @property
    def config(self) -> LoggerConnectionConfig:
        return self._config

    # ---------------- worker API ----------------

    def start(self) -> None:
        with self._thread_lock:
            if self.state == WorkerState.RUNNING:
                return
            if self._thread is not None and self._thread.is_alive():
                return

            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._set_state(WorkerState.RUNNING)

            self._metric_inc("runs_total")
            self._metric_set("started_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))

            self._thread.start()

    def stop(self) -> None:
        self._set_state(WorkerState.STOPPING)
        self._stop_event.set()

    def join(self, timeout: Optional[float] = None) -> None:
        t = self._thread
        if t is not None:
            t.join(timeout)

    def is_running(self) -> bool:
        return self.state == WorkerState.RUNNING

    def close(self) -> None:
        self._close_client()
        if self._db_writer is not None:
            self._db_writer.close()

    # ---------------- TCP client ----------------

    def _open_client(self) -> bool:
        """
        Create and connect a `ModbusTcpClient` if no client was injected externally.
        """
        with self._client_lock:
            if self._client is not None:
                return True

        hs = self._tcp_config.host

        try:
            client = ModbusTcpClient(
                host=hs.address,
                port=hs.port,
                timeout=hs.timeout,
            )
        except Exception as exc:
            self._set_error(f"failed to create Modbus TCP client: {exc}")
            return False

        try:
            ok = client.connect()
        except Exception as exc:
            self._set_error(f"failed to connect Modbus TCP client: {exc}")
            try:
                client.close()
            except Exception:
                pass
            return False

        if not ok:
            self._set_error("Modbus TCP client.connect() returned False")
            try:
                client.close()
            except Exception:
                pass
            return False

        with self._client_lock:
            self._client = client

        self._log_message(f"Modbus TCP connected to {hs.address}:{hs.port}")
        return True

    def _close_client(self) -> None:
        with self._client_lock:
            client = self._client
            self._client = None

        if client is not None:
            try:
                client.close()
            except Exception:
                pass

    # ---------------- main loop ----------------

    def _run_loop(self) -> None:
        try:
            poll_interval = self._tcp_config.poll_interval
            if poll_interval <= 0:
                poll_interval = 0.1

            autoconnect = self._tcp_config.host.autoconnect

            while not self._stop_event.is_set():
                with self._client_lock:
                    has_client = self._client is not None

                if not has_client:
                    opened = self._open_client()
                    if not opened:
                        if not autoconnect:
                            self._set_error("failed to open Modbus TCP client")
                            break
                        self._set_error("failed to open Modbus TCP client, will retry...")
                        if self._stop_event.wait(self._RECONNECT_INTERVAL):
                            break
                        continue

                try:
                    self._metric_inc("polls_total", extra=True)

                    def do_poll():
                        self._poll_once()

                    self._metric_time_block(
                        "poll_latency_ms_last",
                        "poll_latency_ms_avg",
                        do_poll,
                        extra=True,
                    )
                except Exception as exc:
                    self._set_error(f"poll error: {exc}")

                if self._stop_event.wait(poll_interval):
                    break

            self._set_state(WorkerState.STOPPED)
        except Exception as exc:
            self._set_error(str(exc))
            self._set_state(WorkerState.ERROR)
        finally:
            self._metric_set("stopped_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self.close()
            if self.state not in (WorkerState.STOPPED, WorkerState.ERROR):
                self._set_state(WorkerState.STOPPED)

    # ---------------- polling ----------------

    def _poll_once(self) -> None:
        """
        Perform one polling cycle for all slaves and variables.
        """
        with self._client_lock:
            client = self._client

        if client is None:
            self._log_message("Modbus TCP client is not set; skipping poll")
            return

        payload: Dict[str, Number] = {}

        for slave_cfg in self._tcp_config.slaves:
            self._poll_slave(client, slave_cfg, payload)

        self._handle_polled_values(payload)

    def _poll_slave(
        self,
        client: ModbusTcpClientProtocol,
        slave_cfg: ModbusTcpSlaveConfig,
        payload: Dict[str, Number],
    ) -> None:
        for var in slave_cfg.variables:
            try:
                value = self._read_variable(client, slave_cfg.slave_id, var)
                if value is not None:
                    self._update_value(var.name, value)
            except Exception as exc:
                self._metric_inc("variables_fail_total", extra=True)
                self._set_error(
                    f"modbus tcp read error (slave={slave_cfg.slave_id}, "
                    f"name={slave_cfg.slave_name}, var={var.name}): {exc}"
                )

        for var in slave_cfg.variables:
            payload[var.name] = self._get_current_value(var)

    def _read_variable(
        self,
        client: ModbusTcpClientProtocol,
        slave_id: int,
        var: ModbusTcpVariableConfig,
    ) -> Optional[Number]:
        # Determine how many registers are required for this encoding
        if var.encoding in {
            ModbusTcpValueEncoding.U16,
            ModbusTcpValueEncoding.S16,
            ModbusTcpValueEncoding.U16_SCALED,
            ModbusTcpValueEncoding.S16_SCALED,
        }:
            count = 1
        else:
            count = 2

        self._metric_inc("requests_total", extra=True)

        def do_req():
            return client.read_holding_registers(
                address=var.address,
                count=count,
                device_id=slave_id,
            )

        response = self._metric_time_block(
            "request_latency_ms_last",
            "request_latency_ms_avg",
            do_req,
            extra=True,
        )

        # `pymodbus`-style response: has isError() and .registers
        if response is None or getattr(response, "isError", lambda: True)():
            raise RuntimeError("modbus response error")

        registers: List[int] = getattr(response, "registers", [])
        if len(registers) < count:
            raise RuntimeError(f"not enough registers: need {count}, got {len(registers)}")

        decode = self._decode_registers(registers, var)
        self._metric_inc("variables_ok_total", extra=True)

        return decode

    # ---------------- values + decode ----------------

    def _update_value(self, name: str, value: Number) -> None:
        with self._values_lock:
            self._values[name] = value

    def _get_current_value(self, var: ModbusTcpVariableConfig) -> Number:
        """
        Returns:
          - the last successful value for the variable (if available),
          - otherwise the configured default (may be None).
        """
        with self._values_lock:
            if var.name in self._values:
                return self._values[var.name]
        return var.default

    def _decode_registers(self, registers: List[int], var: ModbusTcpVariableConfig) -> Number:
        enc = var.encoding

        def apply_scale(x: Number) -> Number:
            return var.k * x + var.b

        # 16-bit
        if enc in (ModbusTcpValueEncoding.U16, ModbusTcpValueEncoding.U16_SCALED):
            raw = registers[0] & 0xFFFF
            value: Number = raw
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        if enc in (ModbusTcpValueEncoding.S16, ModbusTcpValueEncoding.S16_SCALED):
            raw = registers[0] & 0xFFFF
            if raw & 0x8000:
                raw -= 0x10000
            value: Number = raw
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        # 32-bit
        hi = registers[0] & 0xFFFF
        lo = registers[1] & 0xFFFF

        def make_u32_abcd(h: int, l: int) -> int:
            return ((h << 16) | l) & 0xFFFFFFFF

        # ABCD keeps word order, CDAB swaps 16-bit words
        if enc in (
            ModbusTcpValueEncoding.U32_ABCD,
            ModbusTcpValueEncoding.U32_SCALED_ABCD,
            ModbusTcpValueEncoding.S32_ABCD,
            ModbusTcpValueEncoding.S32_SCALED_ABCD,
            ModbusTcpValueEncoding.F32_ABCD,
            ModbusTcpValueEncoding.F32_SCALED_ABCD,
        ):
            u32 = make_u32_abcd(hi, lo)
        else:
            u32 = make_u32_abcd(lo, hi)

        # Unsigned 32-bit
        if enc in (
            ModbusTcpValueEncoding.U32_ABCD,
            ModbusTcpValueEncoding.U32_SCALED_ABCD,
            ModbusTcpValueEncoding.U32_CDAB,
            ModbusTcpValueEncoding.U32_SCALED_CDAB,
        ):
            value: Number = u32
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        # Signed 32-bit
        if enc in (
            ModbusTcpValueEncoding.S32_ABCD,
            ModbusTcpValueEncoding.S32_SCALED_ABCD,
            ModbusTcpValueEncoding.S32_CDAB,
            ModbusTcpValueEncoding.S32_SCALED_CDAB,
        ):
            if u32 & 0x80000000:
                u32_signed = u32 - 0x100000000
            else:
                u32_signed = u32
            value = u32_signed
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        # Float32 (IEEE754): interpret u32 as big-endian float bits
        f = unpack(">f", pack(">I", u32))[0]
        value: Number = f
        if "scaled" in enc.value:
            value = apply_scale(value)
        return value

    # ---------------- DB write ----------------

    def _handle_polled_values(self, payload: Dict[str, Number]) -> None:
        """
        Called after each full polling cycle (all slaves have been processed).
        Decides whether to write the payload to the database.
        """
        if not self._config.enabled:
            self._log_message(f"Modbus TCP Slave response: {payload}")
            return
        if not self._config.query_template or self._db_writer is None:
            return

        sql, params = build_query(self._config.query_template, payload)
        self._log_message(f"DB write: {params}")

        def do_write():
            self._db_writer.write(sql, params)

        try:
            self._metric_time_block(
                "db_write_latency_ms_last",
                "db_write_latency_ms_avg",
                do_write,
                extra=False,
            )
            self._metric_set("last_db_write_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self._metric_inc("db_writes_total")
        except Exception as exc:
            self._metric_set("last_db_error_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self._metric_inc("db_write_fail_total")
            self._set_error(f"db write error: {exc}")
