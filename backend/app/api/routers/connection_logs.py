# backend/app/api/routers/connection_logs.py
"""
API routes for retrieving logs and metrics of connection workers.

Responsibilities:
- Provide endpoint to fetch the latest N messages and M errors from a worker
- Provide endpoint to fetch current runtime metrics of a worker
- Handle cases when a worker is not yet registered or never started
- Use SettingsManager to validate connection configuration
- Use ConnectionRuntimeManager to access live worker state and buffers
"""

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.deps import get_settings_manager, get_runtime_manager
from backend.app.core.settings_manager import SettingsManager
from backend.app.loggers.manager import ConnectionRuntimeManager
from backend.app.schemas.connection_logs import (
    ConnectionLogs,
    ConnectionLogsResponse,
    ConnectionMetricsEnvelope
)

router = APIRouter()


@router.get(
    "/{conn_id}/logs",
    response_model=ConnectionLogsResponse,
    summary="Get latest worker messages and errors",
)
def get_connection_logs(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
    messages_limit: int = 100,
    errors_limit: int = 50,
) -> ConnectionLogsResponse:
    """
    Returns the tail of logs for a specific connection:
    - last N messages (recent_messages)
    - last M errors (recent_errors)

    If the worker has never been started, messages and errors are empty.
    """

    # 1. Ensure the connection configuration exists
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection id {conn_id} not found",
        )

    # 2. Retrieve the worker from the runtime manager (may be None)
    worker = runtime_manager.get_worker(conn_id)
    registered = worker is not None

    if not registered:
        # Worker is not registered yet — return empty logs without error
        logs = ConnectionLogs(
            conn_id=conn_id,
            name=conn.name,
            registered=False,
            messages=[],
            errors=[],
        )
        return ConnectionLogsResponse(success=True, data=logs)

    # 3. Worker exists (running or stopped): extract buffered logs
    all_messages = worker.recent_messages
    all_errors = worker.recent_errors

    if messages_limit > 0:
        messages = all_messages[-messages_limit:]
    else:
        messages = all_messages

    if errors_limit > 0:
        errors = all_errors[-errors_limit:]
    else:
        errors = all_errors

    logs = ConnectionLogs(
        conn_id=conn_id,
        name=conn.name,
        registered=True,
        messages=messages,
        errors=errors,
    )

    return ConnectionLogsResponse(success=True, data=logs)


@router.get(
    "/{conn_id}/metrics",
    summary="Get worker metrics",
    response_model=ConnectionMetricsEnvelope
)
def get_connection_metrics(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
):
    # Ensure the connection configuration exists
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(status_code=404, detail="Connection not found")

    worker = runtime_manager.get_worker(conn_id)
    if worker is None:
        return {
            "success": True,
            "data": {
                "conn_id": conn_id,
                "registered": False,
                "metrics": {},
                "extra": {},
            },
        }

    data = worker.get_metrics()
    return {
        "success": True,
        "data": {
            "conn_id": conn_id,
            "registered": True,
            **data,
        },
    }
