# backend/tests/test_worker_builds_query.py
"""
Unit test for EasySerialConnectionWorker._handle_parsed_message():
- verifies that the worker converts a query_template into a SQLAlchemy-style query
  (replacing {placeholders} with :named_params)
- verifies that the worker passes the correct params dict to the DB writer
- uses a lightweight MockWriter to capture write() calls without touching a real DB
"""

from backend.app.loggers.easy_serial.worker import EasySerialConnectionWorker
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.easy_serial.config import (
    EasySerialConfig,
    EasySerialPortSettings,
    EasySerialParserSettings,
    EasySerialParsedFieldConfig,
)


class MockWriter:
    def __init__(self):
        self.calls = []

    def write(self, sql, params):
        self.calls.append((sql, params))


def test_worker_builds_sql_and_params():
    cfg = LoggerConnectionConfig(
        id=1,
        name="test",
        type=ConnectionType.easy_serial,
        enabled=True,
        db_user="u",
        db_password="p",
        table_name="tbl",
        query_template="INSERT INTO tbl (a,b) VALUES ({x}, {y})",
        easy_serial=EasySerialConfig(
            port=EasySerialPortSettings(port="COM1"),
            parser=EasySerialParserSettings(
                terminator="\\n",
                separator=";",
                fields=[
                    EasySerialParsedFieldConfig(index=0, name="x", type="int"),
                    EasySerialParsedFieldConfig(index=1, name="y", type="float")
                ]
            ),
        ),
    )

    writer = MockWriter()
    worker = EasySerialConnectionWorker(cfg, db_writer=writer)

    parsed = {"x": 123, "y": 4.56}
    worker._handle_parsed_message(parsed)

    assert len(writer.calls) == 1
    sql, params = writer.calls[0]

    assert sql == "INSERT INTO tbl (a,b) VALUES (:x, :y)"
    assert params == {"x": 123, "y": 4.56}
