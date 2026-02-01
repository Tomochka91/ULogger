# app/api/routers/__init__.py
from fastapi import APIRouter

from .db_settings import router as db_settings_router
from .connections import router as connections_router
from .connection_runtime import router as connection_runtime_router
from .connection_logs import router as connection_logs_router
from .serial_ports import router as serial_ports_router
from .easy_serial_parser import router as easy_serial_parser_router
from .mbox_commands import router as mbox_commands_router

api_router = APIRouter()
api_router.include_router(db_settings_router, prefix="/db", tags=["db"])
api_router.include_router(connections_router, prefix="/connections", tags=["connections"])
api_router.include_router(connection_runtime_router, prefix="/connections/runtime", tags=["runtime"])
api_router.include_router(connection_logs_router, prefix="/connections/runtime", tags=["runtime-logs"])
api_router.include_router(serial_ports_router, prefix="/serial-ports", tags=["serial-ports"])
api_router.include_router(easy_serial_parser_router, prefix="/easy-serial", tags=["easy-serial"])
api_router.include_router(mbox_commands_router, prefix="/mbox", tags=["mbox"])