# /app/schemas/serial_ports.py
"""
Schemas related to serial (COM) port discovery and testing.

These models are used by API endpoints that:
- list available serial ports on the host system,
- test whether a specific port can be opened with given parameters.

They are intentionally minimal and transport-oriented, without
any business or protocol-specific logic.
"""

from pydantic import BaseModel

class SerialPortInfo(BaseModel):
    """
    Information about a detected serial port.

    This model is typically returned by an endpoint that enumerates
    available ports using the underlying OS / pyserial facilities.

    Attributes:
        name:
            System identifier of the port (e.g. "COM3", "/dev/ttyUSB0").
        description:
            Human-readable description provided by the OS/driver,
            if available.
        hwid:
            Hardware identifier string (VID/PID, serial number, etc.),
            if available.
    """
    name: str
    description: str | None = None
    hwid: str | None = None


class SerialPortTestRequest(BaseModel):
    """
    Request payload for testing a serial port.

    The backend will attempt to open the specified port with the
    given parameters and immediately close it.

    This is used to validate:
    - port availability,
    - basic access permissions,
    - absence of conflicts with other processes.
    """
    port: str
    baudrate: int = 9600
    timeout: float = 1.0


class SerialPortTestResponse(BaseModel):
    """
    Result of a serial port test.

    Attributes:
        success:
            True if the port was successfully opened and closed.
        error:
            Error message if the operation failed, otherwise None.
    """
    success: bool
    error: str | None = None
