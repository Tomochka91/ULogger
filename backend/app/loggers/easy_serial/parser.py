# backend/app/loggers/easy_serial/parser.py
"""
Easy Serial payload parser.

Converts a raw payload string into a dictionary of typed fields based on parser settings.

Includes:
- _find_field_cfg(): helper to get field configuration by index
- _coerce_value(): convert raw string to the expected type
- parse_payload_text(): main function to parse a payload string
"""

from datetime import datetime
from typing import Any, Dict, Optional, List

from backend.app.loggers.easy_serial.config import (
    EasySerialParserSettings,
    EasySerialParsedFieldConfig,
)


def _find_field_cfg(
    fields: List[EasySerialParsedFieldConfig],
    index: int,
) -> Optional[EasySerialParsedFieldConfig]:
    """
    Lookup field configuration by its index in the split payload.

    Returns:
        EasySerialParsedFieldConfig or None if not found
    """
    for f in fields:
        if f.index == index:
            return f
    return None


def _coerce_value(raw: str, cfg: Optional[EasySerialParsedFieldConfig]) -> Any:
    """
    Convert raw string value to the type specified in field configuration.

    Supported types: string, int, float, datetime/date/time (requires format)

    Args:
        raw: the raw string from payload
        cfg: field configuration, may contain type and format

    Returns:
        value converted to proper type
    """
    
    if cfg is None:
        return raw

    t = (cfg.type or "string").lower()

    if t == "string":
        return raw
    if t == "int":
        return int(raw)
    if t == "float":
        return float(raw)
    if t in ("datetime", "date", "time"):
        if not cfg.format:
            raise ValueError(f"Field {cfg.index}: format is required for {t}")
        return datetime.strptime(raw, cfg.format)

    # unknown type, return as-is
    return raw


def parse_payload_text(
    payload_text: str,
    settings: EasySerialParserSettings,
) -> Dict[str, Any]:
    """
    Parse a single payload string according to parser settings.

    Steps:
    1. Split the string by the configured separator
    2. For each field configuration, take the value at the specified index
    3. Convert the value to the expected type (string/int/float/datetime)

    Args:
        payload_text: raw payload string from Easy Serial
        settings: parser settings defining fields, separator, etc.

    Returns:
        Dictionary mapping field names to typed values

    Raises:
        IndexError: if a field index is out of bounds
        ValueError: if conversion to the expected type fails
    """
    parts = payload_text.split(settings.separator)
    result: Dict[str, Any] = {}

    for field in settings.fields:
        if field.index < 0 or field.index >= len(parts):
            raise IndexError(
                f"Variable '{field.name}' refers to index {field.index}, "
                f"but only {len(parts)} fields present"
            )

        raw_value = parts[field.index].strip()
        field_cfg = _find_field_cfg(settings.fields, field.index)
        value = _coerce_value(raw_value, field_cfg)
        result[field.name] = value

    return result
