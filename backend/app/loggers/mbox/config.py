# backend/app/loggers/mbox/config.py
"""
Configuration models for the MBox logger.

This module defines all configuration structures required to work with
an MBox-based weighing device. The protocol itself is fixed and
domain-specific, so most configuration options relate to:

- Serial port connection parameters
- Weight transformation logic (tare, error detection)
- Integration with an external counter device
- Handling of missing or erroneous weight packets
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, field_validator


class MboxPortSettings(BaseModel):
    """
    Serial port settings for MBox device communication.

    These settings are mapped directly to pyserial parameters and control
    how the backend connects to the physical weighing device.
    """
    port: str
    baudrate: int = 9600
    databits: int = 8
    parity: str = "None"
    stopbits: float = 1.0
    flowcontrol: str = "None"
    autoconnect: bool = True
    timeout: float = 1.0


class MboxConfig(BaseModel):
    """
    Main configuration for the MBox logger.

    MBox uses a fixed protocol and contains domain-specific logic related
    to weight measurements, error detection, and optional integration
    with an external counter device.
    """
    # Serial port configuration
    port: MboxPortSettings

    # MBox id
    mbox_id: int

    # Tare value subtracted from raw weight:
    # adj_weight = max(0, raw_weight - tare)
    tare: float = 0.0

    # Lot or batch identifier (stored with measurements)
    lot: str = ""

    # Error detection rules
    treat_zero_as_error: bool = True
    treat_duplicate_as_error: bool = True

    # Error labels written into error_info field
    error_label_zero: str = "no weight"
    error_label_duplicate: str = "no weight"

    # Payload encoding used by the device
    encoding: str = "ascii"

    # External counter integration
    ext_counter: bool = False

    # References to counter connection/device
    counter_connection_id: Optional[int] = None
    counter_device_id: Optional[int] = None

    # Timeouts (seconds) used when synchronizing with counter
    counter_clean_timeout: float = 6.0  # wait for counter confirmation after packet
    counter_miss_timeout: float = 4.0   # wait before inserting a "missed" packet

    # Strategy for handling missing packets:
    # - "last": reuse last known valid values
    # - "default": use miss_default values
    miss_strategy: str = "last"  # "last" | "default"
    miss_default: Dict[str, Any] = {}

    # Limit for inserting synthetic "missed" packets
    miss_insert_limit: int = 1

    # Error label used when miss insertion happens
    miss_error_label: str = "scales error"

    @field_validator("counter_connection_id", "counter_device_id")
    @classmethod
    def _require_counter_fields_if_enabled(cls, v, info):
        """
        Validate that counter identifiers are provided when ext_counter is enabled.
        """
        cfg = info.data
        if cfg.get("ext_counter") and v is None:
            raise ValueError("counter_* fields are required when ext_counter=True")
        return v

