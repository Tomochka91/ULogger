# backend/app/api/routers/mbox_commands.py
"""
API routes for managing MBox devices and counters.

Responsibilities:
- Send start commands to MBox devices
- List available mbox_counter devices for assignment
- Ensure devices are not double-assigned
- Return runtime state and counters where applicable
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Set, Tuple, List, Optional
from pydantic import BaseModel

from backend.app.api.deps import get_settings_manager, get_runtime_manager
from backend.app.core.settings_manager import SettingsManager
from backend.app.loggers.manager import ConnectionRuntimeManager
from backend.app.loggers.models import ConnectionType


router = APIRouter()


class MboxStartCommandRequest(BaseModel):
    send: bool = True


class AvailableCounterItem(BaseModel):
    counter_connection_id: int
    counter_connection_name: str
    device_id: int
    device_name: str
    serial: int
    runtime_state: Optional[str] = None
    total_count: Optional[int] = None


class AvailableCountersResponse(BaseModel):
    success: bool = True
    data: List[AvailableCounterItem]


@router.post(
    "/{conn_id}/start-command",
    summary="Send MBox start command",
)
def send_mbox_start_command(
    conn_id: int,
    payload: MboxStartCommandRequest,
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
): 
    """
    Sends a start command to an MBox connection.

    Behavior:
      - Validates connection exists and is of type MBox
      - Returns immediately if send=False
      - Ensures worker supports start command
      - Executes command and handles errors
    """
    conn = settings_manager.get_connection(conn_id)
    if conn is None:
        raise HTTPException(status_code=404, detail="Connection not found")

    if conn.type != ConnectionType.mbox:
        raise HTTPException(status_code=400, detail="Connection is not mbox")

    if not payload.send:
        return {"success": True}

    worker = runtime_manager.get_worker(conn_id)
    if worker is None:
        raise HTTPException(status_code=409, detail="Worker is not running/registered")

    send_fn = getattr(worker, "send_start_command", None)
    if not callable(send_fn):
        raise HTTPException(status_code=500, detail="Worker does not support start command")

    try:
        send_fn()
        return {"success": True}
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get(
    "/available-counters",
    response_model=AvailableCountersResponse,
    summary="List available mbox_counter devices for selection",
)
def get_available_mbox_counters(
    settings_manager: SettingsManager = Depends(get_settings_manager),
    runtime_manager: ConnectionRuntimeManager = Depends(get_runtime_manager),
) -> AvailableCountersResponse:
    """
    Returns a list of available mbox_counter devices that are not currently assigned.

    Logic:
      - Collects all occupied (counter_conn_id, device_id) pairs
      - Scans all mbox_counter connections for enabled, free devices
      - Optionally includes runtime state and total count
    """
    all_conns = settings_manager.get_connections()

    # 1) Collect set of occupied (counter_connection_id, device_id)
    bound: Set[Tuple[int, int]] = set()
    for c in all_conns:
        if c.id is None:
            continue
        if c.type != ConnectionType.mbox or c.mbox is None:
            continue
        if not c.mbox.ext_counter:
            continue

        # ext_counter=True guarantees counter_* fields are set by validator
        ccid = c.mbox.counter_connection_id
        did = c.mbox.counter_device_id
        if ccid is None or did is None:
            continue

        bound.add((ccid, did))

    # 2) Collect free devices from all mbox_counter connections
    out: List[AvailableCounterItem] = []

    for c in all_conns:
        if c.id is None:
            continue
        if c.type != ConnectionType.mbox_counter or c.mbox_counter is None:
            continue

        worker = runtime_manager.get_worker(c.id)
        runtime_state = worker.state.value if worker is not None else None

        for dev in c.mbox_counter.devices:
            if not dev.enabled:
                continue
            key = (c.id, dev.device_id)
            if key in bound:
                continue

            total_count: Optional[int] = None
            if worker is not None:
                get_total = getattr(worker, "get_total", None)
                if callable(get_total):
                    try:
                        total_count = get_total(dev.device_id)
                    except Exception:
                        total_count = None

            out.append(
                AvailableCounterItem(
                    counter_connection_id=c.id,
                    counter_connection_name=c.name,
                    device_id=dev.device_id,
                    device_name=dev.name,
                    serial=dev.serial,
                    runtime_state=runtime_state,
                    total_count=total_count,
                )
            )

    return AvailableCountersResponse(success=True, data=out)
