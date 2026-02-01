# backend/tests/test_db_writer_integration.py
"""
Integration test for SQL writing through SQLAlchemyDBWriter.

What this test covers:
- builds a parametrized SQL query using `build_query()` (our `{var}` -> `:var` template compiler),
- executes the query through `SQLAlchemyDBWriter` against a real PostgreSQL instance.

Notes:
- This is a true integration test: it requires network access to the database host and valid
  credentials/permissions for the target DB/table.
- The test currently does not assert on the inserted row. It only verifies that no exception
  is raised during query compilation and execution.
- If you want repeatable CI-friendly behavior, consider either:
  (a) running a temporary Postgres (e.g., via Docker) and asserting inserted rows, or
  (b) marking this test as "manual"/"slow" and skipping by default.
"""

from backend.app.schemas.db_settings import DbSettings
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.easy_serial.config import (
    EasySerialConfig,
    EasySerialPortSettings,
    EasySerialParserSettings,
)
from backend.app.core.query_template import build_query
from backend.app.core.db_writer import SQLAlchemyDBWriter


def make_mock_db_settings() -> DbSettings:
    """
    Returns base DB settings used by the writer.

    The writer will override user/password per logger configuration, but we still
    need a valid host/port/database/sslmode here.
    """
    return DbSettings(
        host="192.168.1.60",
        port=5432,
        database="fishing",
        user="db_user",      # base user is not critical; will be overridden below
        password="123456",
        sslmode="prefer",
    )


def make_mock_logger_config() -> LoggerConnectionConfig:
    """
    Builds a logger config that mimics a typical INSERT into `storehouse_view`.

    The `easy_serial` block is only present to satisfy the schema model in this test;
    it is not used by the DB writer here.
    """
    query_template = (
        "INSERT INTO storehouse_view "
        "(uuid, ship_id, \"timestamp\", mbox_id, on_error, product_id, "
        " created_at, fish_name_en, fish_grade, lot, "
        " n_weight, r_weight, sn, error_info, tare) "
        "VALUES ("
        " DEFAULT, DEFAULT, DEFAULT, {mbox_id}, FALSE, NULL, "
        " NOW()::TIMESTAMP(0), {fish_name_en}, {fish_grade}, {lot}, "
        " {n_weight}, {r_weight}, {sn}, {error_info}, {tare}"
        ")"
    )

    es_config = EasySerialConfig(
        port=EasySerialPortSettings(
            port="COM_TEST",
            baudrate=9600,
        ),
        parser=EasySerialParserSettings(
            terminator="\\n",
            separator=";",
            fields=[]
        ),
    )

    return LoggerConnectionConfig(
        id=1,
        name="storehouse_logger",
        type=ConnectionType.easy_serial,
        enabled=True,
        db_user="db_mbox_2",
        db_password="",
        table_name="storehouse_view",
        query_template=query_template,
        easy_serial=es_config,
    )


def test_db_writer_insert_storehouse_view():
    """
    Integration test:
    - compile SQL from template,
    - execute INSERT into storehouse_view.

    Expected behavior:
    - should not raise exceptions,
    - ideally inserts a row (can be verified manually, or via a follow-up SELECT assertion).
    """
    base_settings = make_mock_db_settings()
    logger_cfg = make_mock_logger_config()

    writer = SQLAlchemyDBWriter(
        base_settings=base_settings,
        db_user=logger_cfg.db_user,
        db_password=logger_cfg.db_password,
    )

    try:
        # Example payload similar to production inserts
        variables = {
            "mbox_id": 2,
            "fish_name_en": "MACKEREL",
            "fish_grade": "M",
            "lot": "",
            "n_weight": 20.00,
            "r_weight": 20.33,
            "sn": "1234",
            "error_info": "",
            "tare": 0.5,
        }

        sql, params = build_query(logger_cfg.query_template, variables)

        # Optional debug prints (useful for manual runs)
        print(sql)
        print(params)

        writer.write(sql, params)

        # If you want a real assertion, you can query back using writer.engine:
        # with writer.engine.connect() as conn:
        #     row = conn.execute(text("SELECT ... WHERE sn=:sn ORDER BY ... LIMIT 1"), {"sn": "1234"}).fetchone()
        #     assert row is not None
    finally:
        writer.close()
