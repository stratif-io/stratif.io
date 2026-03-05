# Wave 3 Design: Connection Guard + Stale Connection Handling

## Problem

Two related issues in the backend connection layer:

1. Every API endpoint has a copy-pasted `if db: ... else: raise ValueError("db cannot be None")` guard. This is boilerplate that obscures the actual endpoint logic and gives a poor error if triggered.

2. Pooled Databricks/PostgreSQL connections can go stale (network drop, server restart, idle timeout). When this happens, `execute()` throws a low-level driver exception with no useful message and no recovery — the pool entry stays poisoned until TTL expires.

## Fix 1: Remove `if db: ... else: raise ValueError`

**Change:** `get_analytics_db` currently `yield None` when no connection is configured. Replace with `raise HTTPException(503, "No analytics connection configured")`.

**Impact:**
- All endpoint signatures: `AnalyticsDatabase | None` → `AnalyticsDatabase`
- All `if db: ... else: raise ValueError(...)` blocks collapse to just their body
- ~12 endpoints simplified

## Fix 2: Stale Connection Detection + Graceful 503

**Stale connection types per dialect:**
- Databricks: `databricks.sql.exc.Error` (base class covers all driver errors)
- PostgreSQL: `psycopg2.OperationalError`, `psycopg2.InterfaceError`

**Mechanism:**
- `AnalyticsDatabase` stores `_pool_key: tuple | None` — the `(connection_id, user_id, dialect)` key used by the pool
- `execute()` wraps the driver call in try/except for the above types
- On match, if `_pooled=True`: call `evict_connection()` with the stored pool key, then raise `HTTPException(503, detail="Connection lost — please retry")`
- Pool is evicted synchronously; next request reconnects fresh

**User experience:** Clear "please retry" message. No silent failure, no cryptic stack trace.

## What Does Not Change

- DuckDB and SQLite are unaffected (not pooled, errors propagate normally)
- Pool TTL and `evict_connection()` public API unchanged
- No credentials stored on `AnalyticsDatabase`
