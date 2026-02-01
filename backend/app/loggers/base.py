# Copyright (c) 2025
# TTL & SEM Engineering Team
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.


# backend/app/loggers/base.py
"""
Base worker interface for loggers/connections.

Provides:
- State management with WorkerState
- Thread-safe buffers for messages and errors
- Basic metrics tracking (messages, errors, DB writes, timing, etc.)
- Abstract start/stop/join/is_running interface
- Utility methods for logging and metric updates
"""

import threading
from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, List
from collections import deque
from datetime import datetime
import time


class WorkerState(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class BaseConnectionWorker(ABC):
    """
    Base interface for a logger/connection worker.
    """

    def __init__(self) -> None:
        self._state: WorkerState = WorkerState.CREATED
        self._state_lock = threading.Lock()
        self._last_error: Optional[str] = None

        # Buffers for recent messages/errors
        self._log_lock = threading.Lock()
        self._message_buffer = deque(maxlen=200)  # last N messages
        self._error_buffer = deque(maxlen=50)  # last N errors

        # Metrics
        self._metrics_lock = threading.Lock()
        self._metrics = {
            "runs_total": 0,
            "started_at": None,
            "stopped_at": None,

            "errors_total": 0,
            "consecutive_errors": 0,
            "last_error_at": None,

            "messages_total": 0,
            "last_message_at": None,

            "db_writes_total": 0,
            "db_write_fail_total": 0,
            "last_db_write_at": None,
            "last_db_error_at": None,
            "db_write_latency_ms_last": None,
            "db_write_latency_ms_avg": None,
        }
        self._extra_metrics = {}


    @property
    def state(self) -> WorkerState:
        with self._state_lock:
            return self._state

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    @property
    def recent_messages(self) -> List[str]:
        """
        Returns a copy of the buffer with recent messages (with timestamps).
        """
        with self._log_lock:
            return list(self._message_buffer)

    @property
    def recent_errors(self) -> List[str]:
        """
        Returns a copy of the buffer with recent errors (with timestamps).
        """
        with self._log_lock:
            return list(self._error_buffer)

    def _set_state(self, state: WorkerState) -> None:
        with self._state_lock:
            self._state = state

    def _set_error(self, msg: str) -> None:
        """
        Sets state to ERROR and records the error with timestamp.
        """
        timestamp = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        formatted = f"{timestamp} — {msg}"

        with self._log_lock:
            self._last_error = formatted
            self._error_buffer.append(formatted)

        with self._metrics_lock:
            self._metrics["errors_total"] += 1
            self._metrics["consecutive_errors"] += 1
            self._metrics["last_error_at"] = datetime.now().strftime("%d-%m-%Y %H:%M:%S")

    def _log_message(self, msg: str) -> None:
        """
        Local worker log: adds a message to the ring buffer.
        Message is prepended with timestamp.
        """
        timestamp = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        formatted = f"{timestamp} — {msg}"
        with self._log_lock:
            self._message_buffer.append(formatted)

        with self._metrics_lock:
            self._metrics["messages_total"] += 1
            self._metrics["last_message_at"] = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
            self._metrics["consecutive_errors"] = 0

    @abstractmethod
    def start(self) -> None:
        """
        Starts the worker (creates thread/task, etc.).
        Must be idempotent: repeated start() while RUNNING should not break anything.
        """
        raise NotImplementedError

    @abstractmethod
    def stop(self) -> None:
        """
        Initiates worker stop (not necessarily blocking).
        """
        raise NotImplementedError

    @abstractmethod
    def join(self, timeout: Optional[float] = None) -> None:
        """
        Waits for background execution to finish (if thread exists).
        """
        raise NotImplementedError

    @abstractmethod
    def is_running(self) -> bool:
        """
        Returns True if worker is currently active.
        """
        raise NotImplementedError

    def close(self) -> None:
        """
        Optional hook for releasing resources (DBWriter, ports, etc.).
        Implementations may override.
        """
        pass

    def _metric_inc(self, name: str, value: int = 1, extra: bool = False) -> None:
        with self._metrics_lock:
            target = self._extra_metrics if extra else self._metrics
            target[name] = target.get(name, 0) + value

    def _metric_set(self, name: str, value, extra: bool = False) -> None:
        with self._metrics_lock:
            target = self._extra_metrics if extra else self._metrics
            target[name] = value

    def get_metrics(self) -> dict:
        with self._metrics_lock:
            return {
                "metrics": dict(self._metrics),
                "extra": dict(self._extra_metrics),
            }

    def _metric_ema_update(
        self,
        last_key: str,
        avg_key: str,
        value: float,
        alpha: float = 0.2,
        extra: bool = False,
    ) -> None:
        """
        Updates last and avg using EMA:
          avg = alpha * value + (1-alpha) * avg
        """
        with self._metrics_lock:
            target = self._extra_metrics if extra else self._metrics
            target[last_key] = round(float(value), 3)
            prev = target.get(avg_key)
            if prev is None:
                target[avg_key] = round(float(value), 3)
            else:
                target[avg_key] = round(
                    alpha * float(value) + (1.0 - alpha) * float(prev),
                    3
                )

    def _metric_time_block(
        self,
        last_key: str,
        avg_key: str,
        fn,
        alpha: float = 0.2,
        extra: bool = False,
    ):
        """
        Executes fn() and updates execution time metrics (in ms).
        """
        t0 = time.perf_counter()
        try:
            return fn()
        finally:
            dt_ms = (time.perf_counter() - t0) * 1000.0
            self._metric_ema_update(last_key, avg_key, dt_ms, alpha=alpha, extra=extra)

    def _init_extra_metrics(self, defaults: dict) -> None:
        with self._metrics_lock:
            for k, v in defaults.items():
                self._extra_metrics.setdefault(k, v)