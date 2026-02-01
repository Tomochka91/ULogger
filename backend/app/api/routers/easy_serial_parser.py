# backend/app/api/routers/easy_serial_parser.py
"""
API routes for testing the Easy Serial parser pipeline.

Responsibilities:
- Accept raw text from a serial port
- Frame the text using preamble/terminator
- Decode escaped bytes
- Parse the payload according to parser settings
- Return parsed variables or errors
"""

from fastapi import APIRouter

from backend.app.schemas.easy_serial_parser import EasySerialParserTestRequest, EasySerialParserTestResponse
from backend.app.loggers.easy_serial.parser import parse_payload_text
from backend.app.loggers.easy_serial.framer import EasySerialFramer
from backend.app.loggers.easy_serial.framer import decode_escaped_bytes

router = APIRouter()


@router.post("/parser/test", response_model=EasySerialParserTestResponse)
def test_easy_serial_parser(req: EasySerialParserTestRequest):
    """
    Tests the pipeline:
      raw_text (as received from the port) -> framer (preamble/terminator) -> parser (separator/variables).

    Behavior:
      - If the framer finds no frames — returns an error.
      - If multiple frames exist — parses the first one only.
    """
    try:
        # 1. Feed raw bytes through the framer
        framer = EasySerialFramer(
            preamble=req.parser_settings.preamble,
            terminator=req.parser_settings.terminator,
        )

        raw_bytes = decode_escaped_bytes(req.raw_text)
        if raw_bytes is None:
            raw_bytes = b""
        frames = framer.feed(raw_bytes)

        if not frames:
            return EasySerialParserTestResponse(
                parsed=None,
                error="Framer did not find any complete frame (check preamble/terminator).",
            )

        # Take the first payload
        payload_bytes = frames[0]

        # 2. Decode bytes and parse text
        encoding = req.parser_settings.encoding or "utf-8"
        payload_text = payload_bytes.decode(encoding, errors="replace")

        parsed = parse_payload_text(payload_text, req.parser_settings)

        return EasySerialParserTestResponse(
            parsed=parsed,
            error=None,
        )
    except Exception as exc:
        return EasySerialParserTestResponse(
            parsed=None,
            error=str(exc),
        )
