"""Connection pool for long-lived analytics database connections (Databricks, PostgreSQL)."""

import contextlib
import threading
import time
from collections.abc import Callable
from typing import Any

_POOL_TTL = 600
# { key: (conn, created_at, metadata) }
# metadata stores per-connection derived state (e.g. col_types) so callers
# can skip expensive re-derivation on every request.
_pool: dict[tuple, tuple[Any, float, dict]] = {}
_pool_lock = threading.Lock()


def _pool_get(key: tuple, factory: Callable[[], Any]) -> tuple[Any, dict]:
    """Return (conn, metadata).

    On a cache hit the existing conn and its stored metadata are returned.
    On a miss or TTL expiry a new conn is opened and metadata starts empty.
    Use _pool_set_meta to persist derived state after the first open.
    """
    with _pool_lock:
        entry = _pool.get(key)
        if entry:
            conn, created_at, meta = entry
            if time.monotonic() - created_at < _POOL_TTL:
                return conn, meta
            with contextlib.suppress(Exception):
                conn.close()
        conn = factory()
        _pool[key] = (conn, time.monotonic(), {})
        return conn, {}


def _pool_set_meta(key: tuple, meta: dict) -> None:
    """Attach metadata to an existing pool entry (no-op if entry was evicted)."""
    with _pool_lock:
        entry = _pool.get(key)
        if entry:
            conn, created_at, _ = entry
            _pool[key] = (conn, created_at, meta)


def _pool_evict(key: tuple) -> None:
    """Remove a stale entry from the pool so the next _pool_get opens a fresh connection."""
    with _pool_lock:
        entry = _pool.pop(key, None)
    if entry:
        conn, _, _meta = entry
        with contextlib.suppress(Exception):
            conn.close()
