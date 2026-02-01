# backend/tests/test_runtime_manager.py
"""
Unit tests for ConnectionRuntimeManager:
- registering a connection worker (requires config.id)
- starting/stopping a registered worker and verifying state transitions
- using a dummy DB writer factory to avoid real database I/O
"""

import time

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


class DummyWriter(BaseDBWriter):
    def __init__(self):
        self.calls = []

    def write(self, sql, params):
        self.calls.append((sql, params))

    def close(self):
        # no-op
        pass


def _dummy_writer_factory(base_db: DbSettings, cfg: LoggerConnectionConfig) -> BaseDBWriter:
    return DummyWriter()


def make_test_config(conn_id: int = 1) -> LoggerConnectionConfig:
    return LoggerConnectionConfig(
        id=conn_id,
        name="Test Serial Connection",
        type=ConnectionType.easy_serial,
        enabled=True,
        db_user="test_user",
        db_password="test_pass",
        table_name="test_table",
        query_template="INSERT INTO test_table (value) VALUES ({value})",
        easy_serial=EasySerialConfig(
            port=EasySerialPortSettings(
                port="COM_TEST",
                baudrate=9600,
            ),
            parser=EasySerialParserSettings(
                preamble=None,
                terminator="\\n",  # escape string -> byte 0x0A
                separator=";",
                encoding="utf-8",
                fields=[
                    EasySerialParsedFieldConfig(index=0, name="value", type="float")
                ]
            ),
        ),
    )


def test_runtime_manager_start_stop():
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
    config = make_test_config(conn_id=1)

    worker = manager.register_connection(config)
    assert worker is not None
    assert manager.get_state(1) == WorkerState.CREATED

    manager.start_connection(1)
    time.sleep(0.2)
    assert manager.get_state(1) == WorkerState.RUNNING

    manager.start_connection(1)
    time.sleep(0.1)
    assert manager.get_state(1) == WorkerState.RUNNING

    manager.stop_connection(1)
    manager.join_connection(1, timeout=3.0)

    final_state = manager.get_state(1)
    assert final_state == WorkerState.STOPPED


def test_register_requires_id():
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
    config = make_test_config(conn_id=None)

    try:
        manager.register_connection(config)
        assert False, "Expected ValueError for config without id"
    except ValueError:
        pass
