# backend/tests/test_easy_serial_parser.py
"""
Unit tests for the Easy Serial text parser.

What this test covers:
- `parse_payload_text()` splits an incoming payload string by `separator`
  and extracts configured fields by index.
- Each extracted field is converted to the requested type:
  - string, int, float
  - datetime/date/time via `datetime.strptime()` using `field.format`
- Out-of-range indices must raise `IndexError` (configuration vs payload mismatch).

These tests do not depend on serial ports, framing, or database logic.
"""

from backend.app.loggers.easy_serial.config import (
    EasySerialParserSettings,
    EasySerialParsedFieldConfig
)
from backend.app.loggers.easy_serial.parser import parse_payload_text


def test_parser_basic_string_int_float():
    """Parses basic scalar types from a semicolon-separated payload."""
    settings = EasySerialParserSettings(
        separator=";",
        fields=[
            EasySerialParsedFieldConfig(index=0, name="name", type="string"),
            EasySerialParsedFieldConfig(index=1, name="count", type="int"),
            EasySerialParsedFieldConfig(index=2, name="weight", type="float"),
        ]
    )

    payload = "FISH;10;12.34"
    parsed = parse_payload_text(payload, settings)

    assert parsed["name"] == "FISH"
    assert parsed["count"] == 10
    assert parsed["weight"] == 12.34


def test_parser_missing_field_index_raises():
    """
    If a configured field index is out of range for the payload,
    the parser must raise IndexError.
    """
    settings = EasySerialParserSettings(
        separator=";",
        fields=[
            EasySerialParsedFieldConfig(index=2, name="x", type="float")
        ]
    )

    payload = "a;b"
    try:
        parse_payload_text(payload, settings)
        assert False, "Expected IndexError for out-of-range field index"
    except IndexError:
        pass


def test_parser_datetime_field():
    """Parses a datetime field using the provided strptime format."""
    settings = EasySerialParserSettings(
        separator=";",
        fields=[
            EasySerialParsedFieldConfig(
                index=0, name="dt", type="datetime", format="%Y-%m-%d %H:%M"
            )
        ]
    )

    payload = "2025-11-19 15:30"
    parsed = parse_payload_text(payload, settings)

    dt = parsed["dt"]
    assert dt.year == 2025
    assert dt.month == 11
    assert dt.day == 19
    assert dt.hour == 15
    assert dt.minute == 30
