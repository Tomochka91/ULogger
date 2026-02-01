# app/core/db_client.py
"""
Database client utilities for PostgreSQL.

Responsibilities:
- Build DSN (Data Source Name) from given DB settings
- Create SQLAlchemy Engine from settings
- Test database connection with a simple query
"""

from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from backend.app.schemas.db_settings import DbSettings, DbConnectionTestResult


def build_postgres_dsn(settings: DbSettings) -> str:
    """
    Constructs a PostgreSQL DSN (Data Source Name) based on the provided settings.

    Note: In a production project, you should carefully escape user/password.
    """
    return (
        f"postgresql+psycopg://{settings.user}:{settings.password}"
        f"@{settings.host}:{settings.port}/{settings.database}"
        f"?sslmode={settings.sslmode}"
    )


def create_engine_from_settings(settings: DbSettings) -> Engine:
    """
    Creates a SQLAlchemy Engine from the given DbSettings.
    """
    dsn = build_postgres_dsn(settings)
    return create_engine(dsn, pool_pre_ping=True)


def test_connection(settings: DbSettings) -> DbConnectionTestResult:
    """
    Attempts to connect to the database and execute SELECT 1.

    Returns DbConnectionTestResult with success=True if connection succeeds,
    or success=False with an error message on failure.
    """
    dsn = build_postgres_dsn(settings)
    engine = create_engine(dsn, pool_pre_ping=True)

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return DbConnectionTestResult(success=True)
    except SQLAlchemyError as exc:
        return DbConnectionTestResult(success=False, error=str(exc))
    finally:
        engine.dispose()
