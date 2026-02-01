# backend/app/api/routers/serial_ports.py
"""
API routes for managing and testing serial ports.

Responsibilities:
- List available/free COM ports
- Test opening a specific serial port with given parameters
- Determine port availability by attempting to open it
"""

from fastapi import APIRouter
from serial.tools import list_ports

from backend.app.schemas.serial_ports import SerialPortInfo, SerialPortTestRequest, SerialPortTestResponse
import serial

router = APIRouter()


def _is_port_free(name: str) -> bool:
    """
    Attempts to open the port with minimal settings.
    - If successful: port is considered free.
    - If fails (SerialException or OS error): port is considered occupied.
    """
    try:
        ser = serial.Serial(
            port=name,
            baudrate=9600,
            timeout=0.1,
        )
        try:
            ser.close()
        except Exception:
            pass
        return True
    except Exception:
        return False


@router.get("/available", response_model=list[SerialPortInfo])
def available_ports():
    """
    Returns a list of *free* COM ports.

    Ports that cannot be opened (occupied or error) are filtered out.
    """
    result: list[SerialPortInfo] = []
    for p in list_ports.comports():
        if not _is_port_free(p.device):
            continue
        result.append(
            SerialPortInfo(
                name=p.device,
                description=p.description,
                hwid=p.hwid,
            )
        )
    return result


@router.post("/test", response_model=SerialPortTestResponse)
def test_port(req: SerialPortTestRequest):
    """
    Attempts to open a specific port with the given settings.

    Returns success=True if the port can be opened, otherwise returns the error.
    """
    try:
        ser = serial.Serial(
            port=req.port,
            baudrate=req.baudrate,
            timeout=req.timeout,
        )
        try:
            ser.close()
        except Exception:
            pass
        return SerialPortTestResponse(success=True)
    except Exception as exc:
        return SerialPortTestResponse(success=False, error=str(exc))
