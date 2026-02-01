# app/loggers/models.py
"""
Logger / Connection Configuration Models.

Contains:
- ConnectionType — supported types of connections
- LoggerConnectionConfig — main configuration for a single logger
  with fields for autostart, database writing, and specific settings
  for each connection type (easy_serial, mbox, modbus, etc.)
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, field_validator

from backend.app.loggers.easy_serial.config import EasySerialConfig
from backend.app.loggers.mbox.config import MboxConfig
from backend.app.loggers.mbox_counter.config import MboxCounterConfig
from backend.app.loggers.modbus_rtu.config import ModbusRtuConfig
from backend.app.loggers.modbus_tcp.config import ModbusTcpConfig


class ConnectionType(str, Enum):
    """
    Logger / connection type.
    """
    easy_serial = "easy_serial"
    mbox = "mbox"
    mbox_counter = "mbox_counter"
    modbus_rtu = "modbus_rtu"
    modbus_tcp = "modbus_tcp"


class LoggerConnectionConfig(BaseModel):
    """
    Configuration for a single logger/connection.

    Common fields:
      - id: unique identifier (assigned on the backend)
      - name: connection name (must be unique)
      - type: connection type (ConnectionType)
      - enabled: whether to write data to the database
      - autostart: whether to start automatically on backend startup
      - db_user / db_password: credentials for database writing
      - table_name / query_template: target table and query template for DB writes

    Type-specific fields (for the corresponding connection type):
      - easy_serial: Easy Serial settings
      - mbox: MBox settings
      - mbox_counter: MBox Counter settings
      - modbus_rtu: Modbus RTU settings
      - modbus_tcp: Modbus TCP settings
    """
    id: Optional[int] = None
    name: str
    type: ConnectionType

    enabled: bool = False       # whether to write to DB
    autostart: bool = False     # whether to autostart on backend launch

    db_user: Optional[str] = None
    db_password: Optional[str] = None
    table_name: Optional[str] = None
    query_template: Optional[str] = None

    # Specific configs — None by default
    easy_serial:    Optional["EasySerialConfig"] = None
    mbox:           Optional["MboxConfig"]  = None
    mbox_counter:   Optional["MboxCounterConfig"] = None
    modbus_rtu:     Optional["ModbusRtuConfig"] = None
    modbus_tcp:     Optional["ModbusTcpConfig"] = None

    @field_validator("db_user", "db_password", "table_name", "query_template")
    @classmethod
    def _strip_empty(cls, v: Optional[str]) -> Optional[str]:
        """
        Converts empty strings to None for easier processing.
        """
        if isinstance(v, str) and not v.strip():
            return None
        return v
