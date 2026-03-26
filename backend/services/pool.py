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


def _pool_evict(key: tuple) -> None:
    """Remove a stale entry from the pool so the next _pool_get opens a fresh connection."""
    with _pool_lock:
        entry = _pool.pop(key, None)
    if entry:
        conn, _ = entry
        with contextlib.suppress(Exception):
            conn.close()
