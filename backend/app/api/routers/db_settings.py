# app/api/routers/db_settings.py
"""
API routes for managing global database connection settings.

Responsibilities:
- Retrieve current global DB settings
- Save new DB settings
- Test database connection
- Integrates with SettingsManager for persistence
"""

from fastapi import APIRouter, Depends

from backend.app.api.deps import get_settings_manager
from backend.app.core.settings_manager import SettingsManager
from backend.app.core import db_client
from backend.app.schemas.db_settings import (DbSettingsAction, DbActionType, DbSettingsResponse, DbSettingsActionRequest,
                                             DbSettingsActionResponse)

router = APIRouter()


@router.get("/settings", response_model=DbSettingsResponse)
def read_db_settings(
    settings_manager: SettingsManager = Depends(get_settings_manager),
) -> DbSettingsResponse:
    """
    Returns current (global) database connection settings.
    """
    return DbSettingsResponse(
        success=True,
        data=settings_manager.get_db_settings()
    )


@router.post("/settings", response_model=DbSettingsActionResponse)
def db_settings_action(
    payload: DbSettingsActionRequest,
    settings_manager: SettingsManager = Depends(get_settings_manager),
) -> DbSettingsActionResponse:
    """
    Performs an action on the database settings.

    Actions:
    - save: saves new DB settings
    - test: tests the connection to the database
    """
    response = DbSettingsAction(
        action=payload.action,
        settings=payload.settings
    )

    # action == "save"
    if payload.action == DbActionType.save:
        settings_manager.save_db_settings(payload.settings)
        return DbSettingsActionResponse(
            success=True,
            data=response
        )

    # action == "test"
    else:
        test_result = db_client.test_connection(payload.settings)
        return DbSettingsActionResponse(
            success=test_result.success,
            data=response,
            error=test_result.error
        )

