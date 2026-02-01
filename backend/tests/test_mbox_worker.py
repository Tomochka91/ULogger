# backend/tests/test_mbox_worker.py
"""
Unit test for MboxConnectionWorker (pure Python, no real serial ports).

What this test verifies
-----------------------
- The worker reads a framed payload from the serial stream (STX '$' ... ETX).
- The payload is parsed by `parse_label_frame(...)`.
- The record is transformed by `MboxTransformer(...)` (tare adjustment, error flags).
- The resulting variables are passed through `build_query(...)`.
- The worker calls DBWriter.write(sql, params) with expected params.

Implementation notes
--------------------
- We monkeypatch `serial.Serial` inside `backend.app.loggers.mbox.worker` to a FakeSerial.
- FakeSerial reads bytes from a shared `inbox` buffer.
- We use a FakeDBWriter to capture calls.

IMPORTANT: This test aligns with your CURRENT mbox/parser.py and mbox/transform.py as pasted.
If you later change field mapping or variable names, update this test accordingly.
"""

import time
from typing import Any, Dict, List, Tuple, Optional

import pytest

from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.mbox.config import MboxConfig
from backend.app.loggers.mbox.worker import MboxConnectionWorker
from backend.app.core.db_writer import BaseDBWriter


STX = 0x02
ETX = 0x03


def make_frame(payload_ascii: str) -> bytes:
    """
    Wrap an ASCII payload into the mbox frame format:
      STX '$' PAYLOAD ETX
    """
    payload = payload_ascii.encode("ascii")
    return bytes([STX]) + b"$" + payload + bytes([ETX])


class FakeSerial:
    """
    Minimal fake for pyserial.Serial.

    The worker reads from this object via .read(size).
    We feed the worker by pre-filling an "inbox" bytearray.
    """
    def __init__(self, *args, **kwargs) -> None:
        self.is_open = True
        self._buf = bytearray()
        self._closed = False
        self._timeout = kwargs.get("timeout", 1.0)

        inbox: Optional[bytearray] = kwargs.get("_inbox")
        if inbox is not None:
            self._buf = inbox

    def read(self, size: int) -> bytes:
        if self._closed or not self.is_open:
            return b""

        if not self._buf:
            # emulate "no data" (timeout-ish behavior)
            time.sleep(0.01)
            return b""

        chunk = self._buf[:size]
        del self._buf[:size]
        return bytes(chunk)

    def close(self) -> None:
        self._closed = True
        self.is_open = False


class FakeDBWriter(BaseDBWriter):
    """
    Capture DB writes performed by the worker.
    """
    def __init__(self) -> None:
        self.calls: List[Tuple[str, Dict[str, Any]]] = []

    def write(self, sql: str, params: Dict[str, Any]) -> None:
        self.calls.append((sql, dict(params)))


def wait_until(predicate, timeout: float = 1.5, step: float = 0.01) -> bool:
    """
    Spin-wait helper to make thread-based tests deterministic.
    """
    t0 = time.time()
    while time.time() - t0 < timeout:
        if predicate():
            return True
        time.sleep(step)
    return False


def test_mbox_worker_pipeline_writes_to_db(monkeypatch):
    # ---------------------------------------------------------------------
    # 1) Build one payload that matches your CURRENT parse_label_frame()
    # ---------------------------------------------------------------------
    #
    # Your current mbox/parser.py expects:
    #   - parts[0] datetime in format "%Y%m%d%H%M%S%f"
    #   - fish type at parts[6]
    #   - serial number at parts[7]
    #   - size/grade at parts[8]
    #   - nWeight at parts[9]
    #   - rWeight at parts[10]
    #
    # So we generate >= 11 fields with those indexes populated.
    payload = "20240101123015999,MACKEREL,M,,0,0,0,12.5,13.1,SN123,0,0,0"
    frame = make_frame(payload)

    # Shared buffer that FakeSerial.read() consumes from.
    inbox = bytearray(frame)

    # ---------------------------------------------------------------------
    # 2) Monkeypatch serial.Serial used inside worker module
    # ---------------------------------------------------------------------
    import backend.app.loggers.mbox.worker as worker_module

    def fake_serial_factory(*args, **kwargs):
        # пробрасываем inbox в FakeSerial, чтобы он "прочитал" наш кадр
        kwargs["_inbox"] = inbox
        return FakeSerial(*args, **kwargs)

    monkeypatch.setattr(worker_module.serial, "Serial", fake_serial_factory)

    # ---------------------------------------------------------------------
    # 3) Create worker config
    # ---------------------------------------------------------------------
    #
    # NOTE: Your current MboxTransformer.variables does NOT include "adj_r_weight".
    # It includes: r_weight (already tare-adjusted), n_weight, fish_name, etc.
    #
    # Therefore the query_template must use {r_weight}, not {adj_r_weight}.
    cfg = LoggerConnectionConfig(
        id=1,
        name="mbox_test",
        type=ConnectionType.mbox,
        enabled=True,
        autostart=False,
        query_template="INSERT INTO t (sn, adj) VALUES ({sn}, {adj_r_weight})",
        mbox=MboxConfig(
            port={
                "port": "FAKE",
                "baudrate": 9600,
                "databits": 8,
                "parity": "None",
                "stopbits": 1.0,
                "flowcontrol": "None",
                "autoconnect": False,
                "timeout": 0.1,
            },
            tare=0.5,
            treat_zero_as_error=True,
            treat_duplicate_as_error=True,
            error_label_zero="no weight",
            error_label_duplicate="no weight",
            encoding="ascii",
        ),
    )

    dbw = FakeDBWriter()
    w = MboxConnectionWorker(cfg, db_writer=dbw)

    # ---------------------------------------------------------------------
    # 4) Run worker and wait for one DB write
    # ---------------------------------------------------------------------
    w.start()

    # ждём пока worker прочитает и запишет
    ok = wait_until(lambda: len(dbw.calls) >= 1, timeout=2.0)
    assert ok, "Worker did not write to DB in time"

    sql, params = dbw.calls[0]

    # build_query should turn placeholders into SQLAlchemy-style named params
    assert ":sn" in sql
    assert ":adj_r_weight" in sql

    # Verify parameters
    assert params["sn"] == "SN123"
    # r_weight is tare-adjusted: 13.1 - 0.5 = 12.6
    assert abs(float(params["adj_r_weight"]) - 12.6) < 1e-6

    # ---------------------------------------------------------------------
    # 5) Stop worker cleanly
    # ---------------------------------------------------------------------
    w.stop()
    w.join(timeout=1.0)
    assert w.state in ("stopped", "error")
