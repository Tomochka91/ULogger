# backend/app/loggers/mbox_counter/config.py
"""
Configuration models for MBox counter connections.

This module defines configuration structures for:
- serial port settings used by mbox_counter
- individual counter devices on the bus
- global polling behavior

These models are used both for validation and for runtime setup
of the mbox_counter worker.
"""

from typing import List
from pydantic import BaseModel, Field


class MboxCounterPortSettings(BaseModel):
    """
    Serial port settings for MBox counter connection.
    """
    port: str
    baudrate: int = 9600
    databits: int = 8
    parity: str = "None"
    stopbits: float = 1.0
    flowcontrol: str = "None"
    autoconnect: bool = True
    timeout: float = 1.0


class MboxCounterDeviceConfig(BaseModel):
    """
    Configuration for a single counter device on the bus.
    """
    device_id: int = Field(..., ge=1, description="Internal device identifier (used by frontend and business logic)")
    name: str
    serial: int = Field(..., ge=0, le=65535, description="Bus address / serial number (uint16), encoded as little-endian in protocol frames")
    enabled: bool = True


class MboxCounterConfig(BaseModel):
    """
    Configuration for an MBox counter connection.

    Includes:
    - serial port settings
    - polling interval
    - list of attached counter devices
    """
    port: MboxCounterPortSettings
    poll_interval: float = 1.0
    devices: List[MboxCounterDeviceConfig] = []
