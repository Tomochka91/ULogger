# backend/app/loggers/mbox_counter/protocol.py
"""
Protocol framing for MBox counter devices.

This module implements a byte-stream framer for the counter protocol.
It extracts full binary frames from an incoming serial byte stream.

Frame format (high level):
    PREAMBLE  LEN  ...  CRC(?)

Where:
- PREAMBLE is a fixed sync byte (0x27)
- LEN is a one-byte payload length indicator
- Total frame size is computed as: 4 + LEN

The framer is stateful and keeps an internal buffer to support:
- partial frames split across reads
- garbage data before the preamble
- multiple frames in a single read chunk
"""

from typing import List


PREAMBLE = 0x27


class MboxCounterFramer:
    """
    Byte-stream framer for the counter protocol.

    Frame structure:
        0x27  L  ...  (total length = 4 + L)

    Where L represents:
        L = (C + A(2) + DATA) = 3 + len(DATA)

    Notes:
    - The framer does not validate CRC/checksum here; it only cuts frames.
    - Returned frames include the preamble byte and length byte.
    """
    def __init__(self) -> None:
        # Internal rolling buffer with unprocessed bytes
        self._buf = bytearray()

    def feed(self, data: bytes) -> List[bytes]:
        """
        Feed new bytes into the framer and extract all complete frames.

        :param data: New chunk of bytes from the serial port
        :return: List of complete protocol frames (raw bytes)
        """
        frames: List[bytes] = []
        if not data:
            return frames

        self._buf.extend(data)

        while True:
            # Search for preamble byte to synchronize on frame start
            try:
                stx = self._buf.index(PREAMBLE)
            except ValueError:
                # No preamble found -> buffer is garbage, clear it to avoid growth
                self._buf.clear()
                return frames

            # Drop any leading garbage bytes before the preamble
            if stx > 0:
                del self._buf[:stx]

            # Need at least PREAMBLE + LEN
            if len(self._buf) < 2:
                return frames

            # Length byte determines expected frame size
            L = self._buf[1]
            frame_len = 4 + L
            if frame_len <= 0:
                # Defensive guard against corrupted stream: discard one byte and resync
                del self._buf[:1]
                continue

            # Not enough bytes yet -> wait for next feed()
            if len(self._buf) < frame_len:
                return frames

            # Extract full frame and remove it from the buffer
            frame = bytes(self._buf[:frame_len])
            frames.append(frame)
            del self._buf[:frame_len]
