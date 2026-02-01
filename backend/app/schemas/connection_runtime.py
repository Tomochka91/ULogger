# backend/app/api/schemas/connection_runtime.py
"""
Schemas for runtime status of logger connections.

These models are used by API endpoints that expose the *current runtime state*
of a connection worker managed by ConnectionRuntimeManager.

They reflect:
- configuration-level flags (enabled)
- runtime-level presence (registered)
- worker lifecycle state
- last runtime error, if any
"""

from typing import Optional
from pydantic import BaseModel
from backend.app.loggers.base import WorkerState


class ConnectionRuntimeStatus(BaseModel):
    """
    Runtime status of a single connection worker.

    This model combines static configuration information with
    dynamic runtime state.

    Fields:
    - conn_id:
        Internal connection identifier.

    - name:
        Human-readable connection name.

    - enabled:
        Whether this connection is configured as enabled
        (e.g. allowed to write to DB, participate in runtime).

    - registered:
        Indicates whether a worker instance for this connection
        is currently registered in ConnectionRuntimeManager.

        False usually means:
        - the worker was never started
        - or it was explicitly unregistered / shut down

    - state:
        Current lifecycle state of the worker.
        Possible values come from WorkerState enum:
          CREATED / RUNNING / STOPPING / STOPPED / ERROR

        None means the worker has not been created yet.

    - last_error:
        Last error message reported by the worker, if any.
        Typically includes a timestamp prefix.
    """
    conn_id: int
    name: str
    enabled: bool
    registered: bool = False
    state: Optional[WorkerState] = None
    last_error: Optional[str] = None


class ConnectionRuntimeStatusResponse(BaseModel):
    """
    Standard API response wrapper for runtime status endpoints.

    Used by endpoints such as:
      GET /connections/{id}/runtime
      POST /connections/{id}/start
      POST /connections/{id}/stop

    Fields:
    - success:
        Indicates whether the request was handled successfully.

    - data:
        ConnectionRuntimeStatus payload if success=True,
        otherwise None.

    - error:
        Optional error description if success=False.
    """
    success: bool
    data: Optional[ConnectionRuntimeStatus] = None
    error: Optional[str] = None
