# backend/app/loggers/modbus_tcp/config.py
"""
Modbus TCP configuration models.

This module defines Pydantic models for describing a Modbus TCP polling connection:
- TCP endpoint settings (host/port, timeouts, autoconnect)
- value decoding formats for holding registers (16-bit, 32-bit int/float; word order ABCD/CDAB)
- variables to read (register address, encoding, scaling, defaults)
- slaves (Unit IDs) and their variables
- top-level Modbus TCP connection configuration including polling interval

These models are used to validate and serialize/deserialize connection settings stored in
application settings (e.g., JSON) and exchanged via the API.
"""

from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel


Number = Union[int, float]


class ModbusTcpHostSettings(BaseModel):
    """
    Settings for a Modbus TCP endpoint.
    """
    address: str                 # IP/hostname
    port: int = 502
    autoconnect: bool = True
    timeout: float = 1.0         # секунд


class ModbusTcpValueEncoding(str, Enum):
    """
    How to interpret values read from Modbus holding registers.

    Supported families:
    - 16-bit unsigned/signed
    - 16-bit with linear scaling (y = k*x + b)
    - 32-bit unsigned/signed with word order ABCD or CDAB
    - 32-bit float (IEEE754) with word order ABCD or CDAB
    - 32-bit with linear scaling (y = k*x + b)
    """

    # 16-bit
    U16 = "u16"
    S16 = "s16"
    U16_SCALED = "u16_scaled"
    S16_SCALED = "s16_scaled"

    # 32-bit int (raw)
    U32_ABCD = "u32_abcd"
    U32_CDAB = "u32_cdab"
    S32_ABCD = "s32_abcd"
    S32_CDAB = "s32_cdab"

    # 32-bit int (scaled)
    U32_SCALED_ABCD = "u32_scaled_abcd"
    U32_SCALED_CDAB = "u32_scaled_cdab"
    S32_SCALED_ABCD = "s32_scaled_abcd"
    S32_SCALED_CDAB = "s32_scaled_cdab"

    # 32-bit float (raw)
    F32_ABCD = "f32_abcd"
    F32_CDAB = "f32_cdab"

    # 32-bit float (scaled)
    F32_SCALED_ABCD = "f32_scaled_abcd"
    F32_SCALED_CDAB = "f32_scaled_cdab"


class ModbusTcpVariableConfig(BaseModel):
    """
    A single variable definition read from Modbus holding registers.
    """
    name: str
    address: int                      # starting register address (agree on 0-based vs 4xxxx externally)
    encoding: ModbusTcpValueEncoding

    # y = kx + b
    k: float = 1.0
    b: float = 0.0

    # Default value when not read yet or when polling fails
    default: Optional[Number] = None


class ModbusTcpSlaveConfig(BaseModel):
    """
    One Modbus TCP slave (Unit ID). Useful for TCP->RTU gateways.
    """
    slave_id: int
    slave_name: str
    variables: List[ModbusTcpVariableConfig]


class ModbusTcpConfig(BaseModel):
    """
    Full Modbus TCP connection settings:
      - TCP host/port
      - polling interval
      - list of slaves (Unit IDs) and variables to poll
    """
    host: ModbusTcpHostSettings
    poll_interval: float = 1.0
    slaves: List[ModbusTcpSlaveConfig]
