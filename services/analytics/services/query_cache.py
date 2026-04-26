"""In-memory TTL cache for analytics query results.

Keyed per-connection so that different connections never share cached data.
Entries expire after TTL_SECONDS (default 5 minutes).

Usage::

    import services.analytics.services.query_cache as query_cache

    result = query_cache.get(db.connection_id, "mc_metric", metric, start_date, end_date, filters)
    if result is None:
        result = expensive_query(...)
        query_cache.set(db.connection_id, result, "mc_metric", metric, start_date, end_date, filters)

    # On schema config save, evict stale entries for that connection:
    query_cache.invalidate(connection_id)
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

TTL_SECONDS: int = 5 * 60  # 5 minutes

# { connection_id: { digest: (value, expires_at_monotonic) } }
_store: dict[str, dict[str, tuple[Any, float]]] = {}


def _digest(*parts: Any) -> str:
    raw = json.dumps(parts, default=str, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def get(connection_id: str, *parts: Any) -> Any | None:
    """Return cached value or None if missing/expired."""
    bucket = _store.get(connection_id)
    if bucket is None:
        return None
    key = _digest(*parts)
    entry = bucket.get(key)
    if entry is None:
        return None
    value, exp = entry
    if time.monotonic() > exp:
        bucket.pop(key, None)
        return None
    return value


def set(connection_id: str, value: Any, *parts: Any, ttl: int = TTL_SECONDS) -> None:  # noqa: A001
    """Store value under (connection_id, *parts) with the given TTL in seconds."""
    bucket = _store.setdefault(connection_id, {})
    key = _digest(*parts)
    bucket[key] = (value, time.monotonic() + ttl)


def invalidate(connection_id: str) -> None:
    """Evict all cached entries for a connection (call after schema config changes)."""
    _store.pop(connection_id, None)
