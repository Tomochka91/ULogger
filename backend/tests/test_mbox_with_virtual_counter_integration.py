# backend/tests/test_mbox_with_virtual_counter_integration.py
"""
Integration test for MboxConnectionWorker with a *virtual* counter provider.

Goal
----
Validate the "clean pack" vs "miss pack" logic when `ext_counter=True`:

1) CLEAN scenario:
   - A label frame arrives from the printer (real serial input).
   - Shortly after, the external counter increments.
   - The worker should treat the pack as "clean" and MUST NOT insert a miss record.

2) MISS scenario:
   - The external counter increments.
   - No label frame arrives within `counter_miss_timeout`.
   - The worker should insert a "miss pack" record (on_error=True).

Environment requirements
------------------------
- Two real serial ports exist and can be opened:
    * /dev/ttyUSB0
    * /dev/ttyUSB1
- They are connected together (loopback cable or virtual serial pair).
- The mapping is:
    * This test opens PRINTER_PORT and writes frames into it.
    * MboxConnectionWorker opens MBOX_PORT and reads those frames.

Notes
-----
- This test uses a FakeDBWriter to capture writes instead of touching a real DB.
- The counter provider is virtual: we manually increment totals to emulate a
  running mbox_counter worker.
- If your project uses a different frame format or parser layout, update:
    * `make_label_line(...)`
    * `wrap_printer_frame(...)`
"""

import time
import threading
from dataclasses import dataclass
from typing import Any, Dict, Optional, List

import pytest
import serial

from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.mbox.worker import MboxConnectionWorker  
from backend.app.loggers.mbox.config import MboxConfig, MboxPortSettings


# -------------------------
# Helpers
# -------------------------

def make_label_line(
    dt_raw: str = "20251024182950298",
    fish: str = "HORSE MACKEREL",
    size: str = "M",
    nweight: float = 30.00,
    rweight: float = 30.46,
    serial_num: str = "251024182950298",
) -> str:
    """
    Build a CSV payload compatible with your current `parse_label_frame(...)`.

    IMPORTANT:
    Your mbox/parser.py expects at least 10 fields and currently uses:
      - parts[0] as datetime (YYYYMMDDhhmmssmmm)
      - weights from parts[9] and parts[10] (note: that implies 11+ columns)
      - fish fields from parts[6], parts[8], serial from parts[7]

    This helper creates >= 13 columns so those indexes exist.

    If your parser mapping changes, adjust this function once.
    """
    cols = [
        dt_raw,             # [0] timestamp raw
        "H1",               # [1] header
        "LABEL01.LTG",      # [2] file
        "1",                # [3] label id
        "4",                # [4] shift id
        "",                 # [5] filler
        fish,               # [6] fish type
        serial_num,         # [7] serial/number
        size,               # [8] fish size/grade
        f"{nweight:.2f}",   # [9] nWeight
        f"{rweight:.2f}",   # [10] rWeight
        "",                 # [11] filler
        "AA",               # [12] checksum-like
    ]
    return ",".join(cols)


def wrap_printer_frame(payload_text: str, encoding: str = "utf-8") -> bytes:
    """
    Wrap payload into the mbox frame format understood by MboxFramer:

      STX '$' PAYLOAD ETX

    In your implementation:
      STX = 0x02
      ETX = 0x03

    If your framer changes, update this wrapper once.
    """
    return b"\x02$" + payload_text.encode(encoding, errors="replace") + b"\x03"


class FakeDBWriter:
    """
    A minimal DB-writer stub.

    The worker calls:
      - write(sql, params)
      - close()

    We record only `params` for assertions.
    """
    def __init__(self):
        self.rows: List[Dict[str, Any]] = []
        self.lock = threading.Lock()

    def write(self, sql: str, params: Dict[str, Any]) -> None:
        with self.lock:
            self.rows.append(dict(params))

    def close(self) -> None:
        pass


class VirtualCounterProvider:
    """
    Virtual counter backend that emulates totals of an external counter worker.

    MboxConnectionWorker expects a callable:
      get_total(counter_conn_id: int, device_id: int) -> Optional[int]

    We keep totals by `device_id` and ignore `counter_conn_id`.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.totals = {
            0x1A78: 0,
            0x1A79: 0,
        }

    def inc(self, device_id: int, delta: int = 1):
        with self.lock:
            self.totals[device_id] = int(self.totals.get(device_id, 0)) + int(delta)

    def get_total(self, counter_conn_id: int, device_id: int) -> Optional[int]:
        with self.lock:
            return self.totals.get(device_id)


def wait_until(predicate, timeout: float = 3.0, step: float = 0.01):
    """
    Spin-wait until predicate() becomes True or timeout is reached.
    """
    t0 = time.time()
    while time.time() - t0 < timeout:
        if predicate():
            return True
        time.sleep(step)
    return False


# -------------------------
# Integration test
# -------------------------

@pytest.mark.integration
def test_mbox_with_virtual_counter_clean_miss_sequence():
    PRINTER_PORT = "/dev/ttyUSB0"
    MBOX_PORT = "/dev/ttyUSB1"
    encoding = "utf-8"

    counter = VirtualCounterProvider()
    db = FakeDBWriter()

    # -------------------------
    # Configure mbox worker
    # -------------------------
    mbox_cfg = MboxConfig(
        port=MboxPortSettings(
            port=MBOX_PORT,
            baudrate=9600,
            databits=8,
            parity="None",
            stopbits=1.0,
            flowcontrol="None",
            autoconnect=True,
            timeout=0.2,
        ),
        encoding=encoding,
        mbox_id=1,
        ext_counter=True,
        counter_connection_id=999,     # a virtual id (ignored by our provider)
        counter_device_id=0x1A78,      # IMPORTANT: bind ONLY to this device_id
        counter_clean_timeout=6.0,
        counter_miss_timeout=4.0,
        miss_strategy="last",
        miss_default={},                # used only if strategy == "default" or no last vars
        miss_error_label="counter miss",
        miss_insert_limit=3,
        tare=0.5,
    )

    conn = LoggerConnectionConfig(
        id=123,
        name="mbox_test",
        type=ConnectionType.mbox,
        enabled=True,
        autostart=True,
        db_user="x",
        db_password="y",
        table_name="dummy",
        query_template="INSERT INTO storehouse_view VALUES (DEFAULT, DEFAULT, DEFAULT, {mbox_id}, {on_error}, NULL, "
                       "{created_at}, {fish_name}, {fish_grade}, {lot}, {n_weight}, {r_weight}, {sn}, {error_info}, {tare})",
        mbox=mbox_cfg,
        easy_serial=None,
        modbus_rtu=None,
        modbus_tcp=None,
        mbox_counter=None,
    )

    # Create worker with injected fake DB and virtual counter provider.
    worker = MboxConnectionWorker(
        config=conn,
        db_writer=db,
        counter_total_provider=counter.get_total,  
    )

    worker.start()
    time.sleep(2.0)     # give worker time to open serial port
    print()
    print("mbox worker started")

    # "Printer" side: write frames into PRINTER_PORT, worker reads from MBOX_PORT.
    printer = serial.Serial(PRINTER_PORT, 9600, timeout=0.2)

    try:
        # ============================================================
        # 1) CLEAN: a label frame arrives, then counter increments soon.
        # ============================================================
        line = make_label_line(dt_raw="20251024182950298", fish="MACKEREL", size="M")
        # 20251024182950298,H1,LABEL01.LTG,1,4,,HORSE MACKEREL,251024182950298,SSS,30.00,30.46,,AA
        line_bytes = wrap_printer_frame(line, encoding=encoding)
        printer.write(line_bytes)
        printer.flush()

        # Wait until the worker inserts the pack (DB write).
        assert wait_until(lambda: len(db.rows) >= 1, timeout=2.0), "mbox did not insert pack"

        # Now emulate counter increment inside the "clean" window.
        time.sleep(2.0)
        counter.inc(0x1A78, 1)

        # Give the worker a short time to tick counter logic.
        time.sleep(0.2)

        # Clean confirmation must NOT create an extra miss insert.
        assert len(db.rows) == 1
        assert db.rows[0].get("on_error") in (False, 0, None)

        # ============================================================
        # 2) MISS: counter increments but no pack arrives.
        #    After counter_miss_timeout, worker should insert miss pack.
        # ============================================================
        counter.inc(0x1A78, 1)

        # Wait miss_timeout + some margin.
        assert wait_until(lambda: len(db.rows) >= 2, timeout=6.0), "miss pack not inserted"
        miss_row = db.rows[1]
        assert bool(miss_row.get("on_error")) is True
        assert miss_row.get("error_info") == "counter miss"

        # ============================================================
        # 3) Longer sequence: 3 clean packs + 2 misses
        # ============================================================

        # Pack #1 (clean)
        printer.write(wrap_printer_frame(make_label_line(dt_raw="20251024182951298"), encoding=encoding))
        printer.flush()
        assert wait_until(lambda: len(db.rows) >= 3, timeout=2.0)
        time.sleep(2.0)
        counter.inc(0x1A78, 1)

        # Miss #2 (no printer frame, counter only)
        time.sleep(8.0)
        counter.inc(0x1A78, 1)
        assert wait_until(lambda: len(db.rows) >= 4, timeout=6.0)
        assert bool(db.rows[3].get("on_error")) is True

        # Pack #3 (clean)
        time.sleep(8.0)
        printer.write(wrap_printer_frame(make_label_line(dt_raw="20251024182953298"), encoding=encoding))
        printer.flush()
        assert wait_until(lambda: len(db.rows) >= 5, timeout=2.0)
        time.sleep(2.0)
        counter.inc(0x1A78, 1)

        # ============================================================
        # Binding test: increments of a *different* counter device_id
        # must not affect the worker (since config binds to 0x1A78 only).
        # ============================================================
        before = len(db.rows)
        counter.inc(0x1A79, 10)
        time.sleep(0.5)
        assert len(db.rows) == before

        # ============================================================
        # Metrics assertions
        # ============================================================
        metrics = worker.get_metrics()
        print(metrics)

        # Total DB writes should match captured rows (packs_total increments on writes).
        assert metrics["extra"]["packs_total"] == len(db.rows)

        # We inserted: 3 clean packs + 2 miss packs in this test.
        assert metrics["extra"]["packs_clean_total"] == 3
        assert metrics["extra"]["packs_miss_total"] == 2

        # Counter increments for bound device:
        # - Clean #1 confirm: +1
        # - Miss #1 trigger:  +1
        # - Clean #2 confirm: +1
        # - Miss #2 trigger:  +1
        # - Clean #3 confirm: +1
        assert metrics["extra"]["counter_increments_total"] == 5

    finally:
        try:
            printer.close()
        except Exception:
            pass
        worker.stop()
        worker.join(timeout=2.0)
        worker.close()
