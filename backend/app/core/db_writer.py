# backend/app/core/db_writer.py
"""
Database writer utilities.

Provides interfaces and implementations to write data to PostgreSQL using SQLAlchemy.

Classes:
- BaseDBWriter: abstract interface for DB writing.
- SQLAlchemyDBWriter: concrete implementation using SQLAlchemy + psycopg.
"""

from typing import Dict, Any

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from backend.app.core.db_client import create_engine_from_settings
from backend.app.schemas.db_settings import DbSettings


class BaseDBWriter:
    """
    Base interface for writing data to a database.
    """

    def write(self, sql: str, params: Dict[str, Any]) -> None:
        raise NotImplementedError

    def close(self) -> None:
        """
        Optional: release resources.
        Implementations can override this method.
        """
        pass


class SQLAlchemyDBWriter(BaseDBWriter):
    """
    Database writer implementation using SQLAlchemy + psycopg.

    - Accepts "base" DbSettings (host, port, database, sslmode)
      and a specific user/password for the logger.
    - Creates a SQLAlchemy Engine and reuses it between write() calls.
    """

    def __init__(
        self,
        base_settings: DbSettings,
        db_user: str,
        db_password: str,
    ) -> None:
        # Merge base settings with user credentials
        merged = DbSettings(
            host=base_settings.host,
            port=base_settings.port,
            database=base_settings.database,
            user=db_user,
            password=db_password,
            sslmode=base_settings.sslmode,
        )
        self._engine: Engine = create_engine_from_settings(merged)

    @property
    def engine(self) -> Engine:
        return self._engine

    def write(self, sql: str, params: Dict[str, Any]) -> None:
        """
        Executes SQL with parameters in a separate transaction.
        """
        try:
            with self._engine.begin() as conn:
                conn.execute(text(sql), params)
        except SQLAlchemyError:
            # Logging can be added here in the future
            raise

    def close(self) -> None:
        """
        Dispose of the SQLAlchemy engine to release resources.
        """
        self._engine.dispose()
