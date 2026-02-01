# /app/schemas/easy_serial_parser.py
"""
Schemas for testing Easy Serial parser configuration.

This module defines request/response models used by the API endpoint
that allows validating Easy Serial parser settings against a raw
input string *without* running a real serial connection.

Typical use case:
- frontend sends a sample payload (raw_text),
- together with EasySerialParserSettings,
- backend runs the parser and returns either parsed variables
  or a human-readable error.
"""
from pydantic import BaseModel
from backend.app.loggers.easy_serial.config import EasySerialParserSettings
from typing import Dict, Any


class EasySerialParserTestRequest(BaseModel):
    """
    Request payload for Easy Serial parser test.

    Attributes:
        raw_text:
            Raw payload text as it would be received from the serial port
            (already decoded to string).
        parser_settings:
            Full parser configuration describing how the payload
            should be split and interpreted.
    """
    raw_text: str
    parser_settings: EasySerialParserSettings


class EasySerialParserTestResponse(BaseModel):
    """
    Response payload for Easy Serial parser test.

    Exactly one of the fields should be non-null:
    - parsed: successful parsing result (variables dict)
    - error: error message describing what went wrong
    """
    parsed: Dict[str, Any] | None = None
    error: str | None = None
