# Copyright (c) 2025
# TTL & SEM Engineering Team
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.


# backend/app/loggers/mbox_counter/worker.py
"""
Runtime worker for MBox counter connections.

This worker is responsible for:
- opening and maintaining a serial connection to the counter bus
- polling configured counter devices in a loop
- parsing device responses and caching latest totals per device_id

Design notes:
- This worker does not write to the database. It acts as a shared runtime service.
  Other workers (e.g., MBox) can query totals via get_total(device_id).
- Frame extraction is handled by MboxCounterFramer (byte-stream to frames).
- Binary validation/decoding is handled by protocol.parse_response_frame().
"""

import threading
import time
from typing import Optional, Dict
from datetime import datetime

import serial
from serial import Serial, SerialException

from backend.app.loggers.base import BaseConnectionWorker, WorkerState
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.mbox_counter.config import MboxCounterConfig, MboxCounterDeviceConfig
from backend.app.loggers.mbox_counter.framer import MboxCounterFramer
from backend.app.loggers.mbox_counter.protocol import build_read_request, parse_response_frame


class MboxCounterConnectionWorker(BaseConnectionWorker):
    """
    Worker for `mbox_counter` connections.

    Responsibilities:
    - Open the serial port
    - Poll enabled devices periodically (device serial is uint16)
    - Cache the latest total_count per internal device_id
    """

    _READ_CHUNK_SIZE = 1024
    _RECONNECT_INTERVAL = 2.0

    def __init__(self, config: LoggerConnectionConfig) -> None:
        super().__init__()
        if config.type != ConnectionType.mbox_counter:
            raise ValueError("MboxCounterConnectionWorker requires connection.type == mbox_counter")

        self._config = config
        self._cfg: MboxCounterConfig = self._ensure_cfg(config)

        self._serial: Optional[Serial] = None
        self._serial_lock = threading.Lock()

        self._thread: Optional[threading.Thread] = None
        self._thread_lock = threading.Lock()
        self._stop_event = threading.Event()

        self._framer = MboxCounterFramer()

        self._totals_lock = threading.Lock()
        self._totals: Dict[int, int] = {}  # device_id -> total_count

        self._init_extra_metrics({
            "requests_total": 0,
            "responses_total": 0,
            "timeouts_total": 0,
            "crc_fail_total": 0,
            "parse_fail_total": 0,
            "serial_open_fail_total": 0,
            "serial_reconnects_total": 0,
            "poll_latency_ms_last": None,
            "poll_latency_ms_avg": None,
        })

    @staticmethod
    def _ensure_cfg(config: LoggerConnectionConfig) -> MboxCounterConfig:
        cfg = getattr(config, "mbox_counter", None)
        if cfg is None:
            raise ValueError("mbox_counter config is required")
        return cfg

    @property
    def config(self) -> LoggerConnectionConfig:
        return self._config

    # -------- public API for other workers --------

    def get_total(self, device_id: int) -> Optional[int]:
        """
        Return the last known total counter value for a device (by internal device_id).

        Note: totals are cached in memory and updated by the polling loop.
        """
        with self._totals_lock:
            return self._totals.get(device_id)

    # -------- lifecycle --------

    def start(self) -> None:
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
        self._set_state(WorkerState.STOPPING)
        self._stop_event.set()

    def join(self, timeout: Optional[float] = None) -> None:
        if self._thread:
            self._thread.join(timeout)

    def is_running(self) -> bool:
        return self.state == WorkerState.RUNNING

    def close(self) -> None:
        self._close_serial()

    # -------- serial helpers --------

    def _open_serial(self) -> bool:
        p = self._cfg.port
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
        self._log_message(f"mbox_counter serial opened on {p.port}")
        return True

    def _close_serial(self) -> None:
        with self._serial_lock:
            ser = self._serial
            self._serial = None
        if ser:
            try:
                ser.close()
            except Exception:
                pass

    def _read_serial(self) -> bytes:
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

    def _write_serial(self, data: bytes) -> None:
        with self._serial_lock:
            ser = self._serial
        if not ser or not ser.is_open:
            raise RuntimeError("serial is not open")
        ser.write(data)
        ser.flush()

    # -------- polling --------

    def _run_loop(self) -> None:
        try:
            autoconnect = self._cfg.port.autoconnect
            poll_interval = self._cfg.poll_interval if self._cfg.poll_interval > 0 else 0.2

            while not self._stop_event.is_set():
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

                # Measure end-to-end time of one poll iteration
                self._metric_time_block(
                    "poll_latency_ms_last",
                    "poll_latency_ms_avg",
                    self._poll_once,
                    extra=True,
                )

                # Sleep until next poll tick (interruptible by stop event)
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

    def _poll_once(self) -> None:
        """
        Poll all enabled devices once.

        Before polling, we read and feed any pending bytes into the framer
        to discard stale/garbage data from previous iterations.
        """
        # Flush/consume any leftover input to avoid mixing old frames with new responses
        data = self._read_serial()
        if data:
            self._framer.feed(data)

        for dev in self._cfg.devices:
            if not dev.enabled:
                continue
            try:
                self._poll_device(dev)
            except Exception as exc:
                self._metric_inc("parse_fail_total", extra=True)
                self._set_error(f"poll device error (id: {dev.device_id}, sn: {dev.serial}): {exc}")

    def _poll_device(self, dev: MboxCounterDeviceConfig) -> None:
        """
        Send a read request to a device and wait for the first valid response frame.

        We accept the first parsed response that matches the requested device serial.
        If no matching response is received before timeout, TimeoutError is raised.
        """
        req = build_read_request(dev.serial)
        self._metric_inc("requests_total", extra=True)
        self._write_serial(req)

        # Wait for frames until port timeout; take the first valid one matching dev.serial
        deadline = time.time() + float(self._cfg.port.timeout or 1.0)
        while time.time() < deadline and not self._stop_event.is_set():
            chunk = self._read_serial()
            if chunk:
                frames = self._framer.feed(chunk)
                for fr in frames:
                    try:
                        parsed = parse_response_frame(fr)
                        if parsed.serial != dev.serial:
                            continue
                        self._metric_inc("responses_total", extra=True)
                        with self._totals_lock:
                            self._totals[dev.device_id] = parsed.total_count
                            self._log_message(f"Total count (id: {dev.device_id}, sn: {dev.serial}): {parsed.total_count}")
                        return
                    except ValueError as ve:
                        # CRC mismatch / malformed frame: ignore and keep searching
                        msg = str(ve)
                        if "crc" in msg:
                            self._metric_inc("crc_fail_total", extra=True)
                        else:
                            self._metric_inc("parse_fail_total", extra=True)
                        # продолжаем искать следующий кадр
                        continue

            time.sleep(0.01)

        self._metric_inc("timeouts_total", extra=True)
        raise TimeoutError("no response frame before timeout")
