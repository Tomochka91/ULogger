# backend/tests/test_easy_serial_usb_loop.py
"""
Integration test for EasySerialConnectionWorker using a real serial "loop" (two ports).

This test is intentionally hardware-dependent and will be skipped unless:
- both USB0 and USB1 device nodes exist (e.g. /dev/ttyUSB0 and /dev/ttyUSB1)
- the two ports are physically/virtually connected so that data written to USB1
  can be read from USB0 (null-modem cable or a virtual serial pair)

What the test verifies:
- The runtime manager can register and start an EasySerial worker
- The worker can open the serial port, read newline-terminated messages,
  parse them via EasySerialParserSettings, and invoke the configured DB writer
- We use a DummyWriter to capture DB write calls instead of writing to a real DB

Notes:
- This test uses a "friend access" approach to grab `worker._db_writer` so we can
  inspect captured writes. If you prefer, you can refactor the worker/manager to
  expose the writer in a cleaner way for tests.
"""

import os
import time

import pytest
import serial

from backend.app.loggers.manager import ConnectionRuntimeManager
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.easy_serial.config import (
    EasySerialConfig,
    EasySerialPortSettings,
    EasySerialParserSettings,
    EasySerialParsedFieldConfig
)
from backend.app.loggers.base import WorkerState
from backend.app.schemas.db_settings import DbSettings
from backend.app.core.db_writer import BaseDBWriter


USB0 = "/dev/ttyUSB0"
USB1 = "/dev/ttyUSB1"


class DummyWriter(BaseDBWriter):
    """A minimal DB writer used for integration tests (captures calls in memory)."""
    def __init__(self):
        self.calls = []

    def write(self, sql, params):
        # Keep calls for assertions
        self.calls.append((sql, params))

    def close(self):
        pass


def _dummy_writer_factory(base_db: DbSettings, cfg: LoggerConnectionConfig) -> BaseDBWriter:
    """Factory injected into ConnectionRuntimeManager so workers use DummyWriter."""
    return DummyWriter()


def test_easy_serial_worker_usb_loop():
    """
    Hardware integration test with two real ports:

    - EasySerialConnectionWorker listens on USB0 (/dev/ttyUSB0)
    - The test opens USB1 (/dev/ttyUSB1) and writes data there

    Requirements:
    - USB0 and USB1 exist
    - USB0 and USB1 are connected together (cable or virtual pair)
    """
    # Skip if ports are not present on this machine
    if not (os.path.exists(USB0) and os.path.exists(USB1)):
        pytest.skip(f"{USB0} or {USB1} not found")

    base_db = DbSettings(
        host="localhost",
        port=5432,
        database="testdb",
        user="x",
        password="y",
        sslmode="prefer",
    )

    manager = ConnectionRuntimeManager(
        base_db_settings=base_db,
        db_writer_factory=_dummy_writer_factory,
    )

    # Logger config:
    # - reads from USB0
    # - terminator is "\\n" (escaped string; decoded by the framer to 0x0A)
    # - separator is ';'
    # - one field: "value" from split index 0
    cfg = LoggerConnectionConfig(
        id=200,
        name="USBLoopTest",
        type=ConnectionType.easy_serial,
        enabled=True,
        db_user="test_user",
        db_password="test_pass",
        table_name="test_table",
        query_template="INSERT INTO test_table (value) VALUES ({value})",
        easy_serial=EasySerialConfig(
            port=EasySerialPortSettings(
                port=USB0,
                baudrate=9600,
                databits=8,
                parity="None",
                stopbits=1.0,
                flowcontrol="None",
                autoconnect=True,
                timeout=0.5,
            ),
            parser=EasySerialParserSettings(
                preamble=None,
                terminator="\\n",   # escape string -> byte 0x0A
                separator=";",
                encoding="utf-8",
                fields=[
                    EasySerialParsedFieldConfig(index=0, name="value", type="string")
                ]
            ),
        ),
    )

    worker = manager.register_connection(cfg)
    assert worker is not None
    assert manager.get_state(200) == WorkerState.CREATED

    # Inspect the DummyWriter instance used by the worker (friend access).
    from backend.app.loggers.easy_serial.worker import EasySerialConnectionWorker

    assert isinstance(worker, EasySerialConnectionWorker)
    # предполагаем, что атрибут _db_writer есть
    db_writer = worker._db_writer  # type: ignore[attr-defined]
    assert isinstance(db_writer, DummyWriter)

    manager.start_connection(200)

    # Give worker time to open port and enter the run loop
    time.sleep(1.0)
    assert manager.get_state(200) == WorkerState.RUNNING

    # Open paired port and send messages
    ser_out = None
    try:
        ser_out = serial.Serial(
            port=USB1,
            baudrate=9600,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=1.0,
        )

        messages = [b"123\n", b"456\n"]
        for msg in messages:
            ser_out.write(msg)
            ser_out.flush()
            time.sleep(0.1)

        # Allow time for the worker to read, parse, and call DummyWriter.write()
        time.sleep(1.0)

        calls = db_writer.calls
        assert len(calls) >= 2

        # Extract only the "value" param from the first two calls
        values = [params["value"] for (_, params) in calls[:2]]
        # With type="string", parser keeps values as strings (e.g. "123", "456")
        assert "123" in values
        assert "456" in values

    finally:
        if ser_out is not None:
            try:
                ser_out.close()
            except Exception:
                pass

        manager.stop_connection(200)
        manager.join_connection(200, timeout=2.0)
        manager.shutdown_all(timeout=1.0)
