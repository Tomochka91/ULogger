# app/loggers/easy_serial/config.py
"""
Easy Serial connection configuration.

Contains:
- EasySerialPortSettings — COM port settings
- EasySerialParsedFieldConfig — description of a parsed field
- EasySerialParserSettings — parser settings
- EasySerialConfig — combined configuration for an Easy Serial connection
"""

from typing import Optional, Dict, List
from pydantic import BaseModel


class EasySerialPortSettings(BaseModel):
    """
    COM port settings for Easy Serial connection.
    """
    port: str
    baudrate: int = 9600
    databits: int = 8
    parity: str = "None"
    stopbits: float = 1.0
    flowcontrol: str = "None"
    autoconnect: bool = True        # whether to auto-open port on worker start
    timeout: float = 1.0            # read timeout in seconds


class EasySerialParsedFieldConfig(BaseModel):
    """
    Description of a single field after splitting the received line.
    """
    index: int                      # index after split()
    name: str                       # variable name
    type: str = "string"            # type: "int", "float", "string", "datetime", etc.
    format: Optional[str] = None    # optional datetime format


class EasySerialParserSettings(BaseModel):
    """
    Parser settings for Easy Serial messages.
    """
    preamble: Optional[str] = None
    terminator: str = "\n"          # frame terminator
    separator: str = ";"            # field separator
    encoding: str = "utf-8"         # string encoding
    fields: List[EasySerialParsedFieldConfig] = []  # fields configuration


class EasySerialConfig(BaseModel):
    """
    Complete Easy Serial connection configuration.

    Includes:
      - port: COM port settings
      - parser: parser settings
    """
    port: EasySerialPortSettings
    parser: EasySerialParserSettings
