# backend/app/schemas/connections.py
"""
Schemas for CRUD operations on logger connections.

These models are used by API endpoints responsible for creating,
updating, and returning connection configurations.

At the moment they directly reuse LoggerConnectionConfig without
adding extra fields, but they are kept as separate schema classes
to allow future API-level extensions without breaking compatibility.
"""

from pydantic import BaseModel
from backend.app.loggers.models import LoggerConnectionConfig


class ConnectionCreateRequest(LoggerConnectionConfig):
    """
    Request schema for creating a new connection.

    This schema is identical to LoggerConnectionConfig and is used
    by endpoints like:

      POST /connections

    A new connection ID is typically assigned server-side during
    creation.
    """
    pass


class ConnectionUpdateRequest(LoggerConnectionConfig):
    """
    Request schema for updating an existing connection.

    Used by endpoints like:

      PUT /connections/{id}

    The connection ID must already exist. All fields follow the same
    validation rules as LoggerConnectionConfig.
    """
    pass


class ConnectionResponse(LoggerConnectionConfig):
    """
    Response schema for returning a connection configuration.

    Used by endpoints that return connection details, such as:

      GET /connections
      GET /connections/{id}

    Currently identical to LoggerConnectionConfig, but separated
    for API clarity and future-proofing.
    """
    pass
