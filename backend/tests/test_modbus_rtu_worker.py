"""
backend/tests/test_modbus_rtu_worker.py

Unit-style integration test for Modbus RTU polling logic.

This test validates the Modbus RTU worker pipeline without using real serial hardware
or a real database:

- A fake Modbus client returns a predefined set of holding registers.
- The worker decodes registers according to ModbusValueEncoding (here: F32_SCALED_ABCD).
- The decoded value is placed into the payload dict under the configured variable name.
- The worker renders the SQL from query_template and calls DBWriter.write(sql, params).

The goal is to ensure that polling + decoding + query templating + DB writer invocation
work together as expected in a controlled environment.
"""

import time
from typing import List

from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.modbus_rtu.config import (
    ModbusRtuConfig,
    ModbusRtuPortSettings,
    ModbusSlaveConfig,
    ModbusVariableConfig,
    ModbusValueEncoding,
)
from backend.app.loggers.modbus_rtu.worker import ModbusRtuConnectionWorker
from backend.app.core.db_writer import BaseDBWriter


class FakeModbusResponse:
    """
    Fake Modbus response object that mimics pymodbus behavior.
    """
    def __init__(self, registers: List[int], error: bool = False):
        self.registers = registers
        self._error = error

    def isError(self) -> bool:
        return self._error


class FakeModbusClient:
    """
    Fake Modbus RTU client.

    Always returns a predefined list of registers and records
    all read_holding_registers() calls for verification.
    """
    def __init__(self, registers: List[int]):
        self._registers = registers
        self.calls = []

    def read_holding_registers(self, address: int, count: int, unit: int):
        # Record the call and return the requested number of registers
        self.calls.append((address, count, unit))
        return FakeModbusResponse(self._registers[:count])


class FakeDBWriter(BaseDBWriter):
    """
    Fake DB writer used to capture SQL write calls
    without touching a real database.
    """
    def __init__(self) -> None:
        self.writes = []

    def write(self, sql: str, params: dict) -> None:
        self.writes.append((sql, params))

    def close(self) -> None:
        pass


def test_modbus_rtu_worker_polls_and_writes_to_db():
    """
    Verify that:
      - the Modbus RTU worker polls the Modbus client,
      - decodes registers according to the selected encoding,
      - builds a payload with decoded variables,
      - calls DBWriter.write() with correct SQL and parameters.
    """

    # Prepare Modbus RTU port configuration
    port_cfg = ModbusRtuPortSettings(
        port="/dev/ttyUSB_TEST",
        baudrate=9600,
        databits=8,
        parity="None",
        stopbits=1.0,
        flowcontrol="None",
        autoconnect=True,
        timeout=1.0,
    )

    var = ModbusVariableConfig(
        name="temp",
        address=0,
        encoding=ModbusValueEncoding.F32_SCALED_ABCD,
        k=1.0,
        b=0.0,
        default=0.0,
    )

    slave = ModbusSlaveConfig(
        slave_id=1,
        variables=[var],
    )

    mb_cfg = ModbusRtuConfig(
        port=port_cfg,
        poll_interval=0.05,
        slaves=[slave],
    )

    # Connection-level configuration
    conn_cfg = LoggerConnectionConfig(
        id=4,
        name="Modbus Test",
        type=ConnectionType.modbus_rtu,
        enabled=True,
        autostart=False,
        db_user=None,
        db_password=None,
        table_name=None,
        query_template="INSERT INTO cpp (temp) VALUES ({temp})",
        easy_serial=None,
        modbus_rtu=mb_cfg,
    )

    # Prepare a fake Modbus response for a float32 value (ABCD order)
    import struct
    f_value = 12.5
    as_u32 = struct.unpack(">I", struct.pack(">f", f_value))[0]
    hi = (as_u32 >> 16) & 0xFFFF
    lo = as_u32 & 0xFFFF

    fake_client = FakeModbusClient(registers=[hi, lo])
    fake_db = FakeDBWriter()

    worker = ModbusRtuConnectionWorker(
        config=conn_cfg,
        db_writer=fake_db,
        client=fake_client,
    )

    # Start the worker
    worker.start()
    # Give it time to perform at least one polling cycle
    time.sleep(0.15)
    worker.stop()
    worker.join(1.0)

    # Ensure Modbus client was polled
    assert len(fake_client.calls) > 0

    # Ensure at least one DB write occurred
    assert len(fake_db.writes) > 0
    sql, params = fake_db.writes[-1]

    assert "INSERT INTO cpp (temp) VALUES" in sql
    assert "temp" in params

    # The decoded value should be close to the original float
    assert abs(params["temp"] - f_value) < 1e-5
