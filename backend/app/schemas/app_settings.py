# app/schemas/app_settings.py
"""
Application-wide settings schema.

This module defines the top-level configuration model for the backend application.
It aggregates global settings that are typically loaded once at startup and then
shared across the entire system.

Responsibilities of AppSettings:
- Hold database configuration (connection, credentials, pool settings, etc.).
- Hold the list of configured logger connections (serial, Modbus, mbox, etc.).
- Act as a single entry point for application configuration parsing and validation.

The model is based on Pydantic, so it provides:
- Type validation
- Default values
- Easy loading from dict / JSON / YAML / env-backed sources (depending on how it is used).
"""

from pydantic import BaseModel, Field
from typing import List
from backend.app.schemas.db_settings import DbSettings
from backend.app.loggers.models import LoggerConnectionConfig


class AppSettings(BaseModel):
    """
    Global application settings.

    Fields:
    - db:
        Database configuration shared by all components of the application
        (writers, migrations, health checks, etc.).

    - connections:
        A list of configured logger connections. Each entry describes one logical
        connection (easy_serial, mbox, mbox_counter, modbus_rtu, modbus_tcp, etc.)
        and is interpreted by the corresponding ConnectionWorker.

    Typical usage:
    - Loaded once during application startup.
    - Passed to components responsible for initializing workers and services.
    - Serves as a canonical source of truth for runtime configuration.
    """
    db: DbSettings = DbSettings()
    connections: List[LoggerConnectionConfig] = Field(default_factory=list)
