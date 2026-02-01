# backend/app/loggers/manager.py
"""
Runtime manager for logger/connection workers.

Responsibilities:
- Create workers based on LoggerConnectionConfig
- Register, start, stop, join, and unregister workers
- Provide access to worker state and metrics
- Shutdown all workers safely
- Provide DBWriter to workers if configuration allows
"""

import threading
from typing import Dict, Optional, Callable

from backend.app.loggers.base import BaseConnectionWorker, WorkerState
from backend.app.loggers.models import LoggerConnectionConfig, ConnectionType
from backend.app.loggers.easy_serial.worker import EasySerialConnectionWorker
from backend.app.loggers.mbox.worker import MboxConnectionWorker
from backend.app.loggers.mbox_counter.worker import MboxCounterConnectionWorker
from backend.app.loggers.modbus_rtu.worker import ModbusRtuConnectionWorker
from backend.app.loggers.modbus_tcp.worker import ModbusTcpConnectionWorker
from backend.app.schemas.db_settings import DbSettings
from backend.app.core.db_writer import BaseDBWriter, SQLAlchemyDBWriter


DBWriterFactory = Callable[[DbSettings, LoggerConnectionConfig], Optional[BaseDBWriter]]


class ConnectionRuntimeManager:
    """
    Manager for logger/connection workers.
    """

    def __init__(
        self,
        base_db_settings: DbSettings,
        db_writer_factory: Optional[DBWriterFactory] = None,
    ) -> None:
        self._base_db_settings = base_db_settings
        self._workers: Dict[int, BaseConnectionWorker] = {}
        self._lock = threading.Lock()
        self._db_writer_factory: DBWriterFactory = db_writer_factory or self._default_db_writer_factory

    def _default_db_writer_factory(
            self,
            base_db_settings: DbSettings,
            config: LoggerConnectionConfig,
    ) -> Optional[BaseDBWriter]:
        """
        Returns a DBWriter if config is ready to write to DB,
        or None if disabled or required fields are missing.
        """
        if not config.enabled:
            return None

        # Ensure all required fields are present
        if not (config.db_user and config.db_password and config.table_name and config.query_template):
            return None

        return SQLAlchemyDBWriter(
            base_settings=base_db_settings,
            db_user=config.db_user,
            db_password=config.db_password,
        )

    def _create_worker_for_config(
            self,
            config: LoggerConnectionConfig,
    ) -> BaseConnectionWorker:
        """
        Creates a worker instance based on connection type.
        """
        if config.type == ConnectionType.easy_serial:
            if config.easy_serial is None:
                raise ValueError("Easy Serial config is required for type 'easy_serial'")
            db_writer = self._db_writer_factory(self._base_db_settings, config)
            return EasySerialConnectionWorker(config, db_writer=db_writer)

        elif config.type == ConnectionType.mbox:
            if config.mbox is None:
                raise ValueError("MBox config is required for type 'mbox'")
            db_writer = self._db_writer_factory(self._base_db_settings, config)
            return MboxConnectionWorker(
                config,
                db_writer=db_writer,
                counter_total_provider=self._get_mbox_counter_total,
            )

        elif config.type == ConnectionType.mbox_counter:
            if config.mbox_counter is None:
                raise ValueError("MBox Counter config is required for type 'mbox_counter'")
            return MboxCounterConnectionWorker(config)

        elif config.type == ConnectionType.modbus_rtu:
            if config.modbus_rtu is None:
                raise ValueError("Modbus RTU config is required for type 'modbus_rtu'")
            db_writer = self._db_writer_factory(self._base_db_settings, config)
            return ModbusRtuConnectionWorker(config, db_writer=db_writer)

        elif config.type == ConnectionType.modbus_tcp:
            if config.modbus_tcp is None:
                raise ValueError("Modbus TCP config is required for type 'modbus_tcp'")
            db_writer = self._db_writer_factory(self._base_db_settings, config)
            return ModbusTcpConnectionWorker(config, db_writer=db_writer)

        raise ValueError(f"Unsupported connection type: {config.type}")

    def register_connection(
        self, config: LoggerConnectionConfig
    ) -> BaseConnectionWorker:
        """
        Registers a worker for a given connection config.
        If worker already exists, returns existing instance.
        """
        if config.id is None:
            raise ValueError("Connection config must have an id to register")

        with self._lock:
            worker = self._workers.get(config.id)
            if worker is None:
                worker = self._create_worker_for_config(config)
                self._workers[config.id] = worker
            return worker

    def start_connection(self, conn_id: int) -> None:
        with self._lock:
            worker = self._workers.get(conn_id)
            if worker is None:
                raise KeyError(f"Connection id {conn_id} is not registered")
        worker.start()

    def stop_connection(self, conn_id: int) -> None:
        with self._lock:
            worker = self._workers.get(conn_id)
            if worker is None:
                return
        worker.stop()

    def join_connection(self, conn_id: int, timeout: Optional[float] = None) -> None:
        with self._lock:
            worker = self._workers.get(conn_id)
            if worker is None:
                return
        worker.join(timeout)

    def unregister_connection(self, conn_id: int) -> None:
        """
        Removes a worker from the manager (without stopping/joining).
        Assumes caller already stopped the connection.
        """
        with self._lock:
            self._workers.pop(conn_id, None)

    def get_worker(self, conn_id: int) -> Optional[BaseConnectionWorker]:
        with self._lock:
            return self._workers.get(conn_id)

    def get_state(self, conn_id: int) -> Optional[WorkerState]:
        worker = self.get_worker(conn_id)
        return worker.state if worker is not None else None

    def shutdown_all(self, timeout: Optional[float] = None) -> None:
        """
        Stops all workers, waits for completion, and closes resources.
        """
        with self._lock:
            workers = list(self._workers.values())

        for w in workers:
            w.stop()
        for w in workers:
            w.join(timeout)
        for w in workers:
            w.close()

        with self._lock:
            self._workers.clear()

    def _get_mbox_counter_total(self, counter_conn_id: int, device_id: int) -> Optional[int]:
        """
        Returns total_count from an mbox_counter worker if it is running/registered.
        """
        w = self.get_worker(counter_conn_id)
        if w is None:
            return None
        # We don’t import the class explicitly — duck typing is enough
        get_total = getattr(w, "get_total", None)
        if callable(get_total):
            try:
                return get_total(device_id)
            except Exception:
                return None
        return None
