# backend/tests/test_mbox_counter_protocol.py
"""
Unit tests for the Mbox Counter protocol helpers.

Covers:
- crc8_e5() against known reference vectors ("docs" / protocol spec examples)
- build_read_request() exact byte layout for a given serial number
- parse_response_frame() decoding (serial, total_count, flags) from a full frame

These tests are pure and do not require real hardware.
"""

from backend.app.loggers.mbox_counter.protocol import crc8_e5, build_read_request, parse_response_frame


def test_crc_vectors_match_docs():
    """
    CRC reference vectors taken from the protocol documentation/examples.
    If these ever change, it likely means the CRC implementation or the
    input framing rules changed.
    """
    # request header: 05 43 78 1a -> 1f
    assert crc8_e5(bytes.fromhex("05 43 78 1a")) == 0x1F
    # request data: 01 00 -> f3
    assert crc8_e5(bytes.fromhex("01 00")) == 0xF3

    # response header: 0a 08 78 1a -> cd
    assert crc8_e5(bytes.fromhex("0a 08 78 1a")) == 0xCD
    # response data: 28 1c 29 00 01 00 05 -> 0d
    assert crc8_e5(bytes.fromhex("28 1c 29 00 01 00 05")) == 0x0D


def test_build_request_exact_bytes():
    """
    build_read_request() should produce exactly:
      27 L C A(2) hdr_crc DATA(2) data_crc

    For serial=0x1A78 (little-endian A bytes = 78 1a), expected bytes are:
      27 05 43 78 1a 1f 01 00 f3
    """
    req = build_read_request(0x1A78)
    assert req.hex(" ") == "27 05 43 78 1a 1f 01 00 f3"


def test_parse_response_total_count():
    """
    Parses a full response frame:
      27 0a 08 78 1a cd 28 1c 29 00 01 00 05 0d

    DATA (7 bytes) = 28 1c 29 00 01 00 05
      total_count = 0x00291c28 = 2694184 (little-endian uint32)
      size_dir    = 0x0001     (little-endian uint16)  [not asserted here]
      flags       = 0x05
    """
    frame = bytes.fromhex("27 0a 08 78 1a cd 28 1c 29 00 01 00 05 0d")
    parsed = parse_response_frame(frame)
    assert parsed.serial == 0x1A78
    assert parsed.total_count == 2694184
    assert parsed.flags == 0x05
