# app/schemas/db_settings.py
"""
Database settings schemas.

This module defines Pydantic models used by the backend API to:
- store global database connection settings,
- validate requests for saving or testing DB connections,
- return unified responses for DB-related endpoints.

These schemas are API-level contracts and are intentionally kept
separate from lower-level DB client / engine implementations.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class DbActionType(str, Enum):
    """
    Type of action requested for database settings.

    - save: persist settings to application configuration
    - test: test connection using provided settings without saving
    """
    save = "save"
    test = "test"


class DbConnectionTestResult(BaseModel):
    """
    Result of a database connection test.
    """
    success: bool
    error: Optional[str] = None


class DbSettings(BaseModel):
    """
    Database connection parameters.

    These settings describe how the backend should connect to
    the main database. Credentials here are considered *global*
    defaults and may be overridden per-connection (per logger).
    """
    host: str = "127.0.0.1"
    port: int = 5432
    database: str = ""
    user: str = ""
    password: str = ""
    sslmode: str = "prefer"


class DbSettingsAction(BaseModel):
    """
    Payload describing an action to be performed on DB settings.
    """
    action: DbActionType
    settings: DbSettings


class DbSettingsResponse(BaseModel):
    """
    Standard response for endpoints returning DB settings.
    """
    success: bool
    data: DbSettings
    error: Optional[str] = None


class DbSettingsActionRequest(BaseModel):
    """
    Request schema for DB settings actions (save/test).
    """
    action: DbActionType
    settings: DbSettings


class DbSettingsActionResponse(BaseModel):
    """
    Response schema for DB settings action endpoints.
    """
    success: bool
    data: DbSettingsAction
    error: Optional[str] = None
