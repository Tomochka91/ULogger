# backend/app/loggers/easy_serial/framer.py
"""
Easy Serial message framer.

Processes raw bytes from a COM port into payload frames using:
  [preamble] PAYLOAD [terminator]

Includes:
- decode_escaped_bytes(): converts string with escape sequences to bytes
- EasySerialFramer: incremental framer for payload extraction
"""

from typing import List, Optional


def decode_escaped_bytes(pattern: Optional[str]) -> Optional[bytes]:
    """
    Easy Serial message framer.

    Processes raw bytes from a COM port into payload frames using:
    [preamble] PAYLOAD [terminator]

    Includes:
    - decode_escaped_bytes(): converts string with escape sequences to bytes
    - EasySerialFramer: incremental framer for payload extraction
    """
    if pattern is None:
        return None

    result = bytearray()
    i = 0
    n = len(pattern)

    while i < n:
        ch = pattern[i]
        if ch != "\\":
            result.append(ord(ch))
            i += 1
            continue

        # backslash detected
        if i + 1 >= n:
            # single '\' at end of string
            result.append(ord("\\"))
            i += 1
            continue

        nxt = pattern[i + 1]

        # standard short-escapes
        if nxt == "n":
            result.append(0x0A)
            i += 2
            continue
        if nxt == "r":
            result.append(0x0D)
            i += 2
            continue
        if nxt == "t":
            result.append(0x09)
            i += 2
            continue
        if nxt == "0":
            result.append(0x00)
            i += 2
            continue
        if nxt == "b":
            result.append(0x08)
            i += 2
            continue
        if nxt == "f":
            result.append(0x0C)
            i += 2
            continue
        if nxt == "v":
            result.append(0x0B)
            i += 2
            continue
        if nxt == "a":
            result.append(0x07)
            i += 2
            continue
        if nxt == "\\":
            result.append(ord("\\"))
            i += 2
            continue

        # hex byte: \xHH
        if nxt == "x" and i + 3 < n:
            hex_part = pattern[i + 2 : i + 4]
            try:
                value = int(hex_part, 16)
                if 0 <= value <= 255:
                    result.append(value)
                    i += 4
                    continue
            except ValueError:
                pass
            result.append(ord("\\"))
            i += 1
            continue

        # unicode codepoint: \uXXXX
        if nxt == "u" and i + 5 < n:
            hex_part = pattern[i + 2 : i + 6]
            try:
                code = int(hex_part, 16)
                if 0 <= code <= 255:
                    result.append(code)
                else:
                    # use least significant byte
                    result.append(code & 0xFF)
                i += 6
                continue
            except ValueError:
                pass
            result.append(ord("\\"))
            i += 1
            continue

        # unknown escape
        result.append(ord("\\"))
        i += 1

    return bytes(result)


class EasySerialFramer:
    """
    Incremental framer for Easy Serial messages.

    Extracts payload frames from a byte stream using:
        [preamble] PAYLOAD [terminator]

    Attributes:
        _preamble_bytes: bytes of preamble or None
        _terminator_bytes: bytes of terminator (mandatory)
        _buf: internal buffer of incoming bytes
    """

    def __init__(self, preamble: Optional[str], terminator: str) -> None:
        if not terminator:
            raise ValueError("terminator must be non-empty string")

        self._preamble_bytes = decode_escaped_bytes(preamble)
        self._terminator_bytes = decode_escaped_bytes(terminator)
        self._buf = bytearray()

    def feed(self, data: bytes) -> List[bytes]:
        """
        Feed raw bytes into the framer.

        Args:
            data: bytes to process

        Returns:
            List of complete payload frames extracted from the buffer
        """
        frames: List[bytes] = []
        if not data:
            return frames

        self._buf.extend(data)

        while True:
            start_index = 0

            # search for preamble if defined
            if self._preamble_bytes is not None:
                idx = self._buf.find(self._preamble_bytes)
                if idx == -1:
                    # preamble not found yet; trim buffer to avoid memory growth
                    max_keep = len(self._preamble_bytes) - 1
                    if max_keep > 0 and len(self._buf) > max_keep:
                        del self._buf[: len(self._buf) - max_keep]
                    return frames

                # discard everything before preamble
                if idx > 0:
                    del self._buf[:idx]
                start_index = len(self._preamble_bytes)

            # search for terminator
            term_idx = self._buf.find(self._terminator_bytes, start_index)
            if term_idx == -1:
                # terminator not found yet
                return frames
                
            # extract payload
            payload = bytes(self._buf[start_index:term_idx])
            frames.append(payload)

            # remove processed bytes from buffer
            del self._buf[: term_idx + len(self._terminator_bytes)]
            # continue to check for more frames in buffer
