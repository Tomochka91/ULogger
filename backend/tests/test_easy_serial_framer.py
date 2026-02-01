# backend/tests/test_easy_serial_framer.py
"""
Unit tests for EasySerial framing helpers.

What this test covers:
- `decode_escaped_bytes()` converts human-friendly escape sequences (e.g. "\\n", "\\x02", "\\u0002")
  into the raw bytes expected by the framer configuration.
- `EasySerialFramer.feed()` extracts payload frames from an incoming byte stream using:
    [optional preamble] + PAYLOAD + [terminator]

Notes:
- These are pure unit tests: no serial ports, no DB, no network.
- The tests also validate stream behavior: partial frames should be buffered across multiple `.feed()` calls.
"""

from backend.app.loggers.easy_serial.framer import (
    decode_escaped_bytes,
    EasySerialFramer,
)


def test_decode_escaped_bytes_simple():
    assert decode_escaped_bytes("ABC") == b"ABC"
    assert decode_escaped_bytes(r"\n") == b"\x0a"
    assert decode_escaped_bytes(r"\r\n") == b"\x0d\x0a"
    assert decode_escaped_bytes(r"\x02$") == b"\x02$"
    assert decode_escaped_bytes(r"\u0002$") == b"\x02$"
    # Literal backslash: "\\x02" becomes bytes for '\' 'x' '0' '2' (not a hex escape)
    assert decode_escaped_bytes(r"\\x02") == b"\\x02"  


def test_framer_no_preamble_newline_terminator():
    """
    Terminator-only framing:
    - preamble=None
    - terminator="\\n"
    """
    framer = EasySerialFramer(preamble=None, terminator=r"\n")

    data = b"abc\nxyz\n"
    frames = framer.feed(data)
    # terminator = "\n" -> payloads are "abc" and "xyz"
    assert frames == [b"abc", b"xyz"]


def test_framer_with_preamble_and_terminator():
    """
    Preamble + terminator framing:
    - preamble = STX + '$'  (0x02 0x24)
    - terminator = "\\n" + ETX (0x0A 0x03)
    """
    framer = EasySerialFramer(
        preamble=r"\x02$",
        terminator=r"\n\x03",
    )

    stream = b"garbage\x02$PAY1\n\x03more\x02$PAY2\n\x03tail"
    frames = framer.feed(stream)

    assert frames == [b"PAY1", b"PAY2"]


def test_framer_partial_frames():
    """
    Streaming behavior:
    - if the terminator hasn't arrived yet, payload bytes must remain buffered
    - subsequent `.feed()` calls should complete the frame
    """
    framer = EasySerialFramer(preamble=None, terminator=r"\n")

    frames1 = framer.feed(b"abc")
    assert frames1 == []

    frames2 = framer.feed(b"def\nxyz")
    assert frames2 == [b"abcdef"]

    frames3 = framer.feed(b"123\n")
    assert frames3 == [b"xyz123"]
