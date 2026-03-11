"""Connection pool for long-lived analytics database connections (Databricks, PostgreSQL)."""

import contextlib
import threading
import time
from collections.abc import Callable
from typing import Any

_POOL_TTL = 600
_pool: dict[tuple, tuple[Any, float]] = {}
_pool_lock = threading.Lock()


def _pool_get(key: tuple, factory: Callable[[], Any]) -> Any:
    with _pool_lock:
        entry = _pool.get(key)
        if entry:
            conn, created_at = entry
            if time.monotonic() - created_at < _POOL_TTL:
                return conn
            with contextlib.suppress(Exception):
                conn.close()
        conn = factory()
        _pool[key] = (conn, time.monotonic())
        return conn


def _is_connection_error(exc: Exception, dialect: str) -> bool:
    if dialect == "databricks":
        try:
            from databricks.sql.exc import Error as _DatabricksError
            if isinstance(exc, _DatabricksError):
                return True
        except ImportError:
            pass
    if dialect == "postgres":
        try:
            import psycopg2
            if isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError)):
                return True
        except ImportError:
            pass
    return False
