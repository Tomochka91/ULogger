# backend/app/api/routers/connections.py
"""
API routes for managing logger/connection configurations.

Responsibilities:
- List all connection configs
- Get a single connection config by ID
- Create, update, and delete connection configs
- Integrate with runtime manager to register, start, stop, and unregister workers
- Ensure proper handling of autostart and previous RUNNING state during updates
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from backend.app.api.deps import get_settings_manager, get_runtime_manager
from backend.app.core.settings_manager import SettingsManager, ConnectionNameAlreadyExistsError
from backend.app.loggers.models import LoggerConnectionConfig
from backend.app.loggers.manager import ConnectionRuntimeManager
from backend.app.loggers.base import WorkerState
from backend.app.schemas.connections import (
    ConnectionCreateRequest,
    ConnectionUpdateRequest,
    ConnectionResponse,
)

router = APIRouter()


@router.get("/", response_model=List[ConnectionResponse])
def list_connections(
    settings_manager: SettingsManager = Depends(get_settings_manager),
) -> List[LoggerConnectionConfig]:
    """
    Returns a list of all logger/connection configurations.
    """
    return settings_manager.get_connections()


@router.get("/{conn_id}", response_model=ConnectionResponse)
def get_connection(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
) -> LoggerConnectionConfig:
    """
    Returns a logger/connection configuration by ID.
    """
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


@router.post("/", response_model=ConnectionResponse)
def create_connection(
    payload: ConnectionCreateRequest,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
) -> LoggerConnectionConfig:
    """
    Creates a new logger/connection configuration.

    Note:
    - ID from the payload is ignored; it will be assigned on the backend.
    """
    data = payload.model_copy()
    data.id = None

    try:
        created = settings_manager.upsert_connection(data)
    except ConnectionNameAlreadyExistsError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Register worker in runtime
    runtime_manager.register_connection(created)

    # If autostart is enabled, start the connection immediately
    if created.autostart and created.id is not None:
        runtime_manager.start_connection(created.id)

    return created


@router.put("/{conn_id}", response_model=ConnectionResponse)
def update_connection(
    conn_id: int,
    payload: ConnectionUpdateRequest,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
) -> LoggerConnectionConfig:
    """
    Updates a logger/connection configuration by ID.

    Runtime logic:
      - Remember if the worker was RUNNING
      - Stop and remove the old worker
      - Register a new worker with the updated configuration
      - Start it if previously RUNNING or if autostart=True
    """
    existing = settings_manager.get_connection(conn_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Remember previous state (if worker exists)
    prev_state = runtime_manager.get_state(conn_id)

    data = payload.model_copy()
    data.id = conn_id

    try:
        updated = settings_manager.upsert_connection(data)
    except ConnectionNameAlreadyExistsError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Stop and remove the old worker (if it exists)
    runtime_manager.stop_connection(conn_id)
    runtime_manager.join_connection(conn_id, timeout=5.0)
    runtime_manager.unregister_connection(conn_id)

    # Register new worker with updated config
    runtime_manager.register_connection(updated)

    # Decide whether to start it:
    #   - previously RUNNING → restart
    #   - or if autostart=True
    if updated.id is not None and (
        prev_state == WorkerState.RUNNING or updated.autostart
    ):
        runtime_manager.start_connection(updated.id)

    return updated


@router.delete("/{conn_id}")
def delete_connection(
    conn_id: int,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
):
    """
    Deletes a logger/connection configuration by ID.

    Additionally:
      - Stops the worker (if it exists)
      - Waits for shutdown completion
      - Unregisters the worker from runtime manager
    """
    # Stop and remove runtime worker first
    runtime_manager.stop_connection(conn_id)
    runtime_manager.join_connection(conn_id, timeout=5.0)
    runtime_manager.unregister_connection(conn_id)

    # Then remove from settings
    deleted = settings_manager.delete_connection(conn_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"success": True}
