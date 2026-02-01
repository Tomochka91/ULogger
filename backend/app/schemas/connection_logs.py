# backend/app/schemas/connection_logs.py
"""
Schemas for connection logs and metrics API responses.

This module defines Pydantic models used by the API layer to expose:
- Recent log messages and errors for a specific connection
- Runtime metrics collected by connection workers

These schemas are *read-only* from the API perspective and are typically
constructed from in-memory worker state (buffers + metrics dicts).
"""

from typing import List, Dict, Optional
from pydantic import BaseModel


class ConnectionLogs(BaseModel):
    """
    Log snapshot for a single connection.

    Represents the current state of in-memory log buffers
    maintained by a BaseConnectionWorker.

    Fields:
    - conn_id:
        Internal connection identifier.

    - name:
        Human-readable connection name.

    - registered:
        Indicates whether the connection is currently registered
        in the ConnectionRuntimeManager.

    - messages:
        List of recent informational log messages (with timestamps).

    - errors:
        List of recent error messages (with timestamps).
    """
    conn_id: int
    name: str
    registered: bool

    messages: List[str]
    errors: List[str]


class ConnectionLogsResponse(BaseModel):
    """
    Standard API response wrapper for connection logs.

    Used by endpoints like:
      GET /connections/{id}/logs

    Fields:
    - success:
        Indicates whether the request was processed successfully.

    - data:
        ConnectionLogs object if success=True, otherwise None.

    - error:
        Optional error description if success=False.
    """
    success: bool
    data: Optional[ConnectionLogs] = None
    error: Optional[str] = None


class ConnectionMetricsResponse(BaseModel):
    """
    Metrics payload for a single connection.

    This model mirrors the structure returned by
    BaseConnectionWorker.get_metrics().

    Fields:
    - conn_id:
        Internal connection identifier.

    - registered:
        Indicates whether the connection is currently registered
        in the runtime manager.

    - metrics:
        Core metrics dictionary (counters, timestamps, latencies).
        Values are typically int / float / str or None.

    - extra:
        Connection-specific metrics collected by individual workers
        (e.g. frames_total, parse_ok_total, reconnects_total, etc.).
    """
    conn_id: int
    registered: bool
    metrics: Dict[str, Optional[float | int | str]]
    extra: Dict[str, Optional[float | int | str]]


class ConnectionMetricsEnvelope(BaseModel):
    """
    Standard API response wrapper for connection metrics.

    Used by endpoints like:
      GET /connections/{id}/metrics

    Fields:
    - success:
        Indicates whether the request was processed successfully.

    - data:
        ConnectionMetricsResponse payload.
    """
    success: bool
    data: ConnectionMetricsResponse
