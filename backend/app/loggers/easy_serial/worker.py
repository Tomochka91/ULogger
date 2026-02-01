# Copyright (c) 2025
# TTL & SEM Engineering Team
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.


# backend/app/loggers/easy_serial/worker.py
"""
Easy Serial connection worker.

- Opens a real COM port via pyserial
- Handles optional auto-reconnect (autoconnect=True)
- Reads raw bytes and frames them based on preamble/terminator
- Parses payloads into a dict of variables
- Uses query_template to build SQL and send to DBWriter
"""

import threading
import time
from typing import Optional, Dict, Any
from datetime import datetime

import serial
from serial import Serial, SerialException

from backend.app.loggers.base import BaseConnectionWorker, WorkerState
from backend.app.loggers.models import LoggerConnectionConfig
from backend.app.loggers.easy_serial.config import EasySerialConfig
from backend.app.loggers.easy_serial.framer import EasySerialFramer
from backend.app.loggers.easy_serial.parser import parse_payload_text

from backend.app.core.query_template import build_query
from backend.app.core.db_writer import BaseDBWriter


class EasySerialConnectionWorker(BaseConnectionWorker):
    """
    Worker for a single Easy Serial connection.
    
    Responsibilities:
    1. Open and manage a serial port (with optional autoconnect)
    2. Read bytes and extract frames using preamble/terminator
    3. Parse payloads into typed variables
    4. Build and execute SQL queries via DBWriter
    """

    _READ_CHUNK_SIZE = 1024
    _RECONNECT_INTERVAL = 2.0  # seconds

    def __init__(
        self,
        config: LoggerConnectionConfig,
        db_writer: Optional[BaseDBWriter] = None,
    ) -> None:
        super().__init__()
        self._config = config
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._thread_lock = threading.Lock()

        # validate and store easy_serial-specific config
        self._es_config: EasySerialConfig = self._ensure_es_config(config)

        # initialize framer for payload extraction
        self._framer = EasySerialFramer(
            preamble=self._es_config.parser.preamble,
            terminator=self._es_config.parser.terminator,
        )
        self._db_writer = db_writer

        self._serial: Optional[Serial] = None
        self._serial_lock = threading.Lock()

        # initialize extra metrics for monitoring
        self._init_extra_metrics({
            "bytes_read_total": 0,
            "frames_total": 0,
            "parse_ok_total": 0,
            "parse_fail_total": 0,
            "parse_latency_ms_last": None,
            "parse_latency_ms_avg": None,
            "serial_open_fail_total": 0,
            "serial_reconnects_total": 0,
        })

    # ---------------- Configuration Helpers ----------------

    @staticmethod
    def _ensure_es_config(
        config: LoggerConnectionConfig,
    ) -> EasySerialConfig:
        """
        Ensure that the logger config contains easy_serial settings.
        Raises ValueError if missing.
        """

        es = getattr(config, "easy_serial", None)
        if es is None:
            raise ValueError("EasySerialConnectionWorker requires easy_serial config")
        return es

    @property
    def config(self) -> LoggerConnectionConfig:
        return self._config

    # ---------------- Worker API ----------------

    def start(self) -> None:
        """
        Start the worker thread (idempotent).
        """
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
        """Signal the worker to stop."""
        self._set_state(WorkerState.STOPPING)
        self._stop_event.set()

    def join(self, timeout: Optional[float] = None) -> None:
        """Wait for the worker thread to finish."""
        thread = self._thread
        if thread is not None:
            thread.join(timeout)

    def is_running(self) -> bool:
        """Check if worker is currently running."""
        return self.state == WorkerState.RUNNING

    def close(self) -> None:
        """
        Release resources: serial port and DBWriter.
        """
        self._close_serial()
        if self._db_writer is not None:
            self._db_writer.close()

    # ---------------- Serial Port Management ----------------

    def _open_serial(self) -> bool:
        """
        Try to open the COM port. Returns True on success, False otherwise.
        """
        port_cfg = self._es_config.port

        # map user-friendly settings to pyserial constants
        databits_map = {
            5: serial.FIVEBITS,
            6: serial.SIXBITS,
            7: serial.SEVENBITS,
            8: serial.EIGHTBITS,
        }
        parity_map = {
            "None": serial.PARITY_NONE,
            "Even": serial.PARITY_EVEN,
            "Odd": serial.PARITY_ODD,
            "Mark": serial.PARITY_MARK,
            "Space": serial.PARITY_SPACE,
        }
        stopbits_map = {
            1.0: serial.STOPBITS_ONE,
            1.5: serial.STOPBITS_ONE_POINT_FIVE,
            2.0: serial.STOPBITS_TWO,
        }

        databits = databits_map.get(port_cfg.databits, serial.EIGHTBITS)
        parity = parity_map.get(port_cfg.parity, serial.PARITY_NONE)
        stopbits = stopbits_map.get(float(port_cfg.stopbits), serial.STOPBITS_ONE)

        rtscts = port_cfg.flowcontrol == "RTSCTS"
        xonxoff = port_cfg.flowcontrol == "XONXOFF"

        try:
            ser = serial.Serial(
                port=port_cfg.port,
                baudrate=port_cfg.baudrate,
                bytesize=databits,
                parity=parity,
                stopbits=stopbits,
                timeout=port_cfg.timeout,
                rtscts=rtscts,
                xonxoff=xonxoff,
            )
        except SerialException as exc:
            msg = f"open error: {exc}"
            self._set_error(msg)
            return False

        with self._serial_lock:
            self._serial = ser

        self._log_message(
            f"opened serial port {port_cfg.port} "
            f"({port_cfg.baudrate} {port_cfg.databits}{port_cfg.parity[0]}{port_cfg.stopbits})"
        )
        return True

    def _close_serial(self) -> None:
        """Close the serial port safely."""
        with self._serial_lock:
            ser = self._serial
            self._serial = None

        if ser is not None:
            try:
                if ser.is_open:
                    ser.close()
            except Exception:
                pass

    def _read_from_serial(self) -> bytes:
        """Read a chunk of bytes from the serial port."""
        with self._serial_lock:
            ser = self._serial
        if ser is None or not ser.is_open:
            return b""
        try:
            data = ser.read(self._READ_CHUNK_SIZE)
            if data:
                self._metric_inc("bytes_read_total", len(data), extra=True)
            return data
        except SerialException as exc:
            msg = f"read error: {exc}"
            self._set_error(msg)
            self._close_serial()
            return b""

    # ---------------- Main Loop ----------------

    def _run_loop(self) -> None:
        """Main worker loop: connect, read, parse, write to DB."""
        try:
            encoding = self._es_config.parser.encoding
            autoconnect = self._es_config.port.autoconnect

            while not self._stop_event.is_set():
                # check if serial port is open
                with self._serial_lock:
                    ser_open = self._serial is not None and self._serial.is_open

                if not ser_open:
                    # try opening the port
                    opened = self._open_serial()
                    if not opened:
                        if not autoconnect:
                            # no auto-reconnect — mark error and exit
                            self._set_error("failed to open port")
                            self._set_state(WorkerState.ERROR)
                            break
                        # auto-reconnect — wait and retry
                        self._set_error("failed to open port, will retry...")
                        time.sleep(self._RECONNECT_INTERVAL)
                        continue

                # read bytes
                data = self._read_from_serial()
                if data:
                    frames = self._framer.feed(data)
                    self._metric_inc("frames_total", len(frames), extra=True)
                    for payload in frames:
                        try:
                            text = payload.decode(encoding, errors="replace")
                            self._log_message(text)

                            # parse payload and update metrics
                            def do_parse():
                                return parse_payload_text(text, self._es_config.parser)

                            parsed = self._metric_time_block(
                                "parse_latency_ms_last",
                                "parse_latency_ms_avg",
                                do_parse,
                                extra=True,
                            )

                            self._metric_inc("parse_ok_total", extra=True)
                            self._handle_parsed_message(parsed)
                        except Exception as parse_exc:
                            self._set_error(f"parse error: {parse_exc}")
                            self._metric_inc("parse_fail_total", extra=True)
                else:
                    # no data — sleep briefly to avoid busy loop
                    time.sleep(0.01)

            # normal stop
            self._set_state(WorkerState.STOPPED)
        except Exception as exc:
            self._set_error(str(exc))
            self._set_state(WorkerState.ERROR)
        finally:
            self._metric_set("stopped_at", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))
            self._close_serial()
            if self.state not in (WorkerState.STOPPED, WorkerState.ERROR):
                self._set_state(WorkerState.STOPPED)

    # ---------------- Parsed Message Handling ----------------

    def _handle_parsed_message(self, parsed: Dict[str, Any]) -> None:
        """
        Process a parsed payload:
        - log it
        - optionally build SQL and write to DB
        """
        if not self._config.enabled:
            self._log_message(f"EasySerial payload: {parsed}")
            return

        if not self._config.query_template or self._db_writer is None:
            # no DB write configured, can log or count dropped messages
            return

        sql, params = build_query(self._config.query_template, parsed)
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
