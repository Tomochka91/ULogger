"""
backend/tests/test_modbus_tcp_worker.py

Unit-style integration tests for the Modbus TCP connection worker.

These tests verify the Modbus TCP polling pipeline using a fake TCP client
and a fake database writer:

- The worker connects to a fake Modbus TCP client.
- Holding registers are read via read_holding_registers().
- Register values are decoded according to ModbusTcpValueEncoding
  (including float32 ABCD and simple integer types).
- Decoded values are placed into the payload dictionary.
- SQL is rendered using query_template and passed to DBWriter.write().

The tests cover both successful reads and failure scenarios where the worker
must fall back to default values without entering an error state.
"""

import time
from typing import List

from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.modbus_tcp.config import (
    ModbusTcpConfig,
    ModbusTcpHostSettings,
    ModbusTcpSlaveConfig,
    ModbusTcpVariableConfig,
    ModbusTcpValueEncoding,
)
from backend.app.loggers.modbus_tcp.worker import ModbusTcpConnectionWorker
from backend.app.core.db_writer import BaseDBWriter


class FakeModbusResponse:
    def __init__(self, registers: List[int], error: bool = False):
        self.registers = registers
        self._error = error

    def isError(self) -> bool:
        return self._error


class FakeModbusTcpClient:
    """
    Fake TCP client compatible with the worker protocol:
      - connect / close
      - read_holding_registers(address, count, device_id)
    """
    def __init__(self, registers: List[int]):
        self._registers = registers
        self.calls = []
        self.connected = False

    def connect(self) -> bool:
        self.connected = True
        return True

    def close(self) -> None:
        self.connected = False

    def read_holding_registers(self, address: int, count: int, device_id: int):
        self.calls.append((address, count, device_id))
        return FakeModbusResponse(self._registers[:count], error=False)


class FakeDBWriter(BaseDBWriter):
    def __init__(self) -> None:
        self.writes = []

    def write(self, sql: str, params: dict) -> None:
        self.writes.append((sql, params))

    def close(self) -> None:
        pass


def test_modbus_tcp_worker_polls_and_writes_to_db_float32():
    """
    Verify that:
      - the worker polls the fake TCP client
      - float32 ABCD values are decoded correctly
      - data is written to DBWriter using query_template
    """
    # host settings
    host = ModbusTcpHostSettings(
        address="127.0.0.1",
        port=502,
        autoconnect=False,
        timeout=1.0,
    )

    # variable temp: float32 scaled ABCD
    var = ModbusTcpVariableConfig(
        name="temp",
        address=0,
        encoding=ModbusTcpValueEncoding.F32_SCALED_ABCD,
        k=1.0,
        b=0.0,
        default=0.0,
    )

    slave = ModbusTcpSlaveConfig(
        slave_id=2,
        slave_name="slave_2",
        variables=[var],
    )

    tcp_cfg = ModbusTcpConfig(
        host=host,
        poll_interval=0.05,
        slaves=[slave],
    )

    conn_cfg = LoggerConnectionConfig(
        id=9,
        name="bam",
        type=ConnectionType.modbus_tcp,
        enabled=True,
        autostart=False,
        db_user=None,
        db_password=None,
        table_name=None,
        query_template="INSERT INTO cpp (temp) VALUES ({temp})",
        easy_serial=None,
        modbus_rtu=None,
        modbus_tcp=tcp_cfg,
    )

    # Encode 12.5 as float32 -> two ABCD registers
    import struct
    f_value = 12.5
    as_u32 = struct.unpack(">I", struct.pack(">f", f_value))[0]
    hi = (as_u32 >> 16) & 0xFFFF
    lo = as_u32 & 0xFFFF

    fake_client = FakeModbusTcpClient(registers=[hi, lo])
    fake_db = FakeDBWriter()

    worker = ModbusTcpConnectionWorker(
        config=conn_cfg,
        db_writer=fake_db,
        client=fake_client,
    )

    worker.start()
    time.sleep(0.15)
    worker.stop()
    worker.join(1.0)

    # Client must have received read calls
    assert len(fake_client.calls) > 0
    # (address=0, count=2, device_id=2)
    assert fake_client.calls[-1][2] == 2

    # DB write must have happened
    assert len(fake_db.writes) > 0
    sql, params = fake_db.writes[-1]

    assert "INSERT INTO cpp (temp) VALUES" in sql
    assert "temp" in params
    assert abs(params["temp"] - f_value) < 1e-5


def test_modbus_tcp_worker_uses_default_when_read_fails():
    """
    If reading a variable fails, the worker must use the default value
    (or the last known value) and must not crash.
    """
    class FailingFakeClient(FakeModbusTcpClient):
        def read_holding_registers(self, address: int, count: int, device_id: int):
            self.calls.append((address, count, device_id))
            return FakeModbusResponse([], error=True)

    host = ModbusTcpHostSettings(address="127.0.0.1", port=502, autoconnect=False, timeout=1.0)

    var = ModbusTcpVariableConfig(
        name="x",
        address=0,
        encoding=ModbusTcpValueEncoding.U16,
        default=123,
    )

    slave = ModbusTcpSlaveConfig(slave_id=1, slave_name="s1", variables=[var])
    tcp_cfg = ModbusTcpConfig(host=host, poll_interval=0.05, slaves=[slave])

    conn_cfg = LoggerConnectionConfig(
        id=10,
        name="fail_default",
        type=ConnectionType.modbus_tcp,
        enabled=True,
        autostart=False,
        db_user=None,
        db_password=None,
        table_name=None,
        query_template="INSERT INTO cpp (x) VALUES ({x})",
        easy_serial=None,
        modbus_rtu=None,
        modbus_tcp=tcp_cfg,
    )

    fake_client = FailingFakeClient(registers=[0])
    fake_db = FakeDBWriter()

    worker = ModbusTcpConnectionWorker(config=conn_cfg, db_writer=fake_db, client=fake_client)

    worker.start()
    time.sleep(0.15)
    worker.stop()
    worker.join(1.0)

    assert len(fake_db.writes) > 0
    _, params = fake_db.writes[-1]
    assert params["x"] == 123  # default
    # The worker must not end up in ERROR state
    assert worker.state != "error"
