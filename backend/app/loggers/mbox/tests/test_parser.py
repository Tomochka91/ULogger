# backend/app/loggers/mbox/tests/test_parser.py
"""
Unit tests for MBox label payload parser.

These tests validate CSV payload parsing logic for a single MBox frame.
The parser is expected to:
- Decode ASCII payload
- Parse datetime in YYYYMMDDhhmmssmmm format
- Extract fish metadata and weights
- Raise ValueError on any malformed input
"""

from datetime import datetime
import pytest

from backend.app.loggers.mbox.parser import parse_label_frame, MboxLabelRecord


def make_payload(text: str) -> bytes:
    """
    Helper to convert CSV string into raw payload bytes.
    """
    return text.encode("ascii")


def test_parse_valid_frame():
    """
    Valid payload must be parsed into MboxLabelRecord
    with all fields correctly populated.
    """
    payload = make_payload(
        "20240101123015999,MACKEREL,M,LOT1,0,0,0,12.5,13.1,SN123,0"
    )
    rec = parse_label_frame(payload)

    assert isinstance(rec, MboxLabelRecord)
    assert rec.dt == datetime(2024, 1, 1, 12, 30, 15, 999000)
    assert rec.sFishType == "MACKEREL"
    assert rec.sSize == "M"
    assert rec.sLot == "LOT1"
    assert rec.nWeight == 12.5
    assert rec.rWeight == 13.1
    assert rec.sSNumber == "SN123"


def test_parse_too_short():
    """
    Payload with insufficient number of CSV fields
    must raise ValueError.
    """
    payload = make_payload("20240101,ABC")
    with pytest.raises(ValueError):
        parse_label_frame(payload)


def test_parse_bad_datetime():
    """
    Invalid datetime format must raise ValueError.
    """
    payload = make_payload(
        "BADDATE,MACKEREL,M,LOT1,0,0,0,1.0,2.0,SN1"
    )
    with pytest.raises(ValueError):
        parse_label_frame(payload)


def test_parse_bad_weights():
    """
    Non-numeric weight fields must raise ValueError.
    """
    payload = make_payload(
        "20240101123015999,MACKEREL,M,LOT1,0,0,0,AAA,BBB,SN1"
    )
    with pytest.raises(ValueError):
        parse_label_frame(payload)
