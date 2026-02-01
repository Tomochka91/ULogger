# backend/app/loggers/mbox/tests/test_framer.py
"""
Unit tests for MboxFramer.

These tests validate byte-level framing logic for MBox serial protocol.

Protocol assumptions:
- Each frame starts with STX (0x02)
- The second byte must be '$'
- Payload is arbitrary bytes
- Frame ends with ETX (0x03)
- Garbage before STX must be ignored
- Partial frames must be buffered until completed
"""

from backend.app.loggers.mbox.framer import MboxFramer, STX, ETX


def frame(payload: bytes) -> bytes:
    """
    Helper to build a valid framed message.

    Format:
        STX + '$' + payload + ETX
    """
    return bytes([STX]) + b"$" + payload + bytes([ETX])


def test_single_frame():
    """
    Single complete frame received in one chunk
    must be returned as one payload.
    """
    framer = MboxFramer()
    data = frame(b"ABC,123")
    frames = framer.feed(data)
    assert frames == [b"ABC,123"]


def test_garbage_before_frame():
    """
    Garbage bytes before STX must be ignored.
    Only valid frames should be returned.
    """
    framer = MboxFramer()
    data = b"xxxx" + frame(b"DATA")
    frames = framer.feed(data)
    assert frames == [b"DATA"]


def test_partial_frame():
    """
    Frame split across multiple feed() calls
    must be buffered until ETX is received.
    """
    framer = MboxFramer()
    data1 = bytes([STX]) + b"$ABC"
    data2 = b",123" + bytes([ETX])

    assert framer.feed(data1) == []
    assert framer.feed(data2) == [b"ABC,123"]


def test_multiple_frames():
    """
    Multiple frames in a single data chunk
    must all be extracted in correct order.
    """
    framer = MboxFramer()
    data = frame(b"ONE") + frame(b"TWO") + frame(b"THREE")
    frames = framer.feed(data)
    assert frames == [b"ONE", b"TWO", b"THREE"]


def test_invalid_second_byte():
    """
    If the byte after STX is not '$',
    the frame must be considered invalid and skipped.
    """
    framer = MboxFramer()
    bad = bytes([STX]) + b"XBAD" + bytes([ETX])
    good = frame(b"OK")

    frames = framer.feed(bad + good)
    assert frames == [b"OK"]


def test_stx_without_etx_keeps_buffer():
    """
    If STX is received but ETX is missing,
    the internal buffer must be preserved
    until the frame is completed.
    """
    framer = MboxFramer()
    part = bytes([STX]) + b"$ABC"
    assert framer.feed(part) == []
    # Continue feeding the same framer instance
    assert framer.feed(b"DEF" + bytes([ETX])) == [b"ABCDEF"]
