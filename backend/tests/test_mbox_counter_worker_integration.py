# backend/tests/test_mbox_counter_worker_integration.py
"""
Integration test for MboxCounterConnectionWorker using two real serial ports.

Scenario
--------
- The worker runs on /dev/ttyUSB0 and polls a counter device (serial uint16).
- A lightweight emulator runs on /dev/ttyUSB1:
    * reads fixed-size request frames (9 bytes)
    * validates the request bytes (must exactly match build_read_request(serial))
    * responds with a valid protocol response frame and increments total_count

Requirements
------------
- /dev/ttyUSB0 and /dev/ttyUSB1 exist and can be opened.
- The ports are physically/virtually connected (USB loopback cable or virtual pair).

Notes
-----
- Marked as `pytest.mark.integration` to avoid running on CI by default.
- If ports are unavailable, the test is skipped.
"""

import time
import threading
from typing import Optional

import pytest
import serial

from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.mbox_counter.config import (
    MboxCounterConfig,
    MboxCounterPortSettings,
    MboxCounterDeviceConfig,
)
from backend.app.loggers.mbox_counter.worker import MboxCounterConnectionWorker
from backend.app.loggers.mbox_counter.protocol import (
    build_read_request,
    crc8_e5,
    PREAMBLE,
    C_READ_RESP,
)

pytestmark = pytest.mark.integration


def _build_response(serial_u16: int, total_count: int, size_dir: int = 1, flags: int = 0x00) -> bytes:
    """
    Build a valid counter response frame.

    Frame layout:
      27 L C A(2) hdr_crc DATA(7) data_crc

    DATA layout (7 bytes):
      total_count (u32 LE) + size_dir (u16 LE) + flags (u8)

    Where:
      L = 3 + len(DATA) = 10 (0x0A)
      C = C_READ_RESP (0x08)
      A = serial uint16 little-endian
      hdr_crc = CRC8 over [L, C, A1, A2]
      data_crc = CRC8 over DATA
    """
    a = serial_u16.to_bytes(2, "little")
    data = (
        int(total_count).to_bytes(4, "little", signed=False)
        + int(size_dir).to_bytes(2, "little", signed=False)
        + bytes([flags & 0xFF])
    )
    L = 3 + len(data)  # 10 for a 7-byte DATA section
    header = bytes([L, C_READ_RESP]) + a
    hdr_crc = bytes([crc8_e5(header)])
    data_crc = bytes([crc8_e5(data)])
    return bytes([PREAMBLE]) + header + hdr_crc + data + data_crc


class CounterEmulator:
    """
    Minimal counter emulator.

    Runs on a real serial port and implements:
    - read request frames (fixed 9 bytes)
    - if the request matches the expected bytes (same serial), send a response frame
    - increment total_count on each valid request
    """
    def __init__(self, port: str, baudrate: int, timeout: float, serial_u16: int) -> None:
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial_u16 = serial_u16

        self._ser: Optional[serial.Serial] = None
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

        self.total = 100  # arbitrary starting value
        self.requests_seen = 0

    def start(self) -> None:
        self._ser = serial.Serial(
            port=self.port,
            baudrate=self.baudrate,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=self.timeout,
        )
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=1.0)
        if self._ser:
            try:
                self._ser.close()
            except Exception:
                pass
            self._ser = None

    def _run(self) -> None:
        assert self._ser is not None
        buf = bytearray()

        # Request is fixed-size (9 bytes) and deterministic for a given serial.
        expected_req = build_read_request(self.serial_u16)  # 9 bytes

        while not self._stop.is_set():
            chunk = self._ser.read(64)
            if chunk:
                buf.extend(chunk)

            # Request layout is exactly 9 bytes:
            #   27 05 43 A1 A2 hdr_crc 01 00 data_crc
            while len(buf) >= 9:
                # Find preamble (0x27) to resync on noise.
                try:
                    stx = buf.index(0x27)
                except ValueError:
                    buf.clear()
                    break
                if stx > 0:
                    del buf[:stx]

                if len(buf) < 9:
                    break

                req = bytes(buf[:9])
                del buf[:9]

                if req != expected_req:
                    # Wrong serial or garbage - ignore

                    continue

                self.requests_seen += 1

                # Respond and increment total_count on every valid request.
                self.total += 1
                resp = _build_response(self.serial_u16, self.total, size_dir=1, flags=0x05)
                self._ser.write(resp)
                self._ser.flush()

            time.sleep(0.002)


@pytest.mark.integration
def test_mbox_counter_worker_real_ports_usb0_usb1():
    """
    End-to-end integration test using /dev/ttyUSB0 and /dev/ttyUSB1.

    - Starts emulator on USB1
    - Starts worker on USB0
    - Waits until worker reads at least a couple of updated totals
    """
    worker_port = "/dev/ttyUSB0"
    emulator_port = "/dev/ttyUSB1"

    # If ports cannot be opened, skip in non-hardware environments.
    try:
        _ = serial.Serial(port=worker_port, timeout=0.1)
        _.close()
        _ = serial.Serial(port=emulator_port, timeout=0.1)
        _.close()
    except Exception as exc:
        pytest.skip(f"Serial ports not available for integration test: {exc}")

    serial_u16 = 0x1A78  # must match in both worker config and emulator

    # Start emulator on USB1.
    emu = CounterEmulator(
        port=emulator_port,
        baudrate=9600,
        timeout=0.2,
        serial_u16=serial_u16,
    )
    emu.start()

    # Configure worker on USB0.
    cfg = LoggerConnectionConfig(
        id=999,
        name="mbox_counter_it",
        type=ConnectionType.mbox_counter,
        enabled=False,    # mbox_counter does not write to DB; still keep the common fields consistent
        autostart=False,
        db_user=None,
        db_password=None,
        table_name=None,
        query_template=None,
        easy_serial=None,
        mbox=None,
        mbox_counter=MboxCounterConfig(
            port=MboxCounterPortSettings(
                port=worker_port,
                baudrate=9600,
                databits=8,
                parity="None",
                stopbits=1.0,
                flowcontrol="None",
                autoconnect=False,  # fail fast instead of reconnecting in this test
                timeout=0.2,
            ),
            poll_interval=0.1,
            devices=[
                MboxCounterDeviceConfig(
                    device_id=1,
                    name="counter_1",
                    serial=serial_u16,
                    enabled=True,
                )
            ],
        ),
        modbus_rtu=None,
        modbus_tcp=None,
    )

    w = MboxCounterConnectionWorker(cfg)

    try:
        w.start()

        # Wait until the worker performs polling and updates total_count.
        deadline = time.time() + 3.0
        last = None
        while time.time() < deadline:
            last = w.get_total(1)
            
            # Emulator starts at 100 and increments on each valid request.
            # So 101+ means at least one response was parsed and applied.
            if last is not None and last >= 102:
                break
            time.sleep(0.05)

        assert emu.requests_seen >= 1, "emulator did not see any valid requests"
        assert last is not None, "worker did not update total for device_id=1"
        assert last >= 101, f"unexpected total: {last}"

    finally:
        w.stop()
        w.join(timeout=1.0)
        w.close()
        emu.stop()
