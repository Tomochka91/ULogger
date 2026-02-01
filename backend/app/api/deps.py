# backend/app/api/deps.py

"""
Dependency providers for FastAPI routes.

Provides cached singleton instances of:
- SettingsManager: for accessing application configuration
- ConnectionRuntimeManager: for managing connection worker lifecycles

These functions are used with FastAPI's `Depends` system to inject
global managers into route handlers.
"""

from functools import lru_cache

from backend.app.config import config
from backend.app.core.settings_manager import SettingsManager
from backend.app.loggers.manager import ConnectionRuntimeManager


@lru_cache()
def get_settings_manager() -> SettingsManager:
    """
    Returns a singleton instance of SettingsManager.
    """
    return SettingsManager(config.SETTINGS_FILE)


@lru_cache()
def get_runtime_manager() -> ConnectionRuntimeManager:
    """
    Global runtime manager.

    On initialization:
      - is created with base database settings;
      - registers all configured connections;
      - automatically starts only those connections
        with autostart = True.
    """
    settings_manager = get_settings_manager()
    base_db_settings = settings_manager.get_db_settings()
    manager = ConnectionRuntimeManager(base_db_settings=base_db_settings)

    # Autostart loggers
    for conn in settings_manager.get_connections():
        # Register all connections so they can be started manually via the API later
        worker = manager.register_connection(conn)
        if conn.autostart:
            manager.start_connection(conn.id)

    return manager
