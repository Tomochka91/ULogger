# backend/app/loggers/mbox/framer.py
"""
Framer for the MBox binary protocol.

The expected frame format is:

    STX '$' PAYLOAD ETX

Where:
- STX (0x02) marks the start of a frame
- '$' is a fixed protocol marker
- PAYLOAD is a sequence of raw bytes (decoded later)
- ETX (0x03) marks the end of a frame

This framer operates on a byte stream and is tolerant to:
- partial frames
- garbage bytes before STX
- frame boundaries split across multiple reads
"""

from typing import List

STX = 0x02
ETX = 0x03


class MboxFramer:
    """
    Byte-stream framer for the MBox protocol.

    Responsibilities:
    - Accumulate incoming bytes in an internal buffer
    - Detect valid frames using STX / '$' / ETX markers
    - Extract raw payload bytes (without decoding)
    - Drop malformed or out-of-sync data safely

    The framer is stateful and intended to be reused across reads.
    """

    def __init__(self) -> None:
        # Internal rolling buffer with unprocessed bytes
        self._buf = bytearray()

    def feed(self, data: bytes) -> List[bytes]:
        """
        Feed new bytes into the framer and extract all complete frames.

        :param data: New chunk of bytes read from the serial port
        :return: List of extracted payloads (raw bytes, without STX/'$'/ETX)
        """
        frames: List[bytes] = []
        if not data:
            return frames

        # Append new data to the internal buffer
        self._buf.extend(data)

        while True:
            # 1) Search for STX (start of frame)
            try:
                stx_idx = self._buf.index(STX)
            except ValueError:
                # No STX found — buffer contains only garbage
                # Clear it to prevent uncontrolled growth
                self._buf.clear()
                return frames

            # If STX is not at position 0, drop leading garbage bytes
            if stx_idx > 0:
                del self._buf[:stx_idx]

            # We need at least: STX + '$' + something (ETX or payload)
            if len(self._buf) < 3:
                return frames

            # 2) Validate protocol marker after STX
            if self._buf[1] != ord("$"):
                # Invalid frame start — discard STX and retry sync
                del self._buf[0]
                continue

            # 3) Search for ETX (end of frame), starting after '$'
            try:
                etx_idx = self._buf.index(ETX, 2)
            except ValueError:
                # Frame not complete yet — wait for more data
                return frames

            # 4) Extract payload (raw bytes between '$' and ETX)
            payload = bytes(self._buf[2:etx_idx])
            frames.append(payload)

            # 5) Remove processed frame from the buffer
            del self._buf[: etx_idx + 1]
            # Continue loop to check for more frames in buffer

        # unreachable
