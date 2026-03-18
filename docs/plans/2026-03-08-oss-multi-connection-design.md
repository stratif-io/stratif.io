# OSS Multi-Connection Design

**Date:** 2026-03-08
**Status:** Approved

## Problem

The original OSS/SaaS split plan removed multi-connection management and replaced it with a single env-var DB config. The user wants to keep the ability to create and manage multiple database connections in the OSS version, backed by a local SQLite file — without requiring auth.

## Decision

Restore multi-connection management (Option A — minimal diff):

- Drop `users` table and `user_id` from all connection tables
- Keep credential encryption (Fernet, requires `STRATIFIO_ENCRYPTION_KEY`)
- No auth guard on connections API — dashboard is public/unprotected
- `get_analytics_db` resolves by `connection_id` query param → first connection → 503

## Backend Changes

### Schema (`backend/product_db/migrations.py`)

```sql
CREATE TABLE IF NOT EXISTS connections (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    db_type               TEXT NOT NULL,
    credentials_encrypted TEXT NOT NULL,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_schema_configs (
    id                      TEXT PRIMARY KEY,
    connection_id           TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    user_id_field           TEXT NOT NULL DEFAULT 'user_id',
    timestamp_field         TEXT NOT NULL DEFAULT 'timestamp',
    event_name_field        TEXT NOT NULL DEFAULT 'event_name',
    events_table            TEXT NOT NULL DEFAULT 'events',
    custom_properties       TEXT NOT NULL DEFAULT '[]',
    session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_filter_configs (
    id            TEXT PRIMARY KEY,
    connection_id TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    filter_fields TEXT NOT NULL DEFAULT '[]',
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

### Config (`backend/config.py`)

Add:
- `product_db_path: str = "./stratifio_product.sqlite"`
- `encryption_key: str = ""` (optional; warn if empty but don't crash)

### Files to restore

| File | Change |
|------|--------|
| `backend/product_db/__init__.py` | Restore, simplified (no users) |
| `backend/product_db/database.py` | Restore as-is |
| `backend/product_db/migrations.py` | Restore with simplified schema |
| `backend/services/crypto.py` | Restore as-is |
| `backend/api/connections.py` | Restore, remove all `user_id` references |
| `backend/services/connection_executor.py` | Restore `open_analytics_db(connection_id)` (no user_id) |
| `backend/main.py` | Add `init_product_db()` + `run_migrations()` to lifespan |

### `get_analytics_db` dependency

```python
async def get_analytics_db(connection_id: str | None = Query(None)):
    resolved_id = connection_id
    if not resolved_id:
        row = product_db.fetchone("SELECT id FROM connections ORDER BY created_at ASC LIMIT 1")
        if row:
            resolved_id = row["id"]
    if not resolved_id:
        raise HTTPException(503, "No analytics connection configured.")
    db = open_analytics_db(resolved_id)
    try:
        yield db
    finally:
        db.close()
```

## Frontend Changes

### Restore

- `frontend/features/connections/components/` — all connection UI components
- `frontend/features/connections/ConnectionsPage.tsx`
- `frontend/features/connections/ConnectionDetailPage.tsx`
- `frontend/components/layout/ConnectionSelector.tsx`
- Connections routes in `App.tsx`
- `ConnectionSelector` in `Header.tsx`

### Update

- `frontend/features/connections/hooks/useConnectionsData.ts` — replace stubs with real API calls
- `frontend/lib/api/queries.ts` — restore connections query functions

## Configuration

```env
STRATIFIO_ENCRYPTION_KEY=<openssl rand -base64 32>
STRATIFIO_PRODUCT_DB_PATH=./stratifio_product.sqlite
```

`STRATIFIO_ENCRYPTION_KEY` is required to store credentials. If not set, the server logs a warning and connection creation will fail gracefully.
