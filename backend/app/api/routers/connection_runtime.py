# backend/app/api/routers/connections_runtime.py

"""
Runtime control API for connections (loggers).

Provides FastAPI endpoints to manage connection workers lifecycle:
- get runtime status
- start connection
- stop connection
- restart connection

Uses:
- SettingsManager to access connection configuration
- ConnectionRuntimeManager to manage worker threads and states
"""

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.deps import get_settings_manager, get_runtime_manager
from backend.app.core.settings_manager import SettingsManager
from backend.app.loggers.manager import ConnectionRuntimeManager
from backend.app.loggers.base import WorkerState
from backend.app.schemas.connection_runtime import (
    ConnectionRuntimeStatus,
    ConnectionRuntimeStatusResponse,
)

router = APIRouter()


def _build_status(
    conn_id: int,
    settings_manager: SettingsManager,
    runtime_manager: ConnectionRuntimeManager,
) -> ConnectionRuntimeStatus:
    # Connection configuration loaded from JSON
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection id {conn_id} not found",
        )

    worker = runtime_manager.get_worker(conn_id)
    registered = worker is not None
    state: WorkerState | None = runtime_manager.get_state(conn_id) if registered else None
    last_error = worker.last_error if worker is not None else None

    return ConnectionRuntimeStatus(
        conn_id=conn_id,
        name=conn.name,
        enabled=conn.enabled,
        registered=registered,
        state=state,
        last_error=last_error,
    )


@router.get(
    "/{conn_id}/status",
    response_model=ConnectionRuntimeStatusResponse,
    summary="Get logger / connection status",
)
def get_connection_status(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
) -> ConnectionRuntimeStatusResponse:
    status_obj = _build_status(conn_id, settings_manager, runtime_manager)
    return ConnectionRuntimeStatusResponse(success=True, data=status_obj)


@router.post(
    "/{conn_id}/start",
    response_model=ConnectionRuntimeStatusResponse,
    summary="Start logger / connection",
)
def start_connection(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
) -> ConnectionRuntimeStatusResponse:
    # Retrieve connection configuration
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection id {conn_id} not found",
        )

    # Register the connection (create worker if it does not exist yet)
    runtime_manager.register_connection(conn)

    # Start the worker
    try:
        runtime_manager.start_connection(conn_id)
    except KeyError:
        # Should not normally happen, since the connection was just registered
        return ConnectionRuntimeStatusResponse(
            success=False,
            error=f"Connection id {conn_id} is not registered in runtime manager",
        )

    status_obj = _build_status(conn_id, settings_manager, runtime_manager)
    return ConnectionRuntimeStatusResponse(success=True, data=status_obj)


@router.post(
    "/{conn_id}/stop",
    response_model=ConnectionRuntimeStatusResponse,
    summary="Stop logger / connection",
)
def stop_connection(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
) -> ConnectionRuntimeStatusResponse:
    # First, ensure the connection configuration exists
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection id {conn_id} not found",
        )

    # stop_connection is safe: if no worker exists, it simply returns
    runtime_manager.stop_connection(conn_id)

    status_obj = _build_status(conn_id, settings_manager, runtime_manager)
    return ConnectionRuntimeStatusResponse(success=True, data=status_obj)


# backend/app/api/routers/connections_runtime.py

@router.post(
    "/{conn_id}/restart",
    response_model=ConnectionRuntimeStatusResponse,
    summary="Restart connection worker",
)
def restart_connection(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
) -> ConnectionRuntimeStatusResponse:
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection id {conn_id} not found",
        )

    # If the worker has not been registered yet, register it first
    runtime_manager.register_connection(conn)

    # 1) Gracefully stop the worker
    runtime_manager.stop_connection(conn_id)

    # 2) Wait for the worker thread to finish
    runtime_manager.join_connection(conn_id, timeout=2.0)

    # 3) Start the worker again
    runtime_manager.start_connection(conn_id)

    status_obj = _build_status(conn_id, settings_manager, runtime_manager)
    return ConnectionRuntimeStatusResponse(success=True, data=status_obj)

