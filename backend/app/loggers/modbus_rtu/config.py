# backend/app/loggers/modbus_rtu/config.py
"""
Configuration models for Modbus RTU logger connections.

This module defines:
- serial port settings for Modbus RTU
- supported data encodings for Modbus registers
- variable mapping from Modbus registers to logical variables
- slave configuration (per slave_id)
- top-level Modbus RTU connection configuration

These models are pure configuration/data schemas and contain no runtime logic.
"""

from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel


Number = Union[int, float]


class ModbusRtuPortSettings(BaseModel):
    """
    Serial port settings for Modbus RTU connection.
    """
    port: str
    baudrate: int = 9600
    databits: int = 8
    parity: str = "None"
    stopbits: float = 1.0
    flowcontrol: str = "None"
    autoconnect: bool = True
    timeout: float = 1.0


class ModbusValueEncoding(str, Enum):
    """
    Encoding/interpretation type for values read from Modbus registers.

    Supported variants:

    16-bit values:
      - u16 / s16
      - u16_scaled / s16_scaled        (y = k*x + b)

    32-bit integer values:
      - u32_abcd / u32_cdab
      - s32_abcd / s32_cdab
      - u32_scaled_abcd / u32_scaled_cdab
      - s32_scaled_abcd / s32_scaled_cdab

    32-bit floating point values:
      - f32_abcd / f32_cdab
      - f32_scaled_abcd / f32_scaled_cdab

    Byte order notation:
      - ABCD: big-endian register order
      - CDAB: swapped register order
    """

    # 16-bit
    U16 = "u16"
    S16 = "s16"
    U16_SCALED = "u16_scaled"
    S16_SCALED = "s16_scaled"

    # 32-bit int, raw
    U32_ABCD = "u32_abcd"
    U32_CDAB = "u32_cdab"
    S32_ABCD = "s32_abcd"
    S32_CDAB = "s32_cdab"

    # 32-bit int, scaled
    U32_SCALED_ABCD = "u32_scaled_abcd"
    U32_SCALED_CDAB = "u32_scaled_cdab"
    S32_SCALED_ABCD = "s32_scaled_abcd"
    S32_SCALED_CDAB = "s32_scaled_cdab"

    # 32-bit float, raw
    F32_ABCD = "f32_abcd"
    F32_CDAB = "f32_cdab"

    # 32-bit float, scaled
    F32_SCALED_ABCD = "f32_scaled_abcd"
    F32_SCALED_CDAB = "f32_scaled_cdab"


class ModbusVariableConfig(BaseModel):
    """
    Definition of a single variable read from Modbus registers.
    """
    name: str                     # variable name used in query_template
    address: int                  # starting Modbus register address
    encoding: ModbusValueEncoding # register encoding (uses 1 or 2 registers)
    k: float = 1.0                # scale coefficient for y = k*x + b
    b: float = 0.0
    default: Optional[Number] = None  # fallback value if read fails


class ModbusSlaveConfig(BaseModel):
    """
    Configuration of a single Modbus RTU slave device.
    """
    slave_id: int
    slave_name: str
    variables: List[ModbusVariableConfig]


class ModbusRtuConfig(BaseModel):
    """
    Complete configuration for a Modbus RTU connection.

    Includes:
      - serial port parameters
      - polling interval
      - list of slave devices and their variables
    """
    port: ModbusRtuPortSettings
    poll_interval: float = 1.0  # polling period in seconds
    slaves: List[ModbusSlaveConfig]
