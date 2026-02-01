# backend/app/loggers/mbox/parser.py
"""
Parser for MBox label frames.

This module is responsible for converting a single MBox payload
(raw bytes extracted by the framer) into a structured Python object
representing one weighing/labeling event.

The protocol format is CSV-like and position-based.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class MboxLabelRecord:
    """
    Parsed result of a single MBox label frame.

    This structure represents one logical measurement / label record
    produced by the MBox device.
    """
    dt: datetime          # Timestamp of the measurement
    sFishType: str        # Fish type (domain-specific string)
    sSize: str            # Fish size / category
    nWeight: float        # Net weight
    rWeight: float        # Real (raw) weight
    sSNumber: str         # Serial number


def parse_label_frame(payload: bytes, encoding: str = "ascii") -> MboxLabelRecord:
    """
    Parse a single MBox frame payload.

    Expected payload format (CSV, positional):

        0: datetime (YYYYMMDDhhmmssmmm)
        1: fish type (unused here)
        2: size (unused here)
        3: lot (unused)
        ...
        6: fish type
        7: serial number
        8: size
        9: net weight
        10: real weight
        (remaining fields are ignored)

    Notes:
    - Payload is decoded using the provided encoding (default: ASCII)
    - The parser is strict and positional
    - Any format or conversion error results in ValueError

    :param payload: Raw payload bytes extracted by the framer
    :param encoding: Character encoding used by the device
    :return: Parsed MboxLabelRecord
    :raises ValueError: On decode, format, or conversion errors
    """
    # Decode raw bytes into text
    try:
        text = payload.decode(encoding).strip()
    except Exception as exc:
        raise ValueError(f"decode error: {exc}") from exc

    # Split CSV fields
    parts = text.split(",")

    # We rely on fixed field positions, so the length must be sufficient
    if len(parts) < 10:
        raise ValueError(f"expected at least 10 fields, got {len(parts)}")


    # Field 0 — timestamp in YYYYMMDDhhmmssmmm format
    ts_raw = parts[0]
    try:
        dt = datetime.strptime(ts_raw, "%Y%m%d%H%M%S%f")
    except ValueError as exc:
        raise ValueError(f"invalid datetime '{ts_raw}'") from exc

    # Weight fields (numeric)
    try:
        n_weight = float(parts[9])
        r_weight = float(parts[10])
    except ValueError as exc:
        raise ValueError("invalid weight value") from exc

    # Construct structured result
    record = MboxLabelRecord(
        dt=dt,
        sFishType=parts[6].strip(),
        sSize=parts[8].strip(),
        nWeight=n_weight,
        rWeight=r_weight,
        sSNumber=parts[7].strip(),
    )

    return record
