# app/core/settings_manager.py
"""
Application settings manager.

Provides:
- Loading and saving global app settings to JSON
- Access and update for database settings
- Access and management of logger/connection configurations
- Ensures uniqueness of connection names and assigns IDs
"""

import json
from pathlib import Path
from typing import List, Optional
from pydantic import ValidationError

from backend.app.schemas.db_settings import DbSettings
from backend.app.schemas.app_settings import AppSettings
from backend.app.loggers.models import LoggerConnectionConfig


class ConnectionNameAlreadyExistsError(ValueError):
    """Raised if a connection is created/updated with a name that already exists."""
    pass


class SettingsManager:
    def __init__(self, settings_path: str) -> None:
        self._path = Path(settings_path)

    def _ensure_parent_dir(self) -> None:
        if not self._path.parent.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)

    def load_app_settings(self) -> AppSettings:
        """
        Loads all application settings from JSON.
        If file does not exist or is empty — returns default settings.
        """
        if not self._path.exists():
            return AppSettings()

        raw = self._path.read_text(encoding="utf-8")
        if not raw.strip():
            return AppSettings()

        try:
            data = json.loads(raw)
            return AppSettings(**data)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise RuntimeError(f"Invalid settings file format: {exc}") from exc

    def save_app_settings(self, settings: AppSettings) -> None:
        """
        Saves all application settings to JSON.
        """
        self._ensure_parent_dir()
        json_text = settings.model_dump_json(indent=2, ensure_ascii=False)
        self._path.write_text(json_text, encoding="utf-8")

    # --- Database settings methods ---

    def get_db_settings(self) -> DbSettings:
        """
        Returns current database settings.
        If the file does not exist — returns default DbSettings().
        """
        app_settings = self.load_app_settings()
        return app_settings.db

    def save_db_settings(self, db_settings: DbSettings) -> DbSettings:
        """
        Updates only the DB section in JSON.
        """
        app_settings = self.load_app_settings()
        app_settings.db = db_settings
        self.save_app_settings(app_settings)
        return db_settings

    # --- Logger/connection management methods ---

    def get_connections(self) -> List[LoggerConnectionConfig]:
        """
        Returns the current list of loggers/connections.
        """
        app_settings = self.load_app_settings()
        return app_settings.connections

    def get_connection(self, conn_id: int) -> Optional[LoggerConnectionConfig]:
        """
        Returns a logger/connection by ID.
        """
        app_settings = self.load_app_settings()
        for conn in app_settings.connections:
            if conn.id == conn_id:
                return conn
        return None

    def _assign_new_connection_id(self, connections: List[LoggerConnectionConfig]) -> int:
        """
        Generates a new ID for a logger/connection.
        """
        if not connections:
            return 1
        max_id = max((c.id or 0) for c in connections)
        return max_id + 1

    def upsert_connection(self, connection: LoggerConnectionConfig) -> LoggerConnectionConfig:
        """
        Creates or updates a logger/connection.
        If id is None — assigns a new ID.
        Checks uniqueness of the 'name' field before saving.
        """
        app_settings = self.load_app_settings()
        connections = app_settings.connections

        # --- check name uniqueness ---
        for existing in connections:
            # if names match and it's NOT the same object (by id) — forbid
            if existing.name == connection.name and existing.id != connection.id:
                raise ConnectionNameAlreadyExistsError(
                    f"Connection with name '{connection.name}' already exists (id={existing.id})"
                )

        if connection.id is None:
            new_id = self._assign_new_connection_id(connections)
            connection.id = new_id
            connections.append(connection)
        else:
            for idx, existing in enumerate(connections):
                if existing.id == connection.id:
                    connections[idx] = connection
                    break
            else:
                connections.append(connection)

        app_settings.connections = connections
        self.save_app_settings(app_settings)
        return connection

    def delete_connection(self, conn_id: int) -> bool:
        """
        Deletes a logger/connection by ID.
        """
        app_settings = self.load_app_settings()
        connections = app_settings.connections

        new_connections = [c for c in connections if c.id != conn_id]
        deleted = len(new_connections) != len(connections)

        if deleted:
            app_settings.connections = new_connections
            self.save_app_settings(app_settings)

        return deleted

    def save_connections(self, connections: List[LoggerConnectionConfig]) -> List[LoggerConnectionConfig]:
        """
        Saves logger/connection settings to JSON.
        """
        app_settings = self.load_app_settings()
        app_settings.connections = connections
        self.save_app_settings(app_settings)
        return connections
