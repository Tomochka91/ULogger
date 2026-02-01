# backend/app/loggers/mbox_counter/protocol.py
"""
Binary protocol implementation for MBox counter devices.

This module defines:
- protocol constants (control codes, preamble)
- CRC8 calculation used by the device
- helpers to build request frames
- parsing and validation of response frames

Responsibilities:
- This file handles *protocol-level* concerns only:
  framing structure, CRC validation, and binary field decoding.
- It does NOT deal with serial I/O or buffering (handled by the framer).
"""

from dataclasses import dataclass


PREAMBLE = 0x27

# Control codes
C_READ_REQ = 0x43   # CODE3: read counters request
C_READ_RESP = 0x08  # CODE8: counters data response

# Address of the "pass-through" counter
DATA_ADDR = b"\x01\x00"


def crc8_e5(data: bytes) -> int:
    """
    Calculate CRC8 using the device-specific E5 polynomial algorithm.

    Algorithm:
      - initial crc = 0
      - for each byte:
          crc ^= byte
          repeat 8 times:
              if (crc & 0x80): crc ^= 0xE5
              crc <<= 1
      - result = bitwise NOT of crc

    :param data: Input byte sequence
    :return: CRC8 value (0..255)
    """
    crc = 0
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x80:
                crc ^= 0xE5
            crc = (crc << 1) & 0xFF
    return (~crc) & 0xFF


def build_read_request(serial_u16: int) -> bytes:
    """
    Build a binary request frame for reading counter values.

    Frame format:
      27 L C A(2) hdr_crc DATA(2) data_crc

    Where:
      - PREAMBLE = 0x27
      - L = payload length = (C + A) + DATA = 3 + 2 = 5
      - C = 0x43 (read request)
      - A = device serial (uint16, little-endian)
      - hdr_crc = CRC8 over [L, C, A1, A2]
      - DATA = fixed address bytes (01 00)
      - data_crc = CRC8 over DATA

    :param serial_u16: Device serial number (uint16)
    :return: Full binary request frame
    """
    if not (0 <= serial_u16 <= 0xFFFF):
        raise ValueError("serial must be uint16 (0..65535)")

    a = serial_u16.to_bytes(2, "little")
    L = 5
    header = bytes([L, C_READ_REQ]) + a
    hdr_crc = crc8_e5(header).to_bytes(1, "little")
    data_crc = crc8_e5(DATA_ADDR).to_bytes(1, "little")
    return bytes([PREAMBLE]) + header + hdr_crc + DATA_ADDR + data_crc


@dataclass(frozen=True)
class ParsedCountersResponse:
    """
    Parsed response from a counter device.

    All numeric values are already converted from little-endian.
    """
    serial: int          # uint16 device serial
    total_count: int     # uint32 total counter value
    size_dir: int        # uint16 size/direction field
    flags: int           # uint8 status flags


def parse_response_frame(frame: bytes) -> ParsedCountersResponse:
    """
    Parse and validate a full response frame produced by the framer.

    Expected frame structure:
      27 L C A1 A2 hdr_crc  DATA...(L-3 bytes) data_crc

    For a read response (C = 0x08), DATA must be exactly 7 bytes:
      - total_count: 4 bytes (uint32 LE)
      - size_dir:    2 bytes (uint16 LE)
      - flags:       1 byte

    Validation steps:
      - preamble check
      - frame length check
      - control code check
      - header CRC validation
      - data CRC validation
      - payload length validation

    :param frame: Full raw frame (including preamble)
    :return: ParsedCountersResponse
    :raises ValueError: on any format or CRC error
    """
    if not frame or frame[0] != PREAMBLE:
        raise ValueError("bad preamble")

    if len(frame) < 6:
        raise ValueError("frame too short")

    L = frame[1]
    expected_len = 4 + L
    if len(frame) != expected_len:
        raise ValueError(f"bad frame length: got {len(frame)}, expected {expected_len}")

    C = frame[2]
    if C != C_READ_RESP:
        raise ValueError(f"unexpected control code: 0x{C:02x}")

    # Device serial number
    a_bytes = frame[3:5]
    serial_u16 = int.from_bytes(a_bytes, "little")

    # Header CRC check
    hdr_crc = frame[5]
    header = frame[1:5]  # [L,C,A1,A2]
    if crc8_e5(header) != hdr_crc:
        raise ValueError("header crc mismatch")

    # Extract and validate data block
    data_len = L - 3
    data_start = 6
    data_end = data_start + data_len
    data = frame[data_start:data_end]
    data_crc = frame[data_end]
    if crc8_e5(data) != data_crc:
        raise ValueError("data crc mismatch")

    if len(data) != 7:
        raise ValueError(f"unexpected data length: {len(data)} (expected 7)")

    total = int.from_bytes(data[0:4], "little", signed=False)
    size_dir = int.from_bytes(data[4:6], "little", signed=False)
    flags = data[6]

    return ParsedCountersResponse(
        serial=serial_u16,
        total_count=total,
        size_dir=size_dir,
        flags=flags,
    )
