# Database Backends Plugin Design

**Date:** 2026-03-16
**Status:** Approved

## Problem

Database-specific branching (`if db_type == "postgresql":`, `if dialect == "sqlite":`) is scattered across multiple files:

- `backend/services/analytics_db.py` — connection opening, query execution, CTE building, table inspection
- `backend/services/pool.py` — connection error detection
- `backend/services/sql_builder.py` — SQL fragment generation (date_trunc, json_extract, etc.)
- `backend/api/connections/schema_detect.py` — schema introspection
- `backend/api/connections/browse.py` — table browsing

Adding a new database engine requires editing all of these files. The goal is to make databases pluggable: each engine lives in its own folder and implements a shared interface.

---

## Design

### Approach

Each database backend is a folder under `backend/backends/`. All backends implement a single `DatabaseBackend` Protocol. Credentials for each backend are validated with a Pydantic model. A registry maps `db_type` strings to backend instances.

---

## Folder Structure

```
backend/
  backends/
    __init__.py          ← registry: get_backend(db_type) → DatabaseBackend
    base.py              ← DatabaseBackend Protocol + SchemaInfo dataclass
    duckdb/
      __init__.py        ← DuckDBBackend(DatabaseBackend)
      credentials.py     ← DuckDBCredentials(BaseModel)
    postgresql/
      __init__.py        ← PostgreSQLBackend(DatabaseBackend)
      credentials.py     ← PostgreSQLCredentials(BaseModel)
    sqlite/
      __init__.py        ← SQLiteBackend(DatabaseBackend)
      credentials.py     ← SQLiteCredentials(BaseModel)
    databricks/
      __init__.py        ← DatabricksBackend(DatabaseBackend)
      credentials.py     ← DatabricksCredentials(BaseModel)
```

---

## The Protocol (`backends/base.py`)

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Protocol
from pydantic import BaseModel


@dataclass
class ColumnInfo:
    name: str
    type: str   # e.g. "VARCHAR", "BIGINT", "JSON"


@dataclass
class SchemaInfo:
    """Returned by detect_schema() — mirrors existing schema_detect response shape."""
    tables: list[str]
    events_table: str
    columns: list[ColumnInfo]  # preserves type info needed by _suggest_fields
    suggestions: dict          # e.g. {"user_id_field": "uid", ...}
    proposed_custom_properties: list[dict]


class DatabaseBackend(Protocol):

    # --- Identity ---
    @property
    def dialect_name(self) -> str:
        """Short dialect string used by sql_builder.py (e.g. 'postgres', not 'postgresql')."""
        ...

    # --- Credentials ---
    def parse_credentials(self, raw: dict) -> BaseModel: ...

    # --- Connection ---
    def open(self, credentials: BaseModel, read_only: bool = True) -> Any: ...
    @property
    def use_pool(self) -> bool: ...
    """True for postgres and databricks; False for duckdb and sqlite."""
    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple: ...
    """Stable hashable key for the connection pool (only called when use_pool() is True)."""
    def is_connection_error(self, exc: Exception) -> bool: ...

    # --- Table inspection ---
    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]: ...
    def table_exists(self, conn: Any, table_name: str) -> bool: ...
    def get_tables(self, conn: Any) -> list[str]: ...
    """Flat list of fully-qualified table names (used for simple listing)."""
    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]: ...
    """
    Hierarchical catalog browser — returns catalogs, schemas, or tables depending on args.
    - Databricks: catalog=None → list catalogs; schema=None → list schemas; else list tables.
    - PostgreSQL: catalog ignored; schema=None → list schemas; else list tables.
    - DuckDB: schema=None → list schemas (not a flat table list); else list tables.
    - SQLite: always returns flat table list (no schema/catalog concept).
    """
    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]: ...
    def detect_schema(self, conn: Any, events_table: str) -> SchemaInfo: ...

    # --- Query execution ---
    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]: ...

    # --- CTE helpers ---
    def build_events_cte(
        self,
        source_table: str,
        uid_field: str,
        ts_field: str,
        en_field: str,
        custom_props: list[dict],
    ) -> str:
        """
        Returns the CTE body `(SELECT ... FROM source_table)` remapping source field
        names to the standard user_id/timestamp/event_name aliases.
        DuckDB uses `* EXCLUDE`, Databricks uses `* EXCEPT`,
        Postgres/SQLite enumerate columns explicitly (requires custom_props for extras).
        """
        ...

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        """
        Wraps query with `WITH events AS <cte_body> ...`.
        SQLite does not support CTEs in all positions, so its implementation
        does a regex substitution on FROM/JOIN references instead.
        """
        ...

    # --- SQL fragments ---
    @property
    def identifier_quote_char(self) -> str:
        """The quote character for identifiers: '"' for most, '`' for Databricks/MySQL."""
        ...

    def date_trunc(self, unit: str, col: str) -> str: ...
    def date_diff_days(self, start: str, end: str) -> str: ...
    def epoch_diff_seconds(self, start: str, end: str) -> str: ...
    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str: ...
    def string_concat(self, *parts: str) -> str: ...
    def cast_to_text(self, expr: str) -> str: ...
    def json_extract_string(self, col: str, key: str) -> str: ...
    def extract_hour(self, col: str) -> str: ...
    def extract_day_of_week(self, col: str) -> str: ...
    def extract_year(self, col: str) -> str: ...
    def extract_month(self, col: str) -> str: ...
    def extract_week(self, col: str) -> str: ...
    def extract_quarter(self, col: str) -> str: ...
```

---

## Registry (`backends/__init__.py`)

```python
from backend.backends.base import DatabaseBackend
from backend.backends.duckdb import DuckDBBackend
from backend.backends.postgresql import PostgreSQLBackend
from backend.backends.sqlite import SQLiteBackend
from backend.backends.databricks import DatabricksBackend

_REGISTRY: dict[str, DatabaseBackend] = {
    "duckdb":      DuckDBBackend(),
    "postgresql":  PostgreSQLBackend(),
    "sqlite":      SQLiteBackend(),
    "databricks":  DatabricksBackend(),
}


def get_backend(db_type: str) -> DatabaseBackend:
    if db_type not in _REGISTRY:
        raise ValueError(f"Unsupported db_type: {db_type!r}")
    return _REGISTRY[db_type]
```

---

## Credentials (one per backend)

Each backend folder defines a Pydantic model for its credentials.

```python
# backends/duckdb/credentials.py
class DuckDBCredentials(BaseModel):
    file_path: str | None = None
    s3_path: str | None = None   # DuckDB can read from S3

    @model_validator(mode="after")
    def require_path(self) -> "DuckDBCredentials":
        if not self.file_path and not self.s3_path:
            raise ValueError("DuckDB connection requires file_path or s3_path")
        return self

# backends/sqlite/credentials.py
class SQLiteCredentials(BaseModel):
    file_path: str

# backends/postgresql/credentials.py
class PostgreSQLCredentials(BaseModel):
    host: str
    port: int = 5432
    database: str
    user: str
    password: str
    sslmode: str | None = None   # e.g. "require", "verify-full"

# backends/databricks/credentials.py
class DatabricksCredentials(BaseModel):
    host: str
    http_path: str
    token: str
```

---

## `dialect_name` values

Each backend's `dialect_name` property returns the string that `sql_builder.py` and `views.py` currently expect:

| `db_type` (API/DB) | `dialect_name` (internal) |
|--------------------|--------------------------|
| `"duckdb"`         | `"duckdb"`               |
| `"postgresql"`     | `"postgres"`             |
| `"sqlite"`         | `"sqlite"`               |
| `"databricks"`     | `"databricks"`           |

This preserves backward compatibility with all `sql_builder` callers and `db.get_dialect()` usages.

---

## Changes to Existing Files

### `services/analytics_db.py`

`open_analytics_db()` replaces the `if db_type == X` chain:

```python
def open_analytics_db(connection_id: str) -> AnalyticsDatabase:
    ...
    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")

    credentials = backend.parse_credentials(creds)

    if backend.use_pool():
        pool_key = backend.pool_key(connection_id, credentials)
        conn = _pool_get(pool_key, lambda: backend.open(credentials, read_only=False))
        pooled = True
    else:
        conn = backend.open(credentials, read_only=True)
        pooled = False

    events_cte = backend.build_events_cte(...) if needs_remap else None
    cols = backend.get_table_columns(conn, events_table)
    db = AnalyticsDatabase(conn, backend, events_cte=events_cte, ...)
    db._pooled = pooled
    db._pool_key = pool_key if pooled else None
    return db
```

`AnalyticsDatabase.__init__` replaces `dialect: str` with `backend: DatabaseBackend`:

```python
class AnalyticsDatabase:
    def __init__(self, conn, backend: DatabaseBackend, ...):
        self._backend = backend
        ...

    def execute(self, query, params=None):
        if self._events_cte:
            query = self._backend.prepend_events_cte(self._events_cte, query)
        ...
        return self._backend.execute(self._conn, query, params)

    def get_dialect(self) -> str:
        return self._backend.dialect_name   # backward compat for views.py etc.

    def table_exists(self, table_name: str) -> bool:
        return self._backend.table_exists(self._conn, table_name)
```

Private helpers `_get_table_columns`, `_prepend_events_cte`, `_build_cte`, `_open_pg`, `_open_databricks` are deleted from this file — their logic moves into the respective backend classes.

### `services/pool.py`

`_is_connection_error(exc, dialect)` is removed. Each backend implements `is_connection_error(exc)`. `_pool_get` and pool state remain here (they are engine-agnostic).

### `services/sql_builder.py`

**Not changed during this refactor.** All functions retain their `dialect` string parameter. Existing callers (`views.py`, `path_analyzer.py`, API files) continue to call `date_trunc(unit, col, dialect)` where `dialect = db.get_dialect()`. The new `backend.*` SQL fragment methods are the preferred path for new code and incremental migration. `sql_builder.py` can be deprecated and removed in a future step once all callers migrate.

### `api/connections/schema_detect.py`

```python
try:
    backend = get_backend(db_type)
except ValueError:
    raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")

credentials = backend.parse_credentials(creds)
conn = backend.open(credentials, read_only=True)
try:
    info = backend.detect_schema(conn, events_table)
finally:
    conn.close()
# info is a SchemaInfo dataclass — map to existing response shape
```

### `api/connections/browse.py`

```python
try:
    backend = get_backend(db_type)
except ValueError:
    raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")

credentials = backend.parse_credentials(creds)

if backend.use_pool:
    pool_key = backend.pool_key(connection_id, credentials)
    conn = _pool_get(pool_key, lambda: backend.open(credentials, read_only=False))
    try:
        items = backend.browse(conn, catalog=request.catalog, schema=request.schema)
    except Exception:
        raise
else:
    conn = backend.open(credentials, read_only=True)
    try:
        items = backend.browse(conn, catalog=request.catalog, schema=request.schema)
    finally:
        conn.close()
```

Pooled backends (PostgreSQL, Databricks) reuse the connection pool — browse requests do not pay the connection establishment cost on every call. Non-pooled backends (DuckDB, SQLite) open and close per request as before.

The `browse()` method handles the full hierarchical drill-down (Databricks: catalogs → schemas → tables; PostgreSQL: schemas → tables; DuckDB: schemas → tables; SQLite: flat table list). This replaces all `if db_type == X` branching in the current file.

---

## Adding a New Backend

1. Create `backend/backends/<engine>/` folder.
2. Add `credentials.py` with a Pydantic model for connection parameters.
3. Add `__init__.py` implementing all methods of `DatabaseBackend`.
4. Register it in `backends/__init__.py`.
5. Add `db_type` to `DbType` Literal in `api/connections/models.py`.

No other files need to change.

---

## Implementation Notes

- **`use_pool` and `identifier_quote_char`** should be `@property` on each backend class, consistent with `dialect_name`.
- **`PostgreSQLCredentials.sslmode`** is declared but not currently wired in `_open_pg`. `PostgreSQLBackend.open()` must pass `sslmode` to `psycopg2.connect()` when provided.
- **Dual-maintenance window**: until all callers migrate from `sql_builder.py` functions to `backend.*` methods, both implementations of the same SQL fragment logic will coexist. Bugs in one must be fixed in both. Aim to complete migration and remove `sql_builder.py` in a follow-up.

---

## What Does NOT Change

- `AnalyticsDatabase` public API (`execute`, `get_dialect`, `table_exists`, `build_filter_clauses`, etc.) — callers are unaffected.
- `DbType` Literal in `api/connections/models.py` — still validates allowed values at the API boundary.
- `services/sql_builder.py` — kept as-is; deprecated for new code but not removed in this step.
- `services/pool.py` — `_pool_get` and pool state remain; only `_is_connection_error` is removed.
