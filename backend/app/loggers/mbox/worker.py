# Copyright (c) 2025
# TTL & SEM Engineering Team
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.


# backend/app/loggers/mbox/worker.py
"""
MBox connection worker.

This module implements a full serial-processing pipeline for MBox devices:

    serial.read(bytes)
        -> MboxFramer
        -> payload (raw bytes)
        -> parse_label_frame
        -> MboxTransformer (domain logic)
        -> build_query
        -> DBWriter

Additionally, the worker optionally integrates with an external counter:
- confirms "clean" packs via counter increments
- detects missed packs
- inserts synthetic ("miss") records according to configured strategy

The worker is stateful and runs in its own background thread.
"""

import threading
import time
from typing import Optional, Callable
from datetime import datetime

import serial
from serial import Serial, SerialException

from backend.app.loggers.base import BaseConnectionWorker, WorkerState
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.mbox.config import MboxConfig
from backend.app.loggers.mbox.framer import MboxFramer
from backend.app.loggers.mbox.parser import parse_label_frame
from backend.app.loggers.mbox.transform import MboxTransformer
from backend.app.core.query_template import build_query
from backend.app.core.db_writer import BaseDBWriter

# External counter provider:
# (connection_id, device_id) -> total_count or None
CounterTotalProvider = Callable[[int, int], Optional[int]]
# Default SQL template (may be overridden by config.query_template)
_MBOX_QUERY_TEMPLATE = ("INSERT INTO storehouse_view VALUES (DEFAULT, DEFAULT, DEFAULT, {mbox_id}, {on_error}, NULL, "
                        "{created_at}, {fish_name}, {fish_grade}, {lot}, {n_weight}, {r_weight}, {sn}, {error_info}, {tare})")



class MboxConnectionWorker(BaseConnectionWorker):
    """
    Connection worker for MBox devices.

    Responsibilities:
    - manage serial connection lifecycle
    - frame and parse incoming MBox messages
    - apply domain-level transformation logic
    - optionally coordinate with an external counter
    - write resulting records to the database
    """

    _READ_CHUNK_SIZE = 1024
    _RECONNECT_INTERVAL = 2.0

    def __init__(
        self,
        config: LoggerConnectionConfig,
        db_writer: Optional[BaseDBWriter] = None,
        counter_total_provider: Optional[CounterTotalProvider] = None,
    ) -> None:
        super().__init__()

        if config.type != ConnectionType.mbox:
            raise ValueError("MboxConnectionWorker requires connection.type == mbox")

        self._config = config
        self._mbox_cfg: MboxConfig = self._ensure_cfg(config)
        self._db_writer = db_writer
        self._counter_total_provider = counter_total_provider

        self._framer = MboxFramer()
        self._transformer = MboxTransformer(self._mbox_cfg)

        # Serial port state
        self._serial: Optional[Serial] = None
        self._serial_lock = threading.Lock()

        # Worker thread state
        self._thread: Optional[threading.Thread] = None
        self._thread_lock = threading.Lock()
        self._stop_event = threading.Event()

        # External counter coordination state
        self._counter_last_total: Optional[int] = None
        self._pending_pack_ts: Optional[float] = None   # waiting for clean confirmation
        self._miss_deadline_ts: Optional[float] = None  # waiting before inserting miss pack
        self._pending_miss: int = 0
        self._last_good_vars: Optional[dict] = None

        # Extra metrics
        self._init_extra_metrics({
            "frames_total": 0,
            "parse_ok_total": 0,
            "parse_fail_total": 0,
            "serial_open_fail_total": 0,
            "serial_reconnects_total": 0,
            "packs_total": 0,
            "packs_clean_total": 0,
            "packs_miss_total": 0,
            "counter_increments_total": 0,
            "counter_confirm_total": 0,
        })

    # ---------------- config helpers ----------------

    @staticmethod
    def _ensure_cfg(config: LoggerConnectionConfig) -> MboxConfig:
        """
        Ensure that mbox-specific config is present.
        """
        cfg = getattr(config, "mbox", None)
        if cfg is None:
            raise ValueError("mbox config is required")
        return cfg

    @property
    def config(self) -> LoggerConnectionConfig:
        return self._config

    # ---------------- lifecycle ----------------

    def start(self) -> None:
        """
        Start worker thread.
        """
        with self._thread_lock:
            if self.state == WorkerState.RUNNING:
                return
            if self._thread and self._thread.is_alive():
                return

            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._set_state(WorkerState.RUNNING)

            self._metric_inc("runs_total")
            self._metric_set("started_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))

            self._thread.start()

    def stop(self) -> None:
        """
        Signal worker to stop.
        """
        self._set_state(WorkerState.STOPPING)
        self._stop_event.set()

    def join(self, timeout: Optional[float] = None) -> None:
        """
        Wait for worker thread to finish.
        """
        if self._thread:
            self._thread.join(timeout)

    def is_running(self) -> bool:
        return self.state == WorkerState.RUNNING

    def close(self) -> None:
        """
        Release resources.
        """
        self._close_serial()
        if self._db_writer:
            self._db_writer.close()

    # ---------------- serial helpers ----------------

    def _open_serial(self) -> bool:
        """
        Attempt to open serial port.
        Returns True on success.
        """
        p = self._mbox_cfg.port
        try:
            ser = serial.Serial(
                port=p.port,
                baudrate=p.baudrate,
                bytesize={
                    5: serial.FIVEBITS,
                    6: serial.SIXBITS,
                    7: serial.SEVENBITS,
                    8: serial.EIGHTBITS,
                }.get(p.databits, serial.EIGHTBITS),
                parity={
                    "None": serial.PARITY_NONE,
                    "Even": serial.PARITY_EVEN,
                    "Odd": serial.PARITY_ODD,
                    "Mark": serial.PARITY_MARK,
                    "Space": serial.PARITY_SPACE,
                }.get(p.parity, serial.PARITY_NONE),
                stopbits={
                    1.0: serial.STOPBITS_ONE,
                    1.5: serial.STOPBITS_ONE_POINT_FIVE,
                    2.0: serial.STOPBITS_TWO,
                }.get(float(p.stopbits), serial.STOPBITS_ONE),
                timeout=p.timeout,
                rtscts=p.flowcontrol == "RTSCTS",
                xonxoff=p.flowcontrol == "XONXOFF",
            )
        except SerialException as exc:
            self._metric_inc("serial_open_fail_total", extra=True)
            self._set_error(f"open serial error: {exc}")
            return False

        with self._serial_lock:
            self._serial = ser

        self._log_message(f"mbox serial opened on {p.port}")
        return True

    def _close_serial(self) -> None:
        """
        Close serial port if open.
        """
        with self._serial_lock:
            ser = self._serial
            self._serial = None

        if ser:
            try:
                ser.close()
            except Exception:
                pass

    def _read_serial(self) -> bytes:
        """
        Read raw bytes from serial port.
        """
        with self._serial_lock:
            ser = self._serial
        if not ser or not ser.is_open:
            return b""
        try:
            return ser.read(self._READ_CHUNK_SIZE)
        except SerialException as exc:
            self._set_error(f"serial read error: {exc}")
            self._close_serial()
            return b""

    # --------------- counter helpers ---------------

    def _read_counter_total(self) -> Optional[int]:
        """
        Read total count from external counter, if enabled.
        """
        cfg = self._mbox_cfg
        if not getattr(cfg, "ext_counter", False):
            return None
        if self._counter_total_provider is None:
            return None
        counter_conn_id = getattr(cfg, "counter_connection_id", None)
        device_id = getattr(cfg, "counter_device_id", None)
        if counter_conn_id is None or device_id is None:
            return None
        return self._counter_total_provider(int(counter_conn_id), int(device_id))

    def _tick_counter_logic(self, now: float) -> None:
        """
        Process external counter updates.

        - confirms clean packs
        - detects counter-only increments (missed packs)
        """
        total = self._read_counter_total()
        if total is None:
            return

        if self._counter_last_total is None:
            self._counter_last_total = total
            return

        delta = total - self._counter_last_total
        if delta <= 0:
            # без изменений
            return

        self._metric_inc("counter_increments_total", value=delta, extra=True)
        self._counter_last_total = total

        # Clean confirmation
        if self._pending_pack_ts is not None:
            self._pending_pack_ts = None
            self._metric_inc("counter_confirm_total", extra=True)  # если хочешь
            return

        # Counter increment without pack -> schedule miss insert
        self._pending_miss += int(delta)
        miss_timeout = float(getattr(self._mbox_cfg, "counter_miss_timeout", 4.0))
        self._miss_deadline_ts = now + miss_timeout

    def _tick_miss_insert(self, now: float) -> None:
        """
        Check miss-insert deadline and insert synthetic packs if needed.
        """
        if self._miss_deadline_ts is None:
            return
        if now < self._miss_deadline_ts:
            return

        self._miss_deadline_ts = None
        if self._pending_miss <= 0:
            return

        limit = int(getattr(self._mbox_cfg, "miss_insert_limit", 1))
        n = min(self._pending_miss, max(limit, 1))
        self._pending_miss -= n

        for _ in range(n):
            self._insert_miss_pack()

    def _insert_miss_pack(self) -> None:
        """
        Insert a synthetic "missed" pack triggered by external counter.

        Strategy:
        - last: reuse last successful record
        - default: use miss_default config

        Always marks record as on_error=True.
        """
        if not self._config.enabled:
            return
        if not self._db_writer:
            return

        cfg = self._mbox_cfg

        base: Optional[dict] = None
        if cfg.miss_strategy == "last":
            base = self._last_good_vars

        if base is None:
            base = dict(cfg.miss_default or {})

        vars_ = dict(base)
        vars_["mbox_id"] = cfg.mbox_id
        vars_["tare"] = cfg.tare
        vars_["lot"] = cfg.lot
        vars_["on_error"] = True
        vars_["error_info"] = cfg.miss_error_label
        vars_["created_at"] = time.strftime("%Y-%m-%d %H:%M:%S")

        sql, params = build_query(self._config.query_template, vars_)
        self._log_message(f"MBox write to DB: {sql} {params}")

        def do_write():
            self._db_writer.write(sql, params)

        try:
            self._metric_time_block(
                "db_write_latency_ms_last",
                "db_write_latency_ms_avg",
                do_write,
                extra=False,
            )
            self._log_message(f"mbox miss pack inserted ({cfg.miss_strategy})")
            self._metric_set("last_db_write_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self._metric_inc("db_writes_total")
            self._metric_inc("packs_total", extra=True)
            self._metric_inc("packs_miss_total", extra=True)
        except Exception as exc:
            self._metric_set("last_db_error_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self._metric_inc("db_write_fail_total")
            self._set_error(f"db miss write error: {exc}")

    # ---------------- mbox commands ----------------

    _START_COMMAND: bytes = b"\x02CHG#LABEL01.LTG\x03"

    def send_start_command(self) -> None:
        """
        Send start command to MBox device.
        """
        with self._serial_lock:
            ser = self._serial

        if ser is None or not ser.is_open:
            raise RuntimeError("Serial port is not open (worker must be running)")

        try:
            ser.write(self._START_COMMAND)
            ser.flush()
            self._log_message("MBox start_command sent")
        except Exception as exc:
            self._set_error(f"MBox start_command send error: {exc}")
            raise

    # ---------------- main loop ----------------

    def _run_loop(self) -> None:
        """
        Main worker loop.
        """
        try:
            autoconnect = self._mbox_cfg.port.autoconnect
            encoding = self._mbox_cfg.encoding

            while not self._stop_event.is_set():
                now = time.time()
                self._tick_counter_logic(now)
                self._tick_miss_insert(now)

                with self._serial_lock:
                    opened = self._serial is not None and self._serial.is_open

                if not opened:
                    if not self._open_serial():
                        if not autoconnect:
                            break
                        self._metric_inc("serial_reconnects_total", extra=True)
                        if self._stop_event.wait(self._RECONNECT_INTERVAL):
                            break
                        continue

                data = self._read_serial()
                if not data:
                    time.sleep(0.01)
                    continue

                frames = self._framer.feed(data)
                # if frames:
                # print(f"Frames: {frames}")
                for payload in frames:
                    self._metric_inc("frames_total", extra=True)
                    try:
                        rec = parse_label_frame(payload, encoding=encoding)
                        # print(f"Parse: {rec}")
                        self._metric_inc("parse_ok_total", extra=True)
                        result = self._transformer.transform(mbox_id=self._mbox_cfg.mbox_id, rec=rec)
                        # print(f"Transform: {result}")
                        clean_timeout = float(getattr(self._mbox_cfg, "counter_clean_timeout", 6.0))
                        self._pending_pack_ts = time.time() + clean_timeout
                        self._handle_result(result)
                    except Exception as exc:
                        # print("parse/transform error")
                        self._metric_inc("parse_fail_total", extra=True)
                        self._set_error(f"mbox parse/transform error: {exc}")

            self._set_state(WorkerState.STOPPED)

        except Exception as exc:
            self._set_error(str(exc))
            self._set_state(WorkerState.ERROR)
        finally:
            self._metric_set("stopped_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self.close()
            if self.state not in (WorkerState.STOPPED, WorkerState.ERROR):
                self._set_state(WorkerState.STOPPED)

    # ---------------- db write ----------------

    def _handle_result(self, result) -> None:
        """
        Persist a successfully transformed record to the database.
        """
        if not self._config.enabled:
            return
        if not self._config.query_template or not self._db_writer:
            return

        sql, params = build_query(self._config.query_template, result.variables)
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
            self._last_good_vars = dict(result.variables)
            self._metric_set("last_db_write_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self._metric_inc("db_writes_total")
            self._metric_inc("packs_total", extra=True)
            self._metric_inc("packs_clean_total", extra=True)
        except Exception as exc:
            self._metric_set("last_db_error_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self._metric_inc("db_write_fail_total")
            self._set_error(f"db write error: {exc}")
