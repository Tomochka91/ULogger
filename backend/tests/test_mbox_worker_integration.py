# backend/tests/test_mbox_worker_integration.py
"""
Integration test for MboxConnectionWorker using real serial ports.

Requirements
------------
- Two real connected serial ports exist (e.g. via a null-modem cable or virtual pair):
    reader: /dev/ttyUSB0  (used by the worker)
    writer: /dev/ttyUSB1  (used by the test to send frames)
- The ports must be wired so that data written to writer_port is readable from reader_port.

What we validate
----------------
- Worker reads a framed message: STX + '$' + payload + ETX
- Worker parses payload using current parse_label_frame() mapping:
    parts[0]  = datetime "%Y%m%d%H%M%S%f"
    parts[6]  = fish type
    parts[7]  = serial number (sn)
    parts[8]  = size/grade
    parts[9]  = nWeight
    parts[10] = rWeight
- Worker transforms values (tare adjustment) and writes to DB writer.
- We check that params contain expected values:
    sn == "SN123"
    r_weight == 13.1 - 0.5 == 12.6

"""

import time
from typing import Any, Dict, List, Tuple

import pytest
import serial

from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.mbox.config import MboxConfig
from backend.app.loggers.mbox.worker import MboxConnectionWorker
from backend.app.core.db_writer import BaseDBWriter


STX = 0x02
ETX = 0x03


def make_frame(payload_ascii: str) -> bytes:
    """Wrap ASCII payload into the mbox frame: STX '$' PAYLOAD ETX."""
    return bytes([STX]) + b"$" + payload_ascii.encode("ascii") + bytes([ETX])


class FakeDBWriter(BaseDBWriter):
    """Capture DBWriter.write() calls instead of writing to a real database."""
    def __init__(self) -> None:
        self.calls: List[Tuple[str, Dict[str, Any]]] = []

    def write(self, sql: str, params: Dict[str, Any]) -> None:
        self.calls.append((sql, dict(params)))


def wait_until(predicate, timeout: float = 3.0, step: float = 0.05) -> bool:
    """Spin-wait helper for thread-based integration tests."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        if predicate():
            return True
        time.sleep(step)
    return False


@pytest.mark.integration
def test_mbox_worker_real_ports():
    """
    Requires real connected ports:
      worker reads from: /dev/ttyUSB0
      test writes to:    /dev/ttyUSB1
    """

    reader_port = "/dev/ttyUSB0"
    writer_port = "/dev/ttyUSB1"

    # --- DB writer ---
    dbw = FakeDBWriter()

    # --- worker config ---
    cfg = LoggerConnectionConfig(
        id=100,
        name="mbox_integration",
        type=ConnectionType.mbox,
        enabled=True,
        autostart=False,
        query_template="INSERT INTO test (sn, adj) VALUES ({sn}, {adj_r_weight})",
        mbox=MboxConfig(
            port={
                "port": reader_port,
                "baudrate": 9600,
                "databits": 8,
                "parity": "None",
                "stopbits": 1.0,
                "flowcontrol": "None",
                "autoconnect": True,
                "timeout": 0.2,
            },
            tare=0.5,
            treat_zero_as_error=True,
            treat_duplicate_as_error=True,
            error_label_zero="no weight",
            error_label_duplicate="no weight",
            encoding="ascii",
        ),
    )

    worker = MboxConnectionWorker(cfg, db_writer=dbw)
    worker.start()

    # --- open writer port and send one frame ---
    writer = serial.Serial(
        port=writer_port,
        baudrate=9600,
        bytesize=8,
        parity="N",
        stopbits=1,
        timeout=1.0,
    )

    payload = (
        "20240101123015999,"
        "MACKEREL,"
        "M,"
        ","
        "0,0,0,"
        "12.5,"
        "13.1,"
        "SN123,"
        "0,0,0"
    )

    frame = make_frame(payload)
    writer.write(frame)
    writer.flush()

    # --- wait for DB write ---
    ok = wait_until(lambda: len(dbw.calls) >= 1, timeout=5.0)
    assert ok, "mbox worker did not write to DB"

    sql, params = dbw.calls[0]

    assert ":sn" in sql
    assert ":adj_r_weight" in sql

    assert params["sn"] == "SN123"
    # tare-adjusted: 13.1 - 0.5 = 12.6
    assert abs(float(params["adj_r_weight"]) - 12.6) < 1e-6

    # --- cleanup ---
    worker.stop()
    worker.join(timeout=2.0)
    writer.close()

    assert worker.state in ("stopped", "error")
