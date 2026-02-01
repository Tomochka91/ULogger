# Copyright (c) 2025
# TTL & SEM Engineering Team
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.


# backend/app/loggers/modbus_rtu/worker.py
"""
Modbus RTU connection worker.

This module implements a runtime worker responsible for polling Modbus RTU devices
over a serial (COM) port and optionally persisting read values into the database.

Key responsibilities:
- manage Modbus RTU client lifecycle (connect/reconnect/close)
- periodically poll configured slaves/variables (poll_interval)
- read holding registers (1 or 2 registers depending on encoding)
- decode registers into typed values (ModbusValueEncoding) and apply scaling (y = k*x + b)
- build SQL parameters payload and write to DB using a DBWriter (if enabled)

The worker keeps the last successfully read values per variable and can fall back to
variable defaults when a new value is unavailable.
"""

import threading
import time
from typing import Optional, Dict, Any, List, Protocol, runtime_checkable, Union
from struct import pack, unpack
from datetime import datetime

from pymodbus.client import ModbusSerialClient
from pymodbus.framer import FramerType
from backend.app.loggers.base import BaseConnectionWorker, WorkerState
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.modbus_rtu.config import (
    ModbusRtuConfig,
    ModbusSlaveConfig,
    ModbusVariableConfig,
    ModbusValueEncoding,
)
from backend.app.core.query_template import build_query
from backend.app.core.db_writer import BaseDBWriter


Number = Union[int, float]


@runtime_checkable
class ModbusClientProtocol(Protocol):
    """
    Minimal protocol for a Modbus RTU client.

    This is used to allow dependency injection of a fake/test client while keeping
    compatibility with pymodbus response objects (.isError(), .registers).
    """
    def read_holding_registers(self, address: int, count: int, device_id: int) -> Any: ...


class ModbusRtuConnectionWorker(BaseConnectionWorker):
    """
    Worker for a Modbus RTU connection.

    - Uses a serial (COM) port
    - Periodically polls configured slaves and variables (poll_interval)
    - Reads 1 or 2 holding registers per variable (depending on ModbusValueEncoding)
    - Decodes registers to a value and applies scaling (y = k*x + b)
    - Builds a dict {var_name: value} and writes to DB via DBWriter using query_template
    """

    _RECONNECT_INTERVAL = 2.0  # seconds

    def __init__(
        self,
        config: LoggerConnectionConfig,
        db_writer: Optional[BaseDBWriter] = None,
        client: Optional[ModbusClientProtocol] = None,
    ) -> None:
        super().__init__()

        if config.type != ConnectionType.modbus_rtu:
            raise ValueError("ModbusRtuConnectionWorker requires connection.type = 'modbus_rtu'")

        self._config = config
        self._mb_config: ModbusRtuConfig = self._ensure_mb_config(config)
        self._db_writer = db_writer

        self._client_lock = threading.Lock()
        self._client: Optional[ModbusSerialClient | ModbusClientProtocol] = client

        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._thread_lock = threading.Lock()

        # Keep last successfully read variable values:
        # key = var.name, value = last decoded value
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

    # --------------- Configuration helpers ---------------

    @staticmethod
    def _ensure_mb_config(config: LoggerConnectionConfig) -> ModbusRtuConfig:
        mb = getattr(config, "modbus_rtu", None)
        if mb is None:
            raise ValueError("ModbusRtuConnectionWorker requires modbus_rtu config")
        return mb

    @property
    def config(self) -> LoggerConnectionConfig:
        return self._config

    # --------------- Worker API ---------------

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
        self._close_client()

    def join(self, timeout: Optional[float] = None) -> None:
        thread = self._thread
        if thread is not None:
            thread.join(timeout)

    def is_running(self) -> bool:
        return self.state == WorkerState.RUNNING

    def close(self) -> None:
        """
        Release resources owned by the worker.
        """
        self._close_client()
        if self._db_writer is not None:
            self._db_writer.close()

    # --------------- Modbus client lifecycle ---------------

    def _open_client(self) -> bool:
        """
        Create and connect a ModbusSerialClient if it is not created yet.
        Returns True on success.
        """
        # If an external client was injected (e.g., in tests), keep it as-is.
        with self._client_lock:
            if self._client is not None:
                return True

        port_cfg = self._mb_config.port

        try:
            client = ModbusSerialClient(
                port=port_cfg.port,
                framer=FramerType.RTU,
                baudrate=port_cfg.baudrate,
                bytesize=port_cfg.databits,
                parity={
                    "None": "N",
                    "Even": "E",
                    "Odd": "O",
                    "Mark": "M",
                    "Space": "S",
                }.get(port_cfg.parity, "N"),
                stopbits=int(port_cfg.stopbits),
                timeout=port_cfg.timeout,
            )
        except Exception as exc:
            msg = f"failed to create Modbus client: {exc}"
            self._set_error(msg)
            return False

        try:
            ok = client.connect()
        except Exception as exc:
            msg = f"failed to connect Modbus client: {exc}"
            self._set_error(msg)
            try:
                client.close()
            except Exception:
                pass
            return False

        if not ok:
            self._set_error("Modbus client.connect() returned False")
            try:
                client.close()
            except Exception:
                pass
            return False

        with self._client_lock:
            self._client = client

        self._log_message(
            f"Modbus RTU connected on {port_cfg.port} "
            f"({port_cfg.baudrate} {port_cfg.databits}{port_cfg.parity[0]}{port_cfg.stopbits})"
        )
        return True

    def _close_client(self) -> None:
        with self._client_lock:
            client = self._client
            self._client = None

        if client is not None and hasattr(client, "close"):
            try:
                client.close()
            except Exception:
                pass

    # --------------- Main loop ---------------

    def _run_loop(self) -> None:
        try:
            poll_interval = self._mb_config.poll_interval
            if poll_interval <= 0:
                poll_interval = 0.1

            autoconnect = self._mb_config.port.autoconnect

            while not self._stop_event.is_set():
                # Ensure client is created/connected
                with self._client_lock:
                    has_client = self._client is not None

                if not has_client:
                    opened = self._open_client()
                    if not opened:
                        if not autoconnect:
                            # No autoconnect: treat it as a failure and exit the loop
                            self._set_error("failed to open Modbus RTU client")
                            break
                        # Autoconnect enabled: wait and retry
                        self._set_error("failed to open Modbus RTU client, will retry...")
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
                    # Any unexpected polling error: record it and continue
                    msg = f"poll error: {exc}"
                    self._set_error(msg)

                # Wait for the polling interval unless stop requested
                if self._stop_event.wait(poll_interval):
                    break

            self._set_state(WorkerState.STOPPED)
        except Exception as exc:
            # Fatal top-level error: switch to ERROR state
            self._set_error(str(exc))
            self._set_state(WorkerState.ERROR)
        finally:
            self._metric_set("stopped_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self.close()
            if self.state not in (WorkerState.STOPPED, WorkerState.ERROR):
                self._set_state(WorkerState.STOPPED)

    # --------------- Modbus polling ---------------

    def _poll_once(self) -> None:
        """
        One polling cycle for all slaves and variables.
        """
        client = self._client
        if client is None:
            # Absence of a client is allowed at this step.
            # In tests we always inject a fake client.
            self._log_message("Modbus client is not set; skipping poll")
            return

        payload: Dict[str, Number] = {}

        for slave_cfg in self._mb_config.slaves:
            self._poll_slave(client, slave_cfg, payload)

        # After payload is prepared, write to DB if enabled
        self._handle_polled_values(payload)

    def _poll_slave(
        self,
        client: ModbusClientProtocol,
        slave_cfg: ModbusSlaveConfig,
        payload: Dict[str, Number],
    ) -> None:
        for var in slave_cfg.variables:
            try:
                value = self._read_variable(client, slave_cfg.slave_id, var)
                if value is not None:
                    self._update_value(var.name, value)
            except Exception as exc:
                self._metric_inc("variables_fail_total", extra=True)
                self._set_error(f"modbus read error (slave={slave_cfg.slave_id}, var={var.name}): {exc}")

        # After polling all variables for this slave, collect current values for payload
        for var in slave_cfg.variables:
            payload[var.name] = self._get_current_value(var)

    def _read_variable(
        self,
        client: ModbusClientProtocol,
        slave_id: int,
        var: ModbusVariableConfig,
    ) -> Optional[Number]:
        """
        Read register(s) for a single variable and decode them.

        This method uses an abstract client.read_holding_registers call to make it easy
        to inject a mock client for tests.
        """
        # Determine how many registers are required
        if var.encoding in {
            ModbusValueEncoding.U16,
            ModbusValueEncoding.S16,
            ModbusValueEncoding.U16_SCALED,
            ModbusValueEncoding.S16_SCALED,
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

        # Pymodbus-like response contract: isError() and .registers
        if response is None or getattr(response, "isError", lambda: True)():
            raise RuntimeError("modbus response error")

        registers: List[int] = getattr(response, "registers", [])
        if len(registers) < count:
            raise RuntimeError(
                f"not enough registers: need {count}, got {len(registers)}"
            )

        decode = self._decode_registers(registers, var)
        self._metric_inc("variables_ok_total", extra=True)

        return decode

    # --------------- Value storage and decoding ---------------

    def _update_value(self, name: str, value: Number) -> None:
        with self._values_lock:
            self._values[name] = value

    def _get_current_value(self, var: ModbusVariableConfig) -> Number:
        """
        Returns:
          - the last successful value for the variable, if present
          - otherwise its default (may be None)
        """
        with self._values_lock:
            if var.name in self._values:
                return self._values[var.name]
        return var.default

    def _decode_registers(
        self,
        registers: List[int],
        var: ModbusVariableConfig,
    ) -> Number:
        enc = var.encoding

        def apply_scale(x: Number) -> Number:
            return var.k * x + var.b

        # 16-bit
        if enc in (ModbusValueEncoding.U16, ModbusValueEncoding.U16_SCALED):
            raw = registers[0] & 0xFFFF
            value: Number = raw
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        if enc in (ModbusValueEncoding.S16, ModbusValueEncoding.S16_SCALED):
            raw = registers[0] & 0xFFFF
            if raw & 0x8000:
                raw -= 0x10000
            value = raw
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        # For 32-bit types we need two registers
        hi = registers[0] & 0xFFFF
        lo = registers[1] & 0xFFFF

        def make_u32_abcd(h: int, l: int) -> int:
            return ((h << 16) | l) & 0xFFFFFFFF

        if enc in (
            ModbusValueEncoding.U32_ABCD,
            ModbusValueEncoding.U32_SCALED_ABCD,
            ModbusValueEncoding.S32_ABCD,
            ModbusValueEncoding.S32_SCALED_ABCD,
            ModbusValueEncoding.F32_ABCD,
            ModbusValueEncoding.F32_SCALED_ABCD,
        ):
            u32 = make_u32_abcd(hi, lo)
        else:
            # CDAB: swap words
            u32 = make_u32_abcd(lo, hi)

        # 32-bit unsigned / signed integer
        if enc in (
            ModbusValueEncoding.U32_ABCD,
            ModbusValueEncoding.U32_SCALED_ABCD,
            ModbusValueEncoding.U32_CDAB,
            ModbusValueEncoding.U32_SCALED_CDAB,
        ):
            value = u32
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        if enc in (
            ModbusValueEncoding.S32_ABCD,
            ModbusValueEncoding.S32_SCALED_ABCD,
            ModbusValueEncoding.S32_CDAB,
            ModbusValueEncoding.S32_SCALED_CDAB,
        ):
            if u32 & 0x80000000:
                u32_signed = u32 - 0x100000000
            else:
                u32_signed = u32
            value = u32_signed
            if "scaled" in enc.value:
                value = apply_scale(value)
            return value

        # 32-bit float: interpret u32 as IEEE754 float
        f = unpack(">f", pack(">I", u32))[0]
        value = f
        if "scaled" in enc.value:
            value = apply_scale(value)
        return value

    # --------------- Handling poll results ---------------

    def _handle_polled_values(self, payload: Dict[str, Number]) -> None:
        """
        Called after each full polling cycle (all slaves).

        Decides whether to write data to the database.
        """
        if not self._config.enabled:
            self._log_message(f"Modbus RTU Slave response: {payload}")
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
