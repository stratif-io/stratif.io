# OSS Multi-Connection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore multi-connection management to the OSS build — users can create/manage several analytics database connections via a local SQLite file, without any auth requirement.

**Architecture:** The existing `backend/product_db/` (SQLite) is restored with a simplified schema: `connections`, `connection_schema_configs`, and `connection_filter_configs` tables — no `users` table, no `user_id` column. The connections API is restored without auth guards or user-scoping. The frontend connections UI is restored from git history. `get_analytics_db` resolves by `connection_id` query param → first connection → 503.

**Tech Stack:** FastAPI, SQLite (product DB), Fernet encryption (cryptography), React, TanStack Query v5

---

## Task 1: Restore `backend/product_db/`

**Files:**
- Create: `backend/product_db/__init__.py`
- Create: `backend/product_db/database.py`
- Create: `backend/product_db/migrations.py`

**Step 1: Create `backend/product_db/database.py`**

```python
"""SQLite database manager for the OpenFlow product database."""

import sqlite3
from contextlib import contextmanager

from backend.config import settings


class ProductDatabase:
    """Manages the SQLite product database (connections, configs)."""

    def __init__(self):
        self.db_path = settings.product_db_path

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def fetchall(self, query: str, params: tuple = ()) -> list[sqlite3.Row]:
        with self._conn() as conn:
            return conn.execute(query, params).fetchall()

    def fetchone(self, query: str, params: tuple = ()) -> sqlite3.Row | None:
        with self._conn() as conn:
            return conn.execute(query, params).fetchone()

    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._conn() as conn:
            return conn.execute(query, params)

    def executescript(self, script: str) -> None:
        with self._conn() as conn:
            conn.executescript(script)


_product_db: ProductDatabase | None = None


def get_product_db() -> ProductDatabase:
    global _product_db
    if _product_db is None:
        _product_db = ProductDatabase()
    return _product_db
```

**Step 2: Create `backend/product_db/migrations.py`**

```python
"""Database schema initialization for the OpenFlow product database."""

from backend.product_db.database import get_product_db

SCHEMA = """
CREATE TABLE IF NOT EXISTS connections (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    db_type               TEXT NOT NULL CHECK(db_type IN ('duckdb', 'databricks', 'postgresql', 'sqlite')),
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
"""


def init_product_db() -> None:
    db = get_product_db()
    import sqlite3
    conn = sqlite3.connect(db.db_path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
```

**Step 3: Create `backend/product_db/__init__.py`**

```python
"""Product database package."""

from .database import get_product_db, ProductDatabase
from .migrations import init_product_db

__all__ = ["get_product_db", "ProductDatabase", "init_product_db"]
```

**Step 4: Verify import works**

```bash
uv run python -c "from backend.product_db import get_product_db, init_product_db; print('ok')"
```

Expected: `ok`

**Step 5: Commit**

```bash
git add backend/product_db/
git commit -m "feat: restore product_db (no users, connection-only schema)"
```

---

## Task 2: Restore `backend/services/crypto.py`

**Files:**
- Create: `backend/services/crypto.py`

**Step 1: Create `backend/services/crypto.py`**

```python
"""Credential encryption/decryption using Fernet symmetric encryption."""

import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from backend.config import settings


def _get_fernet() -> Fernet:
    """Derive a valid 32-byte Fernet key from the configured encryption_key."""
    raw = settings.encryption_key.encode()
    key_bytes = hashlib.sha256(raw).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_credentials(credentials: dict[str, Any]) -> str:
    """Encrypt a credentials dict to a base64 token string."""
    plaintext = json.dumps(credentials).encode()
    return _get_fernet().encrypt(plaintext).decode()


def decrypt_credentials(token: str) -> dict[str, Any]:
    """Decrypt a credentials token back to a dict. Raises ValueError on failure."""
    try:
        plaintext = _get_fernet().decrypt(token.encode())
        return json.loads(plaintext)
    except (InvalidToken, json.JSONDecodeError) as exc:
        raise ValueError("Failed to decrypt credentials") from exc
```

**Step 2: Add `encryption_key` and `product_db_path` to `backend/config.py`**

Open `backend/config.py` and add these two fields to the `Settings` class:

```python
# Product DB (SQLite — stores connections and configs)
product_db_path: str = "./openflow_product.sqlite"

# Encryption key for credentials (required to store connections)
encryption_key: str = ""
```

**Step 3: Verify crypto works**

```bash
uv run python -c "
import os; os.environ['OPENFLOW_ENCRYPTION_KEY'] = 'test-key-32-chars-minimum-length!'
from backend.services.crypto import encrypt_credentials, decrypt_credentials
token = encrypt_credentials({'password': 'secret'})
result = decrypt_credentials(token)
assert result == {'password': 'secret'}
print('ok')
"
```

Expected: `ok`

**Step 4: Commit**

```bash
git add backend/services/crypto.py backend/config.py
git commit -m "feat: restore crypto.py and add product_db/encryption_key config"
```

---

## Task 3: Restore connections API (`backend/api/connections.py`)

**Files:**
- Modify: `backend/api/connections.py` (replace stub with full implementation)

This is a large file (~1400 lines in the original). The key changes from the original are:
- Remove `from backend.core.jwt_auth import AuthUserRow, get_current_auth_user`
- Remove all `current_user: Annotated[AuthUserRow, Depends(get_current_auth_user)]` parameters
- Remove all `user_id = current_user.id` lines
- Remove `user_id` from all SQL queries and INSERT statements
- Update `_get_connection_or_404(conn_id)` — no `user_id` arg

**Step 1: Write `backend/api/connections.py`**

```python
"""Connections API — manage database connections and their schema/filter configs."""

import json
import re
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator

from backend.product_db import get_product_db
from backend.services.crypto import decrypt_credentials, encrypt_credentials

router = APIRouter(prefix="/api/connections", tags=["connections"])

DbType = Literal["duckdb", "databricks", "postgresql", "sqlite"]

_PATH_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.]*$")


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get_connection_or_404(conn_id: str):
    db = get_product_db()
    row = db.fetchone("SELECT * FROM connections WHERE id = ?", (conn_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
    return row


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class CustomProperty(BaseModel):
    name: str
    path: str
    type: Literal["string", "number", "boolean", "timestamp"]

    @field_validator("path")
    @classmethod
    def validate_path(cls, v: str) -> str:
        if not _PATH_RE.match(v):
            raise ValueError("path must match ^[a-zA-Z_][a-zA-Z0-9_.]*$")
        return v

    model_config = {"extra": "ignore"}


class ConnectionCreate(BaseModel):
    name: str
    db_type: DbType
    credentials: dict[str, Any]


class ConnectionUpdate(BaseModel):
    name: str | None = None
    credentials: dict[str, Any] | None = None


class ConnectionResponse(BaseModel):
    id: str
    name: str
    db_type: str
    created_at: str
    updated_at: str


class SchemaConfigBody(BaseModel):
    user_id_field: str = "user_id"
    timestamp_field: str = "timestamp"
    event_name_field: str = "event_name"
    events_table: str = "events"
    custom_properties: list[CustomProperty] = []
    session_timeout_minutes: int = 30


class SchemaConfigResponse(SchemaConfigBody):
    id: str
    connection_id: str
    updated_at: str


class FilterField(BaseModel):
    field: str
    label: str
    icon: str = "filter"


class FilterConfigBody(BaseModel):
    filter_fields: list[FilterField] = []


class FilterConfigResponse(FilterConfigBody):
    id: str
    connection_id: str
    updated_at: str


# ---------------------------------------------------------------------------
# Connection CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ConnectionResponse])
async def list_connections():
    db = get_product_db()
    rows = db.fetchall(
        "SELECT id, name, db_type, created_at, updated_at FROM connections ORDER BY created_at DESC"
    )
    return [dict(r) for r in rows]


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(body: ConnectionCreate):
    db = get_product_db()
    conn_id = str(uuid.uuid4())
    now = _now()
    encrypted = encrypt_credentials(body.credentials)
    db.execute(
        "INSERT INTO connections (id, name, db_type, credentials_encrypted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (conn_id, body.name, body.db_type, encrypted, now, now),
    )
    return {"id": conn_id, "name": body.name, "db_type": body.db_type, "created_at": now, "updated_at": now}


@router.get("/{conn_id}", response_model=ConnectionResponse)
async def get_connection(conn_id: str):
    row = _get_connection_or_404(conn_id)
    return {"id": row["id"], "name": row["name"], "db_type": row["db_type"],
            "created_at": row["created_at"], "updated_at": row["updated_at"]}


@router.patch("/{conn_id}", response_model=ConnectionResponse)
async def update_connection(conn_id: str, body: ConnectionUpdate):
    row = _get_connection_or_404(conn_id)
    db = get_product_db()
    now = _now()
    name = body.name if body.name is not None else row["name"]
    encrypted = encrypt_credentials(body.credentials) if body.credentials is not None else row["credentials_encrypted"]
    db.execute(
        "UPDATE connections SET name = ?, credentials_encrypted = ?, updated_at = ? WHERE id = ?",
        (name, encrypted, now, conn_id),
    )
    return {"id": conn_id, "name": name, "db_type": row["db_type"], "created_at": row["created_at"], "updated_at": now}


@router.delete("/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(conn_id: str):
    _get_connection_or_404(conn_id)
    get_product_db().execute("DELETE FROM connections WHERE id = ?", (conn_id,))


@router.post("/{conn_id}/test")
async def test_connection(conn_id: str):
    from backend.services.connection_executor import open_analytics_db
    row = _get_connection_or_404(conn_id)
    try:
        db = open_analytics_db(conn_id)
        db.execute("SELECT 1")
        db.close()
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# Schema config
# ---------------------------------------------------------------------------

@router.get("/{conn_id}/schema", response_model=SchemaConfigResponse | None)
async def get_schema_config(conn_id: str):
    _get_connection_or_404(conn_id)
    row = get_product_db().fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        return None
    result = dict(row)
    result["custom_properties"] = json.loads(result["custom_properties"])
    return result


@router.put("/{conn_id}/schema", response_model=SchemaConfigResponse)
async def upsert_schema_config(conn_id: str, body: SchemaConfigBody):
    _get_connection_or_404(conn_id)
    db = get_product_db()
    now = _now()
    config_id = str(uuid.uuid4())
    custom_props_json = json.dumps([p.model_dump() for p in body.custom_properties])
    db.execute(
        """INSERT INTO connection_schema_configs
           (id, connection_id, user_id_field, timestamp_field, event_name_field,
            events_table, custom_properties, session_timeout_minutes, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(connection_id) DO UPDATE SET
             user_id_field = excluded.user_id_field,
             timestamp_field = excluded.timestamp_field,
             event_name_field = excluded.event_name_field,
             events_table = excluded.events_table,
             custom_properties = excluded.custom_properties,
             session_timeout_minutes = excluded.session_timeout_minutes,
             updated_at = excluded.updated_at""",
        (config_id, conn_id, body.user_id_field, body.timestamp_field,
         body.event_name_field, body.events_table, custom_props_json,
         body.session_timeout_minutes, now),
    )
    return {**body.model_dump(), "id": config_id, "connection_id": conn_id,
            "updated_at": now, "custom_properties": [p.model_dump() for p in body.custom_properties]}


# ---------------------------------------------------------------------------
# Filter config
# ---------------------------------------------------------------------------

@router.get("/{conn_id}/filters", response_model=FilterConfigResponse | None)
async def get_filter_config(conn_id: str):
    _get_connection_or_404(conn_id)
    row = get_product_db().fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        return None
    result = dict(row)
    result["filter_fields"] = json.loads(result["filter_fields"])
    return result


@router.put("/{conn_id}/filters", response_model=FilterConfigResponse)
async def upsert_filter_config(conn_id: str, body: FilterConfigBody):
    _get_connection_or_404(conn_id)
    db = get_product_db()
    now = _now()
    config_id = str(uuid.uuid4())
    fields_json = json.dumps([f.model_dump() for f in body.filter_fields])
    db.execute(
        """INSERT INTO connection_filter_configs (id, connection_id, filter_fields, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(connection_id) DO UPDATE SET
             filter_fields = excluded.filter_fields,
             updated_at = excluded.updated_at""",
        (config_id, conn_id, fields_json, now),
    )
    return {"id": config_id, "connection_id": conn_id,
            "filter_fields": [f.model_dump() for f in body.filter_fields], "updated_at": now}


# ---------------------------------------------------------------------------
# Filter options (live from analytics DB)
# ---------------------------------------------------------------------------

@router.get("/{conn_id}/filter-options")
async def get_filter_options(conn_id: str):
    from backend.services.connection_executor import open_analytics_db
    _get_connection_or_404(conn_id)
    db = open_analytics_db(conn_id)
    try:
        return db.get_filter_options()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Credentials (masked)
# ---------------------------------------------------------------------------

@router.get("/{conn_id}/credentials")
async def get_connection_credentials(conn_id: str):
    row = _get_connection_or_404(conn_id)
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
        return {"fields": {k: ("*" * 8 if "password" in k.lower() or "token" in k.lower() or "secret" in k.lower() else v)
                           for k, v in creds.items()}}
    except ValueError:
        raise HTTPException(500, "Failed to decrypt credentials")
```

**Step 2: Register router in `backend/api/__init__.py`**

Add `connections_router` back:

```python
from .connections import router as connections_router
```

And add `"connections_router"` to `__all__`.

**Step 3: Register in `backend/main.py`**

Import `connections_router` and add `app.include_router(connections_router)`.

**Step 4: Verify the route is registered**

```bash
uv run python -c "
from backend.main import app
routes = [r.path for r in app.routes if hasattr(r, 'path')]
assert any('/api/connections' in r for r in routes), routes
print('ok')
"
```

Expected: `ok`

**Step 5: Commit**

```bash
git add backend/api/connections.py backend/api/__init__.py backend/main.py
git commit -m "feat: restore connections CRUD API (no auth, no user_id)"
```

---

## Task 4: Update `connection_executor.py` and `main.py`

**Files:**
- Modify: `backend/services/connection_executor.py`
- Modify: `backend/main.py`

**Step 1: Restore `open_analytics_db(connection_id)` in `connection_executor.py`**

Add this function after `_pool_get` and related helpers (before `get_analytics_db`):

```python
def open_analytics_db(connection_id: str) -> AnalyticsDatabase:
    """Open a schema-mapped analytics DB for the given connection ID."""
    import json
    from backend.product_db import get_product_db
    from backend.services.crypto import decrypt_credentials

    product_db = get_product_db()

    row = product_db.fetchone("SELECT * FROM connections WHERE id = ?", (connection_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    db_type: str = row["db_type"]
    creds = decrypt_credentials(row["credentials_encrypted"])
    file_path: str = creds.get("file_path") or creds.get("s3_path", ":memory:")

    schema_row = product_db.fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?", (connection_id,)
    )
    uid_f = schema_row["user_id_field"] if schema_row else "user_id"
    ts_f = schema_row["timestamp_field"] if schema_row else "timestamp"
    en_f = schema_row["event_name_field"] if schema_row else "event_name"
    events_table = schema_row["events_table"] if schema_row and schema_row["events_table"] else "events"
    custom_props: list[dict] = json.loads(schema_row["custom_properties"]) if schema_row else []
    session_timeout_minutes: int = schema_row["session_timeout_minutes"] if schema_row and schema_row["session_timeout_minutes"] is not None else 30

    dialect = "postgres" if db_type == "postgresql" else db_type

    needs_remap = (uid_f != "user_id" or ts_f != "timestamp" or en_f != "event_name" or events_table != "events")

    custom_prop_exprs: dict[str, str] = {
        p["name"]: _resolve_path_to_sql(p["path"], dialect)
        for p in custom_props if "name" in p and "path" in p
    }

    filter_row = product_db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (connection_id,)
    )
    filter_fields: list[dict] = json.loads(filter_row["filter_fields"]) if filter_row else []

    _iq = "`" if dialect == "databricks" else '"'
    filter_exprs: dict[str, str] = {}
    _src_to_std_name = {uid_f: "user_id", ts_f: "timestamp", en_f: "event_name"}
    for ff in filter_fields:
        field = ff.get("field", "")
        if field in custom_prop_exprs:
            filter_exprs[field] = custom_prop_exprs[field]
        elif field in (uid_f, ts_f, en_f):
            filter_exprs[field] = _src_to_std_name[field] if needs_remap else f"{_iq}{field}{_iq}"

    shared_kwargs: dict = {
        "filter_fields": filter_fields,
        "filter_exprs": filter_exprs,
        "custom_props": custom_props,
        "custom_prop_exprs": custom_prop_exprs,
        "session_timeout_minutes": session_timeout_minutes,
    }

    def _build_cte(table: str) -> str:
        q = "`" if dialect == "databricks" else '"'
        quoted_table = ".".join(f"{q}{p}{q}" for p in table.split("."))
        core = f"{q}{uid_f}{q} AS user_id, {q}{ts_f}{q} AS timestamp, {q}{en_f}{q} AS event_name"
        remapped_src = {uid_f, ts_f, en_f}
        excl = ", ".join(f"{q}{c}{q}" for c in sorted(remapped_src))
        if dialect == "databricks":
            return f"(SELECT {core}, * EXCEPT ({excl}) FROM {quoted_table})"
        if dialect == "duckdb":
            return f"(SELECT {core}, * EXCLUDE ({excl}) FROM {quoted_table})"
        extra_cols = sorted({p["path"].split(".")[0] for p in custom_props if "path" in p} - remapped_src)
        extras = (", " + ", ".join(f"{q}{c}{q}" for c in extra_cols)) if extra_cols else ""
        return f"(SELECT {core}{extras} FROM {quoted_table})"

    if db_type == "postgresql":
        pool_key = (connection_id, "postgres")
        conn = _pool_get(pool_key, lambda: _open_pg(creds))
        events_cte = _build_cte(events_table) if needs_remap else None
        cols = _get_table_columns(conn, f'"{events_table}"', "postgres")
        db = AnalyticsDatabase(conn, dialect="postgres", events_cte=events_cte,
                               available_columns=cols or None, **shared_kwargs)
        db._pooled = True
        db._pool_key = pool_key
        return db

    if db_type == "databricks":
        pool_key = (connection_id, "databricks")
        conn = _pool_get(pool_key, lambda: _open_databricks(creds))
        events_cte = _build_cte(events_table) if needs_remap else None
        cols = _get_table_columns(conn, f'`{events_table}`', "databricks")
        db = AnalyticsDatabase(conn, dialect="databricks", events_cte=events_cte,
                               available_columns=cols or None, **shared_kwargs)
        db._pooled = True
        db._pool_key = pool_key
        return db

    if db_type == "sqlite":
        conn = _sqlite3.connect(file_path, check_same_thread=False)
        events_cte = _build_cte(events_table) if needs_remap else None
        cols = _get_table_columns(conn, f'"{events_table}"', "sqlite")
        return AnalyticsDatabase(conn, dialect="sqlite", events_cte=events_cte,
                                 available_columns=cols or None, **shared_kwargs)

    # DuckDB
    if file_path == ":memory:":
        conn = duckdb.connect(":memory:")
        return AnalyticsDatabase(conn, dialect="duckdb", events_cte=None, **shared_kwargs)
    conn = duckdb.connect(file_path, read_only=True)
    events_cte = _build_cte(events_table) if needs_remap else None
    cols = _get_table_columns(conn, f'"{events_table}"', "duckdb")
    return AnalyticsDatabase(conn, dialect="duckdb", events_cte=events_cte,
                             available_columns=cols or None, **shared_kwargs)


def _open_pg(creds: dict):
    import psycopg2
    return psycopg2.connect(
        host=creds["host"], port=creds.get("port", 5432),
        dbname=creds["database"], user=creds["user"], password=creds["password"],
    )


def _open_databricks(creds: dict):
    from databricks import sql as dbsql
    return dbsql.connect(
        server_hostname=creds["host"],
        http_path=creds["http_path"],
        access_token=creds["token"],
    )
```

**Step 2: Replace `get_analytics_db` with connection-aware version**

Replace the existing `get_analytics_db` at the bottom of `connection_executor.py`:

```python
async def get_analytics_db(
    connection_id: str | None = Query(None, description="Active connection ID"),
):
    """FastAPI dependency: yields the analytics DB for the active connection.

    Falls back to the first registered connection if no connection_id is given.
    """
    from backend.product_db import get_product_db

    resolved_id = connection_id
    if not resolved_id:
        product_db = get_product_db()
        row = product_db.fetchone(
            "SELECT id FROM connections ORDER BY created_at ASC LIMIT 1"
        )
        if row:
            resolved_id = row["id"]

    if not resolved_id:
        raise HTTPException(
            status_code=503, detail="No analytics connection configured."
        )

    db = open_analytics_db(resolved_id)
    try:
        yield db
    finally:
        db.close()
```

**Step 3: Update `backend/main.py` — add `init_product_db` to lifespan**

```python
from backend.product_db import init_product_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level, settings.log_format)
    init_product_db()
    await init_db()
    yield
```

**Step 4: Run backend tests**

```bash
uv run pytest backend/tests/ -v --tb=short
```

Expected: all tests pass (the conftest overrides `get_analytics_db` so no real product_db needed).

**Step 5: Commit**

```bash
git add backend/services/connection_executor.py backend/main.py
git commit -m "feat: restore open_analytics_db and connection-aware get_analytics_db"
```

---

## Task 5: Restore frontend connections feature

**Files:**
- Restore from git: `frontend/features/connections/` components
- Restore from git: `frontend/components/layout/ConnectionSelector.tsx`
- Modify: `frontend/features/connections/hooks/useConnectionsData.ts`
- Modify: `frontend/features/connections/index.ts`
- Modify: `frontend/lib/api/queries.ts`
- Modify: `frontend/App.tsx`
- Modify: `frontend/components/layout/Header.tsx`

**Step 1: Restore deleted files from git**

```bash
git checkout 614142d -- frontend/features/connections/ConnectionsPage.tsx
git checkout 614142d -- frontend/features/connections/ConnectionDetailPage.tsx
git checkout 614142d -- frontend/features/connections/components/ConnectionConfigTab.tsx
git checkout 614142d -- frontend/features/connections/components/ConnectionFormDialog.tsx
git checkout 614142d -- frontend/features/connections/components/ConnectionList.tsx
git checkout 614142d -- frontend/features/connections/components/FilterConfigTab.tsx
git checkout 614142d -- frontend/features/connections/components/SchemaConfigTab.tsx
git checkout 614142d -- frontend/features/connections/components/TableBrowserPicker.tsx
git checkout 614142d -- frontend/components/layout/ConnectionSelector.tsx
```

**Step 2: Restore `frontend/features/connections/hooks/useConnectionsData.ts` from git**

```bash
git show e0bacf6:src/features/connections/hooks/useConnectionsData.ts > frontend/features/connections/hooks/useConnectionsData.ts
```

Then update the imports — replace `from '@/features/auth'` or any auth references if present.

**Step 3: Restore `frontend/features/connections/index.ts`**

```ts
export { ConnectionsPage } from './ConnectionsPage'
export { ConnectionDetailPage } from './ConnectionDetailPage'
```

**Step 4: Restore connections queries in `frontend/lib/api/queries.ts`**

Append the connection query functions restored from the original (they were removed in Task 4):

```bash
git show e0bacf6:src/lib/api/queries.ts | grep -A 5 "fetchConnections\|fetchConnection\b\|createConnection\|updateConnection\|deleteConnection\|testConnection\|fetchSchemaConfig\|upsertSchemaConfig\|fetchFilterConfig\|upsertFilterConfig\|fetchFilterOptions\|fetchConnectionTables\|fetchSchemaDetect\|fetchConnectionString\|fetchConnectionCredentials" > /tmp/conn_queries.txt
```

Manually add back these fetch functions to `frontend/lib/api/queries.ts`. The functions call `/api/connections/*` endpoints using the existing `fetchApi` helper.

**Step 5: Add connections routes to `frontend/App.tsx`**

```tsx
const ConnectionsPage = lazy(() =>
  import('@/features/connections').then((m) => ({ default: m.ConnectionsPage }))
)
const ConnectionDetailPage = lazy(() =>
  import('@/features/connections').then((m) => ({ default: m.ConnectionDetailPage }))
)
```

And inside the `<Route element={<DashboardLayout />}>` block:

```tsx
<Route path="/connections" element={<ConnectionsPage />} />
<Route path="/connections/:id" element={<ConnectionDetailPage />} />
```

**Step 6: Restore `ConnectionSelector` in `frontend/components/layout/Header.tsx`**

Add import and render `<ConnectionSelector />` between hamburger and filters:

```tsx
import { ConnectionSelector } from './ConnectionSelector'

// Inside the header div, after the hamburger button:
<ConnectionSelector />
```

**Step 7: Update Sidebar — replace Settings nav item with Connections + Settings**

In `frontend/components/layout/Sidebar.tsx`, update the Configuration group:

```ts
{
  title: 'Configuration',
  icon: Settings,
  items: [
    { title: 'Connections', href: '/connections', icon: Database },
    { title: 'Settings', href: '/settings', icon: Settings },
  ],
},
```

And restore the `Database` import from lucide-react.

**Step 8: Build to check TypeScript**

```bash
npm run build
```

Expected: builds successfully, no TS errors.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: restore connections UI (ConnectionsPage, ConnectionSelector, hooks)"
```

---

## Task 6: Final verification

**Step 1: Run all frontend tests**

```bash
npm run test:run
```

Expected: 157 tests pass.

**Step 2: Run all backend tests**

```bash
uv run pytest backend/tests/ -v
```

Expected: 114 tests pass.

**Step 3: Full build**

```bash
npm run build
```

Expected: builds successfully.

**Step 4: Smoke test**

Start backend and frontend:

```bash
# Terminal 1
OPENFLOW_ENCRYPTION_KEY=$(openssl rand -base64 32) uv run serve

# Terminal 2
npm run dev
```

Open http://localhost:5173. The dashboard should load directly (no login). Navigate to Connections, create a DuckDB connection pointing to `./analytics.duckdb` (after running `uv run seed-duckdb`). The dashboard should then show data.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: final verification — OSS multi-connection complete"
```
