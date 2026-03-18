# Database Backends Plugin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all scattered `if db_type == X` / `if dialect == X` branches with a plugin system where each database engine is a self-contained folder under `backend/backends/`.

**Architecture:** Each backend implements the `DatabaseBackend` Protocol (connection, execution, SQL fragments, schema/browse). A registry maps `db_type` strings to backend instances. `AnalyticsDatabase` stores a `backend` instead of a `dialect` string and delegates all engine-specific work to it. `sql_builder.py` is kept as-is but deprecated.

**Tech Stack:** Python 3.12, FastAPI, DuckDB, psycopg2, sqlite3, databricks-sql-connector, pydantic v2, pytest

**Worktree:** `.worktrees/db-backends-plugin`
**Run tests from:** `cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/db-backends-plugin && uv run pytest backend/tests/ -q`
**Spec:** `docs/superpowers/specs/2026-03-16-database-backends-plugin-design.md`

---

## Chunk 1: Protocol, shared utils, and DuckDB backend

### Task 1: Base Protocol, shared types, and shared helpers

**Files:**
- Create: `backend/backends/__init__.py`
- Create: `backend/backends/base.py`
- Create: `backend/backends/_utils.py`

- [ ] **Step 1.1: Create the empty registry stub**

Create `backend/backends/__init__.py`:

```python
"""Database backend registry."""
from __future__ import annotations

from backend.backends.base import DatabaseBackend

_REGISTRY: dict[str, "DatabaseBackend"] = {}


def get_backend(db_type: str) -> "DatabaseBackend":
    if db_type not in _REGISTRY:
        raise ValueError(f"Unsupported db_type: {db_type!r}")
    return _REGISTRY[db_type]


def _register(db_type: str, backend: "DatabaseBackend") -> None:
    _REGISTRY[db_type] = backend
```

- [ ] **Step 1.2: Create `backends/base.py` with Protocol and dataclasses**

Create `backend/backends/base.py`:

```python
"""DatabaseBackend Protocol and shared data types."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel


@dataclass
class ColumnInfo:
    """One column returned by detect_schema()."""
    name: str
    type: str  # raw SQL type string, e.g. "VARCHAR", "BIGINT"


@dataclass
class SchemaInfo:
    """Full schema detection result — mirrors the existing API response shape."""
    tables: list[str]
    events_table: str
    columns: list[ColumnInfo]
    suggestions: dict
    proposed_custom_properties: list[dict]


@runtime_checkable
class DatabaseBackend(Protocol):
    """Interface that every database backend must implement."""

    @property
    def dialect_name(self) -> str: ...

    @property
    def identifier_quote_char(self) -> str: ...

    @property
    def use_pool(self) -> bool: ...

    def parse_credentials(self, raw: dict) -> BaseModel: ...
    def open(self, credentials: BaseModel, read_only: bool = True) -> Any: ...
    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple: ...
    def is_connection_error(self, exc: Exception) -> bool: ...
    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]: ...
    def table_exists(self, conn: Any, table_name: str) -> bool: ...
    def get_tables(self, conn: Any) -> list[str]: ...
    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]: ...
    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]: ...
    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo: ...
    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]: ...
    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str: ...
    def prepend_events_cte(self, cte_body: str, query: str) -> str: ...
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

- [ ] **Step 1.3: Create `backends/_utils.py` with shared helpers**

These helpers are used by all four backends' `detect_schema` implementations. They live here rather than in `duckdb/__init__.py` to avoid cross-backend coupling.

Create `backend/backends/_utils.py`:

```python
"""Shared helpers for backend schema detection."""
from __future__ import annotations

from backend.backends.base import ColumnInfo

_KNOWN_USER_ID = ("user_id", "userid", "user", "account_id", "customer_id", "uid")
_KNOWN_TIMESTAMP = ("timestamp", "ts", "created_at", "event_time", "time", "datetime", "date")
_KNOWN_EVENT_NAME = ("event_name", "event", "action", "event_type", "name", "type")


def pick_events_table(tables: list[str], hint: str | None) -> str | None:
    if hint and hint in tables:
        return hint
    return next(
        (t for t in tables if t.lower() in ("events", "event", "analytics")),
        tables[0] if tables else None,
    )


def suggest_fields(columns: list[ColumnInfo]) -> dict:
    col_lower = {c.name.lower(): c.name for c in columns}
    suggestions: dict = {}
    for candidate in _KNOWN_USER_ID:
        if candidate in col_lower:
            suggestions["user_id_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_TIMESTAMP:
        if candidate in col_lower:
            suggestions["timestamp_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_EVENT_NAME:
        if candidate in col_lower:
            suggestions["event_name_field"] = col_lower[candidate]
            break
    return suggestions


def infer_type(sql_type: str) -> str:
    t = sql_type.upper()
    if any(x in t for x in ("INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "REAL",
                             "HUGEINT", "BIGINT", "SMALLINT", "TINYINT")):
        return "number"
    if "BOOL" in t:
        return "boolean"
    if any(x in t for x in ("TIMESTAMP", "DATE", "TIME")):
        return "timestamp"
    return "string"
```

- [ ] **Step 1.4: Verify no import errors**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/db-backends-plugin
uv run python -c "from backend.backends.base import DatabaseBackend, SchemaInfo, ColumnInfo; from backend.backends._utils import pick_events_table, suggest_fields, infer_type; print('OK')"
```

Expected: `OK`

- [ ] **Step 1.5: Commit**

```bash
git add backend/backends/
git commit -m "feat: add DatabaseBackend Protocol, shared types, and shared helpers"
```

---

### Task 2: DuckDB backend

**Files:**
- Create: `backend/backends/duckdb/__init__.py`
- Create: `backend/backends/duckdb/credentials.py`
- Create: `backend/tests/test_backends_duckdb.py`

- [ ] **Step 2.1: Write failing tests for DuckDB backend**

Create `backend/tests/test_backends_duckdb.py`:

```python
"""Tests for the DuckDB database backend."""
import duckdb
import pytest

from backend.backends.duckdb import DuckDBBackend
from backend.backends.duckdb.credentials import DuckDBCredentials
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return DuckDBBackend()


@pytest.fixture
def mem_conn():
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR, timestamp TIMESTAMP, event_name VARCHAR, properties VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('u1', '2024-01-01 10:00:00', 'PageView', '{"device":"mobile"}'),
            ('u2', '2024-01-02 11:00:00', 'Purchase', NULL)
    """)
    yield conn
    conn.close()


class TestDuckDBBackendIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "duckdb"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_false(self, backend):
        assert backend.use_pool is False

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestDuckDBCredentials:
    def test_file_path_valid(self):
        c = DuckDBCredentials(file_path="/tmp/test.duckdb")
        assert c.file_path == "/tmp/test.duckdb"

    def test_s3_path_valid(self):
        c = DuckDBCredentials(s3_path="s3://bucket/db.duckdb")
        assert c.s3_path == "s3://bucket/db.duckdb"

    def test_neither_path_raises(self):
        with pytest.raises(Exception):
            DuckDBCredentials()

    def test_parse_credentials_file_path(self, backend):
        creds = backend.parse_credentials({"file_path": "/tmp/test.duckdb"})
        assert isinstance(creds, DuckDBCredentials)
        assert creds.file_path == "/tmp/test.duckdb"

    def test_parse_credentials_s3(self, backend):
        creds = backend.parse_credentials({"s3_path": "s3://bucket/db.duckdb"})
        assert isinstance(creds, DuckDBCredentials)
        assert creds.s3_path == "s3://bucket/db.duckdb"


class TestDuckDBExecution:
    def test_execute_returns_rows(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT COUNT(*) FROM events", None)
        assert rows == [(2,)]

    def test_execute_with_params(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT user_id FROM events WHERE event_name = ?", ["Purchase"])
        assert rows == [("u2",)]

    def test_table_exists_true(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "events") is True

    def test_table_exists_false(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "nonexistent") is False

    def test_get_table_columns(self, backend, mem_conn):
        cols = backend.get_table_columns(mem_conn, '"events"')
        assert "user_id" in cols
        assert "timestamp" in cols

    def test_get_table_columns_bad_table_returns_empty(self, backend, mem_conn):
        cols = backend.get_table_columns(mem_conn, '"nope"')
        assert cols == frozenset()

    def test_get_tables(self, backend, mem_conn):
        tables = backend.get_tables(mem_conn)
        assert "events" in tables

    def test_get_columns_for_browse(self, backend, mem_conn):
        cols = backend.get_columns_for_browse(mem_conn, "events")
        assert "user_id" in cols

    def test_is_connection_error_false_for_unrelated(self, backend):
        assert backend.is_connection_error(ValueError("nope")) is False


class TestDuckDBBrowse:
    def test_browse_schema_none_returns_schemas(self, backend, mem_conn):
        items = backend.browse(mem_conn, catalog=None, schema=None)
        names = [i["name"] for i in items]
        assert "main" in names
        assert all(i["kind"] == "schema" for i in items)

    def test_browse_with_schema_returns_tables(self, backend, mem_conn):
        items = backend.browse(mem_conn, catalog=None, schema="main")
        names = [i["name"] for i in items]
        assert "events" in names
        assert all(i["kind"] == "table" for i in items)


class TestDuckDBDetectSchema:
    def test_detect_schema_finds_events_table(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.events_table == "events"
        assert len(info.columns) > 0

    def test_detect_schema_columns_have_name_and_type(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        col_names = [c.name for c in info.columns]
        assert "user_id" in col_names
        assert all(c.type for c in info.columns)  # type is non-empty

    def test_detect_schema_suggests_standard_fields(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.suggestions.get("user_id_field") == "user_id"
        assert info.suggestions.get("timestamp_field") == "timestamp"

    def test_detect_schema_hint_selects_table(self, backend, mem_conn):
        mem_conn.execute("CREATE TABLE other_table (id INTEGER)")
        info = backend.detect_schema(mem_conn, "other_table")
        assert info.events_table == "other_table"


class TestDuckDBCTE:
    def test_build_events_cte_with_remap(self, backend):
        cte = backend.build_events_cte(
            source_table="raw_events",
            uid_field="uid",
            ts_field="ts",
            en_field="action",
            custom_props=[],
        )
        assert "uid" in cte
        assert "user_id" in cte
        assert "EXCLUDE" in cte  # DuckDB uses EXCLUDE

    def test_prepend_events_cte_wraps_query(self, backend):
        cte_body = "(SELECT * FROM raw)"
        query = "SELECT COUNT(*) FROM events"
        result = backend.prepend_events_cte(cte_body, query)
        assert result.startswith("WITH events AS")
        assert "SELECT COUNT(*) FROM events" in result

    def test_prepend_events_cte_appends_to_existing_with(self, backend):
        cte_body = "(SELECT * FROM raw)"
        query = "WITH x AS (SELECT 1) SELECT * FROM events JOIN x ON true"
        result = backend.prepend_events_cte(cte_body, query)
        assert "events AS" in result
        assert "x AS" in result


class TestDuckDBSQLFragments:
    def test_date_trunc_day(self, backend):
        assert backend.date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"

    def test_date_diff_days(self, backend):
        assert "date_diff" in backend.date_diff_days("a", "b").lower()

    def test_epoch_diff_seconds(self, backend):
        assert "EPOCH" in backend.epoch_diff_seconds("a", "b").upper()

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "30" in result and "INTERVAL" in result.upper()

    def test_string_concat(self, backend):
        assert backend.string_concat("a", "b") == "a || b"

    def test_cast_to_text(self, backend):
        assert backend.cast_to_text("x") == "CAST(x AS TEXT)"

    def test_json_extract_string_simple(self, backend):
        result = backend.json_extract_string("properties", "device")
        assert "properties" in result and "device" in result

    def test_json_extract_string_nested(self, backend):
        result = backend.json_extract_string("props", "a.b")
        assert "props" in result and "a" in result and "b" in result

    def test_extract_hour(self, backend):
        assert "HOUR" in backend.extract_hour("ts").upper()

    def test_extract_day_of_week(self, backend):
        result = backend.extract_day_of_week("ts")
        assert "DAYOFWEEK" in result.upper() or "DOW" in result.upper()

    def test_extract_year(self, backend):
        assert "YEAR" in backend.extract_year("ts").upper()

    def test_extract_month(self, backend):
        assert "MONTH" in backend.extract_month("ts").upper()

    def test_extract_week(self, backend):
        assert "WEEK" in backend.extract_week("ts").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()
```

- [ ] **Step 2.2: Run tests to confirm they fail**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/db-backends-plugin
uv run pytest backend/tests/test_backends_duckdb.py -q 2>&1 | head -5
```

Expected: `ModuleNotFoundError` — `DuckDBBackend` does not exist yet.

- [ ] **Step 2.3: Create DuckDB credentials model**

Create `backend/backends/duckdb/credentials.py`:

```python
"""Credentials model for DuckDB connections."""
from pydantic import BaseModel, model_validator


class DuckDBCredentials(BaseModel):
    file_path: str | None = None
    s3_path: str | None = None

    @model_validator(mode="after")
    def require_path(self) -> "DuckDBCredentials":
        if not self.file_path and not self.s3_path:
            raise ValueError("DuckDB connection requires file_path or s3_path")
        return self

    @property
    def resolved_path(self) -> str:
        return self.file_path or self.s3_path or ""
```

- [ ] **Step 2.4: Create DuckDB backend**

Create `backend/backends/duckdb/__init__.py`:

```python
"""DuckDB database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

import duckdb
from pydantic import BaseModel

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.duckdb.credentials import DuckDBCredentials

_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


class DuckDBBackend:
    """Implements DatabaseBackend for DuckDB (file or S3 paths)."""

    @property
    def dialect_name(self) -> str:
        return "duckdb"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return False

    def parse_credentials(self, raw: dict) -> DuckDBCredentials:
        return DuckDBCredentials.model_validate(raw)

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        creds = DuckDBCredentials.model_validate(credentials.model_dump())
        return duckdb.connect(creds.resolved_path, read_only=read_only)

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "duckdb")

    def is_connection_error(self, exc: Exception) -> bool:
        return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            rel = conn.execute(f"SELECT * FROM {table_expr} LIMIT 0")
            return frozenset(d[0] for d in rel.description)
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            conn.execute(f'SELECT 1 FROM "{table_name}" LIMIT 1')
            return True
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        rows = conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY 1"
        ).fetchall()
        return [r[0] for r in rows]

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            rel = conn.execute(f'SELECT * FROM "{table}" LIMIT 0')
            return [d[0] for d in rel.description]
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        if schema is None:
            rows = conn.execute(
                "SELECT schema_name FROM information_schema.schemata ORDER BY 1"
            ).fetchall()
            return [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in rows]
        rows = conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY 1",
            [schema],
        ).fetchall()
        return [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in rows]

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables_result = conn.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main' ORDER BY table_name"
        ).fetchall()
        tables = [r[0] for r in tables_result]

        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])

        columns_result = conn.execute(f'DESCRIBE "{events_table}"').fetchall()
        columns = [ColumnInfo(name=r[0], type=r[1]) for r in columns_result]

        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            if any(t in sql_type for t in ("JSON", "BLOB", "STRUCT", "MAP")):
                try:
                    keys_result = conn.execute(
                        f'SELECT DISTINCT unnest(json_keys("{events_table}"."{col.name}")) '
                        f'FROM "{events_table}" WHERE "{col.name}" IS NOT NULL LIMIT 2000'
                    ).fetchall()
                    for (key,) in keys_result:
                        if key:
                            proposed.append({"name": key, "path": f"{col.name}.{key}", "type": "string"})
                except Exception:
                    proposed.append({"name": col.name, "path": col.name, "type": "string"})
            else:
                proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})

        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        if params:
            return conn.execute(query, params).fetchall()
        return conn.execute(query).fetchall()

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = '"'
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f'{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name'
        remapped_src = {uid_field, ts_field, en_field}
        excl = ", ".join(f"{q}{c}{q}" for c in sorted(remapped_src))
        return f"(SELECT {core}, * EXCLUDE ({excl}) FROM {quoted_table})"

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        q = query.strip()
        cte_def = f"events AS {cte_body}"
        m = re.match(r"(with\s+)", q, re.IGNORECASE)
        if m:
            return q[: m.end()] + cte_def + ", " + q[m.end():]
        return f"WITH {cte_def} {q}"

    def date_trunc(self, unit: str, col: str) -> str:
        return f"DATE_TRUNC('{unit}', {col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"DATE_DIFF('day', {start}, {end})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"EXTRACT(EPOCH FROM ({end} - {start}))"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"{later} - {earlier} > INTERVAL '{minutes} minutes'"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"CAST({expr} AS TEXT)"

    def json_extract_string(self, col: str, key: str) -> str:
        parts = key.split(".")
        json_path = "$." + ".".join(parts)
        return f"json_extract_string({col}, '{json_path}')"

    def extract_hour(self, col: str) -> str:
        return f"CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)"

    def extract_day_of_week(self, col: str) -> str:
        return f"CAST(EXTRACT(DAYOFWEEK FROM {col}) AS INTEGER)"

    def extract_year(self, col: str) -> str:
        return f"CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)"

    def extract_month(self, col: str) -> str:
        return f"CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)"

    def extract_week(self, col: str) -> str:
        return f"CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)"

    def extract_quarter(self, col: str) -> str:
        return f"CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)"
```

- [ ] **Step 2.5: Register DuckDB**

Add to end of `backend/backends/__init__.py`:

```python
from backend.backends.duckdb import DuckDBBackend  # noqa: E402
_register("duckdb", DuckDBBackend())
```

- [ ] **Step 2.6: Run DuckDB tests**

```bash
uv run pytest backend/tests/test_backends_duckdb.py -v 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 2.7: Run full suite**

```bash
uv run pytest backend/tests/ -q
```

Expected: 114 passed.

- [ ] **Step 2.8: Commit**

```bash
git add backend/backends/
git add backend/tests/test_backends_duckdb.py
git commit -m "feat: add DuckDB backend with credentials and SQL fragments"
```

---

## Chunk 2: SQLite, PostgreSQL, and Databricks Backends

### Task 3: SQLite backend

**Files:**
- Create: `backend/backends/sqlite/__init__.py`
- Create: `backend/backends/sqlite/credentials.py`
- Create: `backend/tests/test_backends_sqlite.py`

- [ ] **Step 3.1: Write failing tests**

Create `backend/tests/test_backends_sqlite.py`:

```python
"""Tests for the SQLite database backend."""
import sqlite3
import pytest

from backend.backends.sqlite import SQLiteBackend
from backend.backends.sqlite.credentials import SQLiteCredentials
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return SQLiteBackend()


@pytest.fixture
def mem_conn():
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id TEXT, timestamp TEXT, event_name TEXT, properties TEXT
        )
    """)
    conn.execute("INSERT INTO events VALUES ('u1', '2024-01-01', 'PageView', NULL)")
    conn.commit()
    yield conn
    conn.close()


class TestSQLiteBackendIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "sqlite"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_false(self, backend):
        assert backend.use_pool is False

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestSQLiteCredentials:
    def test_valid(self):
        c = SQLiteCredentials(file_path="/tmp/test.db")
        assert c.file_path == "/tmp/test.db"

    def test_parse_credentials(self, backend):
        creds = backend.parse_credentials({"file_path": "/tmp/test.db"})
        assert isinstance(creds, SQLiteCredentials)


class TestSQLiteExecution:
    def test_execute_no_params(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT COUNT(*) FROM events", None)
        assert rows == [(1,)]

    def test_execute_with_params(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT user_id FROM events WHERE event_name = ?", ["PageView"])
        assert rows == [("u1",)]

    def test_table_exists_true(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "events") is True

    def test_table_exists_false(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "nope") is False

    def test_get_table_columns(self, backend, mem_conn):
        cols = backend.get_table_columns(mem_conn, '"events"')
        assert "user_id" in cols and "timestamp" in cols

    def test_get_tables(self, backend, mem_conn):
        assert "events" in backend.get_tables(mem_conn)

    def test_get_columns_for_browse(self, backend, mem_conn):
        cols = backend.get_columns_for_browse(mem_conn, "events")
        assert "user_id" in cols


class TestSQLiteBrowse:
    def test_browse_returns_tables(self, backend, mem_conn):
        items = backend.browse(mem_conn, catalog=None, schema=None)
        assert any(i["name"] == "events" for i in items)
        assert all(i["kind"] == "table" for i in items)

    def test_browse_ignores_catalog_and_schema(self, backend, mem_conn):
        a = backend.browse(mem_conn, None, None)
        b = backend.browse(mem_conn, "x", "y")
        assert a == b


class TestSQLiteDetectSchema:
    def test_detect_schema_finds_events(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.events_table == "events"
        col_names = [c.name for c in info.columns]
        assert "user_id" in col_names

    def test_detect_schema_suggestions(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.suggestions.get("user_id_field") == "user_id"


class TestSQLiteCTE:
    def test_prepend_events_cte_uses_regex(self, backend):
        cte_body = "(SELECT user_id, timestamp, event_name FROM raw)"
        query = "SELECT COUNT(*) FROM events WHERE event_name = 'x'"
        result = backend.prepend_events_cte(cte_body, query)
        assert cte_body in result

    def test_build_events_cte_no_exclude(self, backend):
        cte = backend.build_events_cte("raw", "uid", "ts", "action", [{"path": "props"}])
        assert "uid" in cte and "user_id" in cte
        assert "EXCLUDE" not in cte


class TestSQLiteSQLFragments:
    def test_date_trunc_day(self, backend):
        assert "DATE" in backend.date_trunc("day", "ts").upper()

    def test_date_diff_days(self, backend):
        assert "julianday" in backend.date_diff_days("a", "b").lower()

    def test_epoch_diff_seconds(self, backend):
        assert "STRFTIME" in backend.epoch_diff_seconds("a", "b").upper()

    def test_interval_minutes_exceeded(self, backend):
        assert "1800" in backend.interval_minutes_exceeded("a", "b", 30)

    def test_string_concat(self, backend):
        assert " || " in backend.string_concat("a", "b")

    def test_cast_to_text(self, backend):
        assert "TEXT" in backend.cast_to_text("x").upper()

    def test_json_extract_string(self, backend):
        assert "json_extract" in backend.json_extract_string("props", "key").lower()

    def test_extract_hour(self, backend):
        assert "STRFTIME" in backend.extract_hour("ts").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper() or "/" in backend.extract_quarter("ts")
```

- [ ] **Step 3.2: Run to confirm failure**

```bash
uv run pytest backend/tests/test_backends_sqlite.py -q 2>&1 | head -5
```

Expected: `ImportError`.

- [ ] **Step 3.3: Create SQLite credentials**

Create `backend/backends/sqlite/credentials.py`:

```python
from pydantic import BaseModel

class SQLiteCredentials(BaseModel):
    file_path: str
```

- [ ] **Step 3.4: Create SQLite backend**

Create `backend/backends/sqlite/__init__.py`:

```python
"""SQLite database backend."""
from __future__ import annotations

import re
import sqlite3 as _sqlite3
from typing import Any

from pydantic import BaseModel

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.sqlite.credentials import SQLiteCredentials

_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


class SQLiteBackend:

    @property
    def dialect_name(self) -> str:
        return "sqlite"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return False

    def parse_credentials(self, raw: dict) -> SQLiteCredentials:
        return SQLiteCredentials.model_validate(raw)

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        creds = SQLiteCredentials.model_validate(credentials.model_dump())
        return _sqlite3.connect(creds.file_path, check_same_thread=False)

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "sqlite")

    def is_connection_error(self, exc: Exception) -> bool:
        return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            cursor = conn.execute(f"SELECT * FROM {table_expr} LIMIT 0")
            return frozenset(d[0] for d in cursor.description or [])
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        rows = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?",
            (table_name,),
        ).fetchall()
        return len(rows) > 0

    def get_tables(self, conn: Any) -> list[str]:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name"
        ).fetchall()
        return [r[0] for r in rows]

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            cursor = conn.execute(f'SELECT * FROM "{table}" LIMIT 0')
            return [d[0] for d in cursor.description or []]
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name"
        ).fetchall()
        return [{"name": r[0], "full_name": r[0], "kind": "table"} for r in rows]

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables_result = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        tables = [r[0] for r in tables_result]
        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])

        columns_result = conn.execute(f'PRAGMA table_info("{events_table}")').fetchall()
        columns = [ColumnInfo(name=r[1], type=r[2] or "TEXT") for r in columns_result]

        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            is_json = "JSON" in sql_type or "BLOB" in sql_type
            if not is_json and sql_type in ("TEXT", ""):
                sample = conn.execute(
                    f'SELECT "{col.name}" FROM "{events_table}" '
                    f'WHERE "{col.name}" IS NOT NULL AND "{col.name}" != \'\' LIMIT 1'
                ).fetchone()
                if sample and isinstance(sample[0], str) and sample[0].lstrip().startswith("{"):
                    is_json = True
            if is_json:
                try:
                    keys_result = conn.execute(
                        f'SELECT DISTINCT j.key FROM "{events_table}", json_each("{col.name}") AS j '
                        f'WHERE "{col.name}" IS NOT NULL LIMIT 2000'
                    ).fetchall()
                    for (key,) in keys_result:
                        if key:
                            proposed.append({"name": key, "path": f"{col.name}.{key}", "type": "string"})
                except Exception:
                    proposed.append({"name": col.name, "path": col.name, "type": "string"})
            else:
                proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})

        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        return list(conn.execute(query, params or []).fetchall())

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = '"'
        core = f'{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name'
        remapped_src = {uid_field, ts_field, en_field}
        extra_cols = sorted({p["path"].split(".")[0] for p in custom_props if "path" in p} - remapped_src)
        extras = (", " + ", ".join(f"{q}{c}{q}" for c in extra_cols)) if extra_cols else ""
        return f'(SELECT {core}{extras} FROM "{source_table}")'

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        return _EVENTS_REF_RE.sub(lambda m: f"{m.group(1)} {cte_body}", query.strip())

    def date_trunc(self, unit: str, col: str) -> str:
        _map = {
            "hour": f"STRFTIME('%Y-%m-%d %H:00:00', {col})",
            "day": f"DATE({col})",
            "week": f"DATE({col}, 'weekday 1', '-6 days')",
            "month": f"STRFTIME('%Y-%m-01', {col})",
            "year": f"STRFTIME('%Y-01-01', {col})",
        }
        return _map.get(unit, f"DATE({col})")

    def date_diff_days(self, start: str, end: str) -> str:
        return f"CAST(julianday({end}) - julianday({start}) AS INTEGER)"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"(STRFTIME('%s', {end}) - STRFTIME('%s', {start}))"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"(STRFTIME('%s', {later}) - STRFTIME('%s', {earlier})) > {minutes * 60}"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"CAST({expr} AS TEXT)"

    def json_extract_string(self, col: str, key: str) -> str:
        parts = key.split(".")
        return f"json_extract({col}, '$.{'.'.join(parts)}')"

    def extract_hour(self, col: str) -> str:
        return f"CAST(STRFTIME('%H', {col}) AS INTEGER)"

    def extract_day_of_week(self, col: str) -> str:
        return f"CAST(STRFTIME('%w', {col}) AS INTEGER)"

    def extract_year(self, col: str) -> str:
        return f"CAST(STRFTIME('%Y', {col}) AS INTEGER)"

    def extract_month(self, col: str) -> str:
        return f"CAST(STRFTIME('%m', {col}) AS INTEGER)"

    def extract_week(self, col: str) -> str:
        return f"CAST(STRFTIME('%W', {col}) AS INTEGER)"

    def extract_quarter(self, col: str) -> str:
        return f"CAST((CAST(STRFTIME('%m', {col}) AS INTEGER) + 2) / 3 AS INTEGER)"
```

- [ ] **Step 3.5: Register SQLite**

Add to `backend/backends/__init__.py`:

```python
from backend.backends.sqlite import SQLiteBackend  # noqa: E402
_register("sqlite", SQLiteBackend())
```

- [ ] **Step 3.6: Run SQLite tests**

```bash
uv run pytest backend/tests/test_backends_sqlite.py -v 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 3.7: Run full suite**

```bash
uv run pytest backend/tests/ -q
```

Expected: 114 passed.

- [ ] **Step 3.8: Commit**

```bash
git add backend/backends/sqlite/ backend/tests/test_backends_sqlite.py
git commit -m "feat: add SQLite backend"
```

---

### Task 4: PostgreSQL backend

**Files:**
- Create: `backend/backends/postgresql/__init__.py`
- Create: `backend/backends/postgresql/credentials.py`
- Create: `backend/tests/test_backends_postgresql.py`

- [ ] **Step 4.1: Write failing tests**

Create `backend/tests/test_backends_postgresql.py`:

```python
"""Tests for the PostgreSQL database backend (mock-based)."""
from unittest.mock import MagicMock
import pytest

from backend.backends.postgresql import PostgreSQLBackend
from backend.backends.postgresql.credentials import PostgreSQLCredentials
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return PostgreSQLBackend()


def _make_cursor(rows=None, description=None):
    cursor = MagicMock()
    cursor.description = description or [("col",)]
    cursor.fetchall.return_value = rows or []
    cursor.fetchone.return_value = rows[0] if rows else None
    return cursor


def _make_conn(rows=None, description=None):
    cursor = _make_cursor(rows, description)
    conn = MagicMock()
    conn.cursor.return_value = cursor
    return conn, cursor


class TestPostgreSQLIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "postgres"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestPostgreSQLCredentials:
    def test_valid_minimal(self):
        c = PostgreSQLCredentials(host="h", database="d", user="u", password="p")
        assert c.port == 5432 and c.sslmode is None

    def test_with_sslmode(self):
        c = PostgreSQLCredentials(host="h", database="d", user="u", password="p", sslmode="require")
        assert c.sslmode == "require"

    def test_parse_credentials(self, backend):
        creds = backend.parse_credentials({"host": "h", "database": "d", "user": "u", "password": "p"})
        assert isinstance(creds, PostgreSQLCredentials)

    def test_pool_key(self, backend):
        creds = PostgreSQLCredentials(host="h", database="d", user="u", password="p")
        assert backend.pool_key("c1", creds) == ("c1", "postgres")


class TestPostgreSQLExecution:
    def test_execute_no_params(self, backend):
        conn, cursor = _make_conn([(42,)])
        result = backend.execute(conn, "SELECT 42", None)
        assert result == [(42,)]
        cursor.execute.assert_called_once_with("SELECT 42", None)

    def test_execute_replaces_question_marks_with_percent_s(self, backend):
        conn, cursor = _make_conn([("u1",)])
        backend.execute(conn, "SELECT * FROM t WHERE id = ?", ["u1"])
        call_sql = cursor.execute.call_args[0][0]
        assert "%s" in call_sql and "?" not in call_sql

    def test_is_connection_error_operational(self, backend):
        try:
            import psycopg2
            assert backend.is_connection_error(psycopg2.OperationalError("lost")) is True
        except ImportError:
            pytest.skip("psycopg2 not installed")

    def test_is_connection_error_false_for_generic(self, backend):
        assert backend.is_connection_error(ValueError("nope")) is False

    def test_get_table_columns_returns_frozenset(self, backend):
        conn, cursor = _make_conn(description=[("user_id",), ("ts",)])
        cols = backend.get_table_columns(conn, '"events"')
        assert "user_id" in cols and "ts" in cols

    def test_get_table_columns_returns_empty_on_error(self, backend):
        conn = MagicMock()
        conn.cursor.side_effect = Exception("boom")
        assert backend.get_table_columns(conn, '"nope"') == frozenset()


class TestPostgreSQLCTE:
    def test_build_events_cte_explicit_enumeration(self, backend):
        cte = backend.build_events_cte("raw", "uid", "ts", "action", [{"path": "extra"}])
        assert "uid" in cte and "user_id" in cte
        assert "EXCLUDE" not in cte and "EXCEPT" not in cte

    def test_prepend_events_cte(self, backend):
        result = backend.prepend_events_cte("(SELECT * FROM raw)", "SELECT 1 FROM events")
        assert result.startswith("WITH events AS")


class TestPostgreSQLSQLFragments:
    def test_date_trunc(self, backend):
        assert backend.date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"

    def test_date_diff_days(self, backend):
        assert "EXTRACT" in backend.date_diff_days("a", "b").upper()

    def test_epoch_diff_seconds(self, backend):
        assert "EPOCH" in backend.epoch_diff_seconds("a", "b").upper()

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "INTERVAL" in result.upper() and "30" in result

    def test_json_extract_simple(self, backend):
        assert "->>" in backend.json_extract_string("p", "k")

    def test_json_extract_nested(self, backend):
        assert "json_extract_path_text" in backend.json_extract_string("p", "a.b").lower()

    def test_cast_to_text(self, backend):
        assert "TEXT" in backend.cast_to_text("x").upper()

    def test_extract_hour(self, backend):
        assert "HOUR" in backend.extract_hour("ts").upper()

    def test_extract_day_of_week(self, backend):
        assert "DOW" in backend.extract_day_of_week("ts").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()
```

- [ ] **Step 4.2: Run to confirm failure**

```bash
uv run pytest backend/tests/test_backends_postgresql.py -q 2>&1 | head -5
```

Expected: `ImportError`.

- [ ] **Step 4.3: Create PostgreSQL credentials**

Create `backend/backends/postgresql/credentials.py`:

```python
from pydantic import BaseModel

class PostgreSQLCredentials(BaseModel):
    host: str
    port: int = 5432
    database: str
    user: str
    password: str
    sslmode: str | None = None
```

- [ ] **Step 4.4: Create PostgreSQL backend**

Create `backend/backends/postgresql/__init__.py`:

```python
"""PostgreSQL database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.postgresql.credentials import PostgreSQLCredentials

_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


class PostgreSQLBackend:

    @property
    def dialect_name(self) -> str:
        return "postgres"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> PostgreSQLCredentials:
        return PostgreSQLCredentials.model_validate(raw)

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        import psycopg2
        creds = PostgreSQLCredentials.model_validate(credentials.model_dump())
        kwargs: dict = dict(host=creds.host, port=creds.port, dbname=creds.database,
                            user=creds.user, password=creds.password)
        if creds.sslmode:
            kwargs["sslmode"] = creds.sslmode
        return psycopg2.connect(**kwargs)

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "postgres")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            import psycopg2
            return isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError))
        except ImportError:
            return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_expr} LIMIT 0")
                return frozenset(d[0] for d in cursor.description or [])
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f'SELECT 1 FROM "{table_name}" LIMIT 1')
                return True
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' ORDER BY 1"
            )
            return [r[0] for r in cursor.fetchall()]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f'SELECT * FROM "{table}" LIMIT 0')
                return [d[0] for d in cursor.description or []]
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        cursor = conn.cursor()
        try:
            if schema is None:
                cursor.execute(
                    "SELECT schema_name FROM information_schema.schemata "
                    "WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY 1"
                )
                rows = cursor.fetchall()
                return [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in rows]
            cursor.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = %s ORDER BY 1",
                [schema],
            )
            rows = cursor.fetchall()
            return [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in rows]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type IN ('BASE TABLE','VIEW') ORDER BY table_name"
            )
            tables = [r[0] for r in cursor.fetchall()]
            events_table = pick_events_table(tables, events_table_hint)
            if not events_table:
                return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                                  proposed_custom_properties=[])
            cursor.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = %s ORDER BY ordinal_position",
                (events_table,),
            )
            columns = [ColumnInfo(name=r[0], type=r[1]) for r in cursor.fetchall()]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            if any(t in sql_type for t in ("JSON", "JSONB")):
                try:
                    cur2 = conn.cursor()
                    try:
                        cur2.execute(
                            f'SELECT DISTINCT jsonb_object_keys("{col.name}"::jsonb) '
                            f'FROM "{events_table}" WHERE "{col.name}" IS NOT NULL LIMIT 2000'
                        )
                        for (key,) in cur2.fetchall():
                            if key:
                                proposed.append({"name": key, "path": f"{col.name}.{key}", "type": "string"})
                    finally:
                        with contextlib.suppress(Exception):
                            cur2.close()
                except Exception:
                    proposed.append({"name": col.name, "path": col.name, "type": "string"})
            else:
                proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})

        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        if params:
            query = query.replace("?", "%s")
        cursor = conn.cursor()
        try:
            cursor.execute(query, params or None)
            return cursor.fetchall()
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = '"'
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f'{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name'
        remapped_src = {uid_field, ts_field, en_field}
        extra_cols = sorted({p["path"].split(".")[0] for p in custom_props if "path" in p} - remapped_src)
        extras = (", " + ", ".join(f"{q}{c}{q}" for c in extra_cols)) if extra_cols else ""
        return f"(SELECT {core}{extras} FROM {quoted_table})"

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        q = query.strip()
        cte_def = f"events AS {cte_body}"
        m = re.match(r"(with\s+)", q, re.IGNORECASE)
        if m:
            return q[: m.end()] + cte_def + ", " + q[m.end():]
        return f"WITH {cte_def} {q}"

    def date_trunc(self, unit: str, col: str) -> str:
        return f"DATE_TRUNC('{unit}', {col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"CAST(EXTRACT(DAY FROM ({end}::timestamp - {start}::timestamp)) AS INTEGER)"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"EXTRACT(EPOCH FROM ({end} - {start}))"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"{later} - {earlier} > INTERVAL '{minutes} minutes'"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"CAST({expr} AS TEXT)"

    def json_extract_string(self, col: str, key: str) -> str:
        parts = key.split(".")
        if len(parts) == 1:
            return f"{col}->>'{key}'"
        return f"json_extract_path_text({col}, {', '.join(repr(p) for p in parts)})"

    def extract_hour(self, col: str) -> str:
        return f"CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)"

    def extract_day_of_week(self, col: str) -> str:
        return f"CAST(EXTRACT(DOW FROM {col}) AS INTEGER)"

    def extract_year(self, col: str) -> str:
        return f"CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)"

    def extract_month(self, col: str) -> str:
        return f"CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)"

    def extract_week(self, col: str) -> str:
        return f"CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)"

    def extract_quarter(self, col: str) -> str:
        return f"CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)"
```

- [ ] **Step 4.5: Register PostgreSQL**

Add to `backend/backends/__init__.py`:

```python
from backend.backends.postgresql import PostgreSQLBackend  # noqa: E402
_register("postgresql", PostgreSQLBackend())
```

- [ ] **Step 4.6: Run PostgreSQL tests**

```bash
uv run pytest backend/tests/test_backends_postgresql.py -v 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 4.7: Run full suite**

```bash
uv run pytest backend/tests/ -q
```

Expected: 114 passed.

- [ ] **Step 4.8: Commit**

```bash
git add backend/backends/postgresql/ backend/tests/test_backends_postgresql.py
git commit -m "feat: add PostgreSQL backend"
```

---

### Task 5: Databricks backend

**Files:**
- Create: `backend/backends/databricks/__init__.py`
- Create: `backend/backends/databricks/credentials.py`
- Create: `backend/tests/test_backends_databricks.py`

- [ ] **Step 5.1: Write failing tests**

Create `backend/tests/test_backends_databricks.py`:

```python
"""Tests for the Databricks database backend (mock-based)."""
from unittest.mock import MagicMock
import pytest

from backend.backends.databricks import DatabricksBackend
from backend.backends.databricks.credentials import DatabricksCredentials
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return DatabricksBackend()


def _make_conn(rows=None):
    cursor = MagicMock()
    cursor.description = [("col",)]
    cursor.fetchall.return_value = rows or []
    conn = MagicMock()
    conn.cursor.return_value = cursor
    return conn, cursor


class TestDatabricksIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "databricks"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == "`"

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestDatabricksCredentials:
    def test_valid(self):
        c = DatabricksCredentials(host="h", http_path="/p", token="t")
        assert c.host == "h"

    def test_parse_credentials(self, backend):
        creds = backend.parse_credentials({"host": "h", "http_path": "/p", "token": "t"})
        assert isinstance(creds, DatabricksCredentials)

    def test_pool_key(self, backend):
        creds = DatabricksCredentials(host="h", http_path="/p", token="t")
        assert backend.pool_key("c42", creds) == ("c42", "databricks")


class TestDatabricksExecution:
    def test_execute_converts_to_named_params(self, backend):
        conn, cursor = _make_conn([(42,)])
        backend.execute(conn, "SELECT * FROM t WHERE id = ?", ["abc"])
        call_args = cursor.execute.call_args
        assert ":p0" in call_args[0][0]

    def test_execute_no_params(self, backend):
        conn, cursor = _make_conn([(7,)])
        result = backend.execute(conn, "SELECT 7", None)
        assert result == [(7,)]

    def test_is_connection_error_false_for_generic(self, backend):
        assert backend.is_connection_error(ValueError("nope")) is False


class TestDatabricksBrowse:
    def test_browse_no_catalog_returns_catalogs(self, backend):
        conn, cursor = _make_conn([("main",), ("hive_metastore",)])
        items = backend.browse(conn, catalog=None, schema=None)
        assert all(i["kind"] == "catalog" for i in items)
        assert any(i["name"] == "main" for i in items)

    def test_browse_catalog_no_schema_returns_schemas(self, backend):
        conn, cursor = _make_conn([("default",)])
        items = backend.browse(conn, catalog="main", schema=None)
        assert all(i["kind"] == "schema" for i in items)

    def test_browse_catalog_and_schema_returns_tables(self, backend):
        # SHOW TABLES returns (tableName, isTemporary) or (dbName, tableName, isTemporary)
        # The backend reads r[1] for the table name (standard Databricks SHOW TABLES format)
        conn, cursor = _make_conn([("default", "events", False)])
        items = backend.browse(conn, catalog="main", schema="default")
        assert all(i["kind"] == "table" for i in items)


class TestDatabricksCTE:
    def test_build_events_cte_uses_except(self, backend):
        cte = backend.build_events_cte("cat.sch.raw", "uid", "ts", "action", [])
        assert "EXCEPT" in cte.upper()
        assert "uid" in cte and "user_id" in cte

    def test_prepend_events_cte(self, backend):
        result = backend.prepend_events_cte("(SELECT * FROM raw)", "SELECT 1 FROM events")
        assert "WITH events AS" in result


class TestDatabricksSQLFragments:
    def test_date_trunc(self, backend):
        assert "DATE_TRUNC" in backend.date_trunc("day", "ts").upper()

    def test_cast_to_text_uses_string(self, backend):
        assert "STRING" in backend.cast_to_text("x").upper()

    def test_json_extract_uses_get_json_object(self, backend):
        assert "get_json_object" in backend.json_extract_string("p", "k").lower()

    def test_epoch_diff_seconds_uses_unix_timestamp(self, backend):
        assert "unix_timestamp" in backend.epoch_diff_seconds("a", "b").lower()

    def test_date_diff_days(self, backend):
        assert "DATEDIFF" in backend.date_diff_days("a", "b").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()
```

- [ ] **Step 5.2: Run to confirm failure**

```bash
uv run pytest backend/tests/test_backends_databricks.py -q 2>&1 | head -5
```

Expected: `ImportError`.

- [ ] **Step 5.3: Create Databricks credentials**

Create `backend/backends/databricks/credentials.py`:

```python
from pydantic import BaseModel

class DatabricksCredentials(BaseModel):
    host: str
    http_path: str
    token: str
```

- [ ] **Step 5.4: Create Databricks backend**

Create `backend/backends/databricks/__init__.py`:

```python
"""Databricks database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.databricks.credentials import DatabricksCredentials

_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


def _to_named_params(query: str, params: list) -> tuple[str, dict]:
    """Convert positional ? params to Databricks-style :p0, :p1, ... named params."""
    named: dict[str, Any] = {}
    parts = query.split("?")
    result: list[str] = [parts[0]]
    for i, part in enumerate(parts[1:]):
        key = f"p{i}"
        named[key] = params[i] if i < len(params) else None
        result.append(f":{key}")
        result.append(part)
    return "".join(result), named


def _parse_struct_fields(sql_type: str, prefix: str = "") -> list[dict]:
    inner = sql_type.strip()
    if inner.upper().startswith("STRUCT<") and inner.endswith(">"):
        inner = inner[7:-1]
    else:
        return []
    results: list[dict] = []
    depth = 0
    current = ""
    for ch in inner:
        if ch in ("<", "("):
            depth += 1; current += ch
        elif ch in (">", ")"):
            depth -= 1; current += ch
        elif ch == "," and depth == 0:
            _parse_struct_field(current.strip(), prefix, results); current = ""
        else:
            current += ch
    if current.strip():
        _parse_struct_field(current.strip(), prefix, results)
    return results


def _parse_struct_field(field_def: str, prefix: str, results: list) -> None:
    colon = field_def.find(":")
    if colon < 0:
        return
    name = field_def[:colon].strip().strip("`")
    type_str = field_def[colon + 1:].strip()
    path = f"{prefix}.{name}" if prefix else name
    upper = type_str.upper()
    if upper.startswith("STRUCT<"):
        nested = _parse_struct_fields(type_str, path)
        results.extend(nested if nested else [{"name": name, "path": path, "type": "string"}])
    else:
        results.append({"name": name, "path": path, "type": infer_type(upper)})


class DatabricksBackend:

    @property
    def dialect_name(self) -> str:
        return "databricks"

    @property
    def identifier_quote_char(self) -> str:
        return "`"

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> DatabricksCredentials:
        return DatabricksCredentials.model_validate(raw)

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        from databricks import sql as dbsql
        creds = DatabricksCredentials.model_validate(credentials.model_dump())
        return dbsql.connect(
            server_hostname=creds.host,
            http_path=creds.http_path,
            access_token=creds.token,
        )

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "databricks")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            from databricks.sql.exc import Error as _DatabricksError
            return isinstance(exc, _DatabricksError)
        except ImportError:
            return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_expr} LIMIT 0")
                return frozenset(d[0] for d in cursor.description or [])
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            self.execute(conn, f"SELECT 1 FROM {table_name} LIMIT 1", None)
            return True
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT current_catalog(), current_database()")
            row = cursor.fetchone()
            cat, sch = (row[0], row[1]) if row else ("hive_metastore", "default")
            cursor.execute(f"SHOW TABLES IN `{cat}`.`{sch}`")
            rows = cursor.fetchall()
            return [r[1] if len(r) > 1 else r[0] for r in rows]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table} LIMIT 0")
                return [d[0] for d in cursor.description or []]
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        cursor = conn.cursor()
        try:
            if catalog is None:
                cursor.execute("SHOW CATALOGS")
                rows = cursor.fetchall()
                return [{"name": r[0], "full_name": r[0], "kind": "catalog"} for r in rows]
            if schema is None:
                cursor.execute(f"SHOW SCHEMAS IN `{catalog}`")
                rows = cursor.fetchall()
                return [{"name": r[0], "full_name": f"{catalog}.{r[0]}", "kind": "schema"} for r in rows]
            cursor.execute(f"SHOW TABLES IN `{catalog}`.`{schema}`")
            rows = cursor.fetchall()
            return [{"name": r[1], "full_name": f"{catalog}.{schema}.{r[1]}", "kind": "table"} for r in rows]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        cursor = conn.cursor()
        try:
            if events_table_hint and events_table_hint.count(".") == 2:
                cat, sch, tbl = events_table_hint.split(".", 2)
                cursor.execute(f"DESCRIBE `{cat}`.`{sch}`.`{tbl}`")
                columns = [ColumnInfo(name=r[0], type=r[1]) for r in cursor.fetchall()
                           if r[0] and not r[0].startswith("#")]
                tables = [events_table_hint]
                events_table = events_table_hint
            else:
                cursor.execute("SELECT current_catalog(), current_database()")
                row = cursor.fetchone()
                default_cat, default_sch = (row[0], row[1]) if row else ("hive_metastore", "default")
                cursor.execute(f"SHOW TABLES IN `{default_cat}`.`{default_sch}`")
                rows = cursor.fetchall()
                tables = [r[1] if len(r) > 1 else r[0] for r in rows]
                events_table_name = pick_events_table(tables, events_table_hint)
                if not events_table_name:
                    return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                                      proposed_custom_properties=[])
                events_table = f"{default_cat}.{default_sch}.{events_table_name}"
                cursor.execute(f"DESCRIBE `{default_cat}`.`{default_sch}`.`{events_table_name}`")
                columns = [ColumnInfo(name=r[0], type=r[1]) for r in cursor.fetchall()
                           if r[0] and not r[0].startswith("#")]

            suggestions = suggest_fields(columns)
            core_values = set(suggestions.values())
            proposed: list[dict] = []
            for col in columns:
                if col.name in core_values:
                    continue
                sql_type = col.type.upper()
                if sql_type.startswith("STRUCT<"):
                    nested = _parse_struct_fields(col.type, col.name)
                    proposed.extend(nested if nested else [{"name": col.name, "path": col.name, "type": "string"}])
                elif "MAP<" in sql_type:
                    proposed.append({"name": col.name, "path": col.name, "type": "string"})
                else:
                    proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})

            return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                              suggestions=suggestions, proposed_custom_properties=proposed)
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        named_query, named_params = _to_named_params(query, params or [])
        cursor = conn.cursor()
        try:
            cursor.execute(named_query, named_params or None)
            return cursor.fetchall()
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = "`"
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f'{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name'
        remapped_src = {uid_field, ts_field, en_field}
        excl = ", ".join(f"{q}{c}{q}" for c in sorted(remapped_src))
        return f"(SELECT {core}, * EXCEPT ({excl}) FROM {quoted_table})"

    def prepend_events_cte(self, cte_body: str, query: str) -> str:
        q = query.strip()
        cte_def = f"events AS {cte_body}"
        m = re.match(r"(with\s+)", q, re.IGNORECASE)
        if m:
            return q[: m.end()] + cte_def + ", " + q[m.end():]
        return f"WITH {cte_def} {q}"

    def date_trunc(self, unit: str, col: str) -> str:
        return f"DATE_TRUNC('{unit}', {col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"DATEDIFF({end}, {start})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"(unix_timestamp({end}) - unix_timestamp({start}))"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"(unix_timestamp({later}) - unix_timestamp({earlier})) > {minutes * 60}"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"CAST({expr} AS STRING)"

    def json_extract_string(self, col: str, key: str) -> str:
        parts = key.split(".")
        return f"get_json_object({col}, '$.{'.'.join(parts)}')"

    def extract_hour(self, col: str) -> str:
        return f"CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)"

    def extract_day_of_week(self, col: str) -> str:
        return f"CAST(EXTRACT(DAYOFWEEK FROM {col}) AS INTEGER)"

    def extract_year(self, col: str) -> str:
        return f"CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)"

    def extract_month(self, col: str) -> str:
        return f"CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)"

    def extract_week(self, col: str) -> str:
        return f"CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)"

    def extract_quarter(self, col: str) -> str:
        return f"CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)"
```

- [ ] **Step 5.5: Register Databricks**

Add to `backend/backends/__init__.py`:

```python
from backend.backends.databricks import DatabricksBackend  # noqa: E402
_register("databricks", DatabricksBackend())
```

- [ ] **Step 5.6: Run Databricks tests**

```bash
uv run pytest backend/tests/test_backends_databricks.py -v 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5.7: Run full suite**

```bash
uv run pytest backend/tests/ -q
```

Expected: 114 passed.

- [ ] **Step 5.8: Commit**

```bash
git add backend/backends/databricks/ backend/tests/test_backends_databricks.py
git commit -m "feat: add Databricks backend"
```

---

## Chunk 3: Refactor AnalyticsDatabase and pool

### Task 6: Update `analytics_db.py` and tests

**Files:**
- Modify: `backend/services/analytics_db.py`
- Modify: `backend/services/pool.py`
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_connection_executor.py`

- [ ] **Step 6.1: Update test files to use backend instead of dialect**

In `backend/tests/conftest.py`, change `_make_test_db`:

```python
# Add import at top:
from backend.backends.duckdb import DuckDBBackend

# Change _make_test_db:
def _make_test_db() -> AnalyticsDatabase:
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR, timestamp TIMESTAMP, event_name VARCHAR, properties VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('user-1', '2024-01-15 10:00:00', 'Home', '{}'),
            ('user-1', '2024-01-15 10:05:00', 'Purchase', '{}'),
            ('user-2', '2024-01-16 11:00:00', 'Home', '{}'),
            ('user-2', '2024-01-16 11:10:00', 'Checkout', '{}')
    """)
    return AnalyticsDatabase(conn=conn, backend=DuckDBBackend(), events_cte=None)
```

In `backend/tests/test_connection_executor.py`, change `_make_db`:

```python
# Add import at top:
from backend.backends.duckdb import DuckDBBackend

# Change _make_db:
def _make_db(self, custom_prop_exprs: dict) -> AnalyticsDatabase:
    conn = duckdb.connect(":memory:")
    return AnalyticsDatabase(
        conn=conn,
        backend=DuckDBBackend(),
        events_cte=None,
        custom_prop_exprs=custom_prop_exprs,
    )
```

Check for any remaining `dialect=` usages:

```bash
grep -rn 'dialect=' backend/tests/ --include="*.py"
```

Fix any remaining occurrences by replacing `dialect="duckdb"` with `backend=DuckDBBackend()`.

- [ ] **Step 6.2: Run tests to confirm they now fail**

```bash
uv run pytest backend/tests/ -q 2>&1 | head -10
```

Expected: `TypeError` — `AnalyticsDatabase.__init__` still takes `dialect`.

- [ ] **Step 6.3: Rewrite `analytics_db.py`**

Replace `backend/services/analytics_db.py` with:

```python
"""Analytics database wrapper for stratif.io Analytics."""

import contextlib
import re
from typing import Any

import structlog
from fastapi import HTTPException

from backend.backends import get_backend
from backend.backends.base import DatabaseBackend
from backend.config import settings
from backend.services.pool import _pool_get
from backend.services.sql_builder import json_extract_string

log = structlog.get_logger(__name__)

_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


def _resolve_path_to_sql(path: str, dialect: str = "duckdb") -> str:
    """Legacy helper: kept for compatibility with callers that pass dialect strings."""
    parts = path.split(".")
    if dialect == "databricks":
        return ".".join(f"`{p}`" for p in parts)
    if len(parts) == 1:
        return f'"{parts[0]}"'
    col = parts[0]
    nested_key = ".".join(parts[1:])
    return json_extract_string(f'"{col}"', nested_key, dialect)


def _to_named_params(query: str, params: list) -> tuple[str, dict]:
    named: dict[str, Any] = {}
    parts = query.split("?")
    result: list[str] = [parts[0]]
    for i, part in enumerate(parts[1:]):
        key = f"p{i}"
        named[key] = params[i] if i < len(params) else None
        result.append(f":{key}")
        result.append(part)
    return "".join(result), named


def _remap_exprs_for_available_cols(
    custom_props: list[dict],
    custom_prop_exprs: dict[str, str],
    available_columns: frozenset[str],
    dialect: str,
) -> dict[str, str]:
    if not available_columns:
        return custom_prop_exprs
    path_by_name = {p["name"]: p.get("path", "") for p in custom_props if "name" in p}
    result: dict[str, str] = {}
    for name, expr in custom_prop_exprs.items():
        path = path_by_name.get(name, "")
        parts = path.split(".")
        if len(parts) >= 2:
            root = parts[0]
            leaf = parts[-1]
            if root not in available_columns and leaf in available_columns:
                result[name] = _resolve_path_to_sql(leaf, dialect)
                continue
        result[name] = expr
    return result


class AnalyticsDatabase:
    """Wraps a database connection and provides a uniform execute() interface."""

    def __init__(
        self,
        conn: Any,
        backend: DatabaseBackend,
        events_cte: str | None,
        filter_fields: list[dict] | None = None,
        filter_exprs: dict[str, str] | None = None,
        custom_props: list[dict] | None = None,
        custom_prop_exprs: dict[str, str] | None = None,
        session_timeout_minutes: int = 30,
        available_columns: frozenset[str] | None = None,
    ):
        self._conn = conn
        self._backend = backend
        self._filter_fields: list[dict] = filter_fields or []
        self._filter_exprs: dict[str, str] = filter_exprs or {}
        self._custom_props: list[dict] = custom_props or []
        self._custom_prop_exprs: dict[str, str] = custom_prop_exprs or {}
        self._session_timeout_minutes: int = session_timeout_minutes
        self._events_cte: str | None = events_cte
        self._available_columns: frozenset[str] | None = available_columns
        self._pooled: bool = False
        self._pool_key: tuple | None = None

    def execute(self, query: str, params: list | None = None) -> list[tuple]:
        if self._events_cte:
            query = self._backend.prepend_events_cte(self._events_cte, query)
        if settings.log_sql:
            log.debug("sql_query", sql=query, params=params, dialect=self._backend.dialect_name)
        try:
            return self._backend.execute(self._conn, query, params)
        except Exception as exc:
            if self._pooled and self._backend.is_connection_error(exc):
                raise HTTPException(status_code=503, detail="Connection lost — please retry.") from exc
            raise

    def get_dialect(self) -> str:
        """Backward-compatible: returns dialect string for sql_builder callers."""
        return self._backend.dialect_name

    def table_exists(self, table_name: str) -> bool:
        return self._backend.table_exists(self._conn, table_name)

    def build_filter_clauses(self, filters: dict) -> tuple[list[str], list]:
        where_clauses: list[str] = []
        params: list = []
        for field, value in filters.items():
            if not value or field not in self._custom_prop_exprs:
                continue
            expr = self._custom_prop_exprs[field]
            values = [v for v in str(value).split("|") if v]
            if len(values) > 1:
                placeholders = ", ".join("?" * len(values))
                where_clauses.append(f"{expr} IN ({placeholders})")
                params.extend(values)
            else:
                where_clauses.append(f"{expr} = ?")
                params.append(values[0])
        return where_clauses, params

    def get_filter_exprs(self) -> dict[str, str]:
        return self._filter_exprs

    def get_filter_fields(self) -> list[dict]:
        return self._filter_fields

    def get_filter_options(self) -> dict[str, list[str]]:
        options: dict[str, list[str]] = {}
        for ff in self._filter_fields:
            field = ff["field"]
            expr = self._filter_exprs.get(field)
            if not expr:
                continue
            try:
                rows = self.execute(
                    f"SELECT {expr} AS v, COUNT(*) AS n FROM events "
                    f"WHERE {expr} IS NOT NULL GROUP BY {expr} ORDER BY n DESC LIMIT 50"
                )
                options[field] = [str(row[0]) for row in rows if row[0] is not None]
            except Exception:
                options[field] = []
        return options

    def get_device_type_expr(self) -> str:
        if "device_type" in self._custom_prop_exprs:
            return self._custom_prop_exprs["device_type"]
        if self.has_column("properties"):
            return self._backend.json_extract_string("properties", "device_type")
        return "NULL"

    def has_column(self, col: str) -> bool:
        if self._available_columns is not None:
            return col in self._available_columns
        if col in ("user_id", "timestamp", "event_name"):
            return True
        if self._events_cte is None:
            return True
        root_cols = {p["path"].split(".")[0] for p in self._custom_props if "path" in p}
        return col in root_cols

    def close(self) -> None:
        if self._pooled:
            return
        with contextlib.suppress(Exception):
            self._conn.close()

    def __enter__(self) -> "AnalyticsDatabase":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def get_custom_prop_exprs(self) -> dict[str, str]:
        return self._custom_prop_exprs

    def get_custom_properties(self) -> list[dict]:
        return self._custom_props

    def get_session_timeout_minutes(self) -> int:
        return self._session_timeout_minutes


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
    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")

    creds = decrypt_credentials(row["credentials_encrypted"])
    credentials = backend.parse_credentials(creds)

    schema_row = product_db.fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?", (connection_id,)
    )
    uid_f = schema_row["user_id_field"] if schema_row else "user_id"
    ts_f = schema_row["timestamp_field"] if schema_row else "timestamp"
    en_f = schema_row["event_name_field"] if schema_row else "event_name"
    events_table = schema_row["events_table"] if schema_row and schema_row["events_table"] else "events"
    custom_props: list[dict] = json.loads(schema_row["custom_properties"]) if schema_row else []
    session_timeout_minutes: int = (
        schema_row["session_timeout_minutes"]
        if schema_row and schema_row["session_timeout_minutes"] is not None
        else 30
    )

    dialect = backend.dialect_name
    needs_remap = (uid_f != "user_id" or ts_f != "timestamp" or en_f != "event_name" or events_table != "events")

    custom_prop_exprs: dict[str, str] = {
        p["name"]: _resolve_path_to_sql(p["path"], dialect)
        for p in custom_props
        if "name" in p and "path" in p
    }

    filter_row = product_db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (connection_id,)
    )
    filter_fields: list[dict] = json.loads(filter_row["filter_fields"]) if filter_row else []

    _iq = backend.identifier_quote_char
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

    events_cte = (
        backend.build_events_cte(events_table, uid_f, ts_f, en_f, custom_props)
        if needs_remap else None
    )

    if backend.use_pool:
        pool_key = backend.pool_key(connection_id, credentials)
        conn = _pool_get(pool_key, lambda: backend.open(credentials, read_only=False))
        cols = backend.get_table_columns(conn, f'{_iq}{events_table}{_iq}')
        db = AnalyticsDatabase(
            conn, backend, events_cte=events_cte, available_columns=cols or None, **shared_kwargs
        )
        db._pooled = True
        db._pool_key = pool_key
        return db

    conn = backend.open(credentials, read_only=True)
    cols = backend.get_table_columns(conn, f'"{events_table}"')
    return AnalyticsDatabase(
        conn, backend, events_cte=events_cte, available_columns=cols or None, **shared_kwargs
    )
```

- [ ] **Step 6.4: Update `pool.py` — remove `_is_connection_error`**

Replace `backend/services/pool.py`:

```python
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
```

- [ ] **Step 6.5: Run full suite**

```bash
uv run pytest backend/tests/ -q
```

Expected: all 114 tests pass.

- [ ] **Step 6.6: Verify `get_dialect()` backward compat**

```bash
uv run python -c "
import duckdb
from backend.backends.duckdb import DuckDBBackend
from backend.services.analytics_db import AnalyticsDatabase
db = AnalyticsDatabase(conn=duckdb.connect(':memory:'), backend=DuckDBBackend(), events_cte=None)
assert db.get_dialect() == 'duckdb'
print('OK')
"
```

Expected: `OK`

- [ ] **Step 6.7: Commit**

```bash
git add backend/services/analytics_db.py backend/services/pool.py
git add backend/tests/conftest.py backend/tests/test_connection_executor.py
git commit -m "refactor: AnalyticsDatabase uses backend plugin, remove dialect string"
```

---

## Chunk 4: Refactor schema_detect.py and browse.py

### Task 7: Refactor schema_detect.py

**Files:**
- Modify: `backend/api/connections/schema_detect.py`

- [ ] **Step 7.1: Replace the endpoint body**

Keep the helper functions `_suggest_fields`, `_pick_events_table`, `_infer_type`, `_parse_struct_fields`, `_parse_struct_field` in place — they are still referenced by tests. Remove only the four `_detect_schema_*` private functions and replace the `detect_schema` endpoint:

```python
@router.get("/{conn_id}/schema/detect")
def detect_schema(conn_id: str, events_table: str | None = None):
    """Detect columns from the target database and suggest field mappings."""
    from backend.backends import get_backend

    db = get_product_db()
    row = db.fetchone("SELECT * FROM connections WHERE id = ?", (conn_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    db_type: str = row["db_type"]
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported db type: {db_type}")

    try:
        credentials = backend.parse_credentials(creds)
        conn = backend.open(credentials, read_only=True)
        try:
            info = backend.detect_schema(conn, events_table)
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Schema detection failed: {exc}") from exc

    return {
        "tables": info.tables,
        "events_table": info.events_table,
        "columns": [{"name": c.name, "type": c.type} for c in info.columns],
        "suggestions": info.suggestions,
        "proposed_custom_properties": info.proposed_custom_properties,
    }
```

Delete the four `_detect_schema_duckdb`, `_detect_schema_sqlite`, `_detect_schema_postgresql`, `_detect_schema_databricks` functions from the file.

- [ ] **Step 7.2: Run full suite**

```bash
uv run pytest backend/tests/ -q
```

Expected: 114 passed.

- [ ] **Step 7.3: Commit**

```bash
git add backend/api/connections/schema_detect.py
git commit -m "refactor: schema_detect endpoint uses backend plugin"
```

---

### Task 8: Refactor browse.py

**Files:**
- Modify: `backend/api/connections/browse.py`

- [ ] **Step 8.1: Replace browse.py**

```python
"""Browse endpoint for the Connections API (catalog → schema → table hierarchy)."""

from fastapi import APIRouter, HTTPException

from backend.backends import get_backend
from backend.product_db import get_product_db
from backend.services.crypto import decrypt_credentials
from backend.services.pool import _pool_get

router = APIRouter()


def _get_connection_or_404(conn_id: str):
    db = get_product_db()
    row = db.fetchone("SELECT * FROM connections WHERE id = ?", (conn_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
    return row


@router.get("/{conn_id}/browse")
async def browse_connection(
    conn_id: str,
    catalog: str | None = None,
    schema: str | None = None,
):
    row = _get_connection_or_404(conn_id)
    db_type: str = row["db_type"]

    try:
        backend = get_backend(db_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")

    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    credentials = backend.parse_credentials(creds)

    try:
        if backend.use_pool:
            pool_key = backend.pool_key(conn_id, credentials)
            conn = _pool_get(pool_key, lambda: backend.open(credentials, read_only=False))
            items = backend.browse(conn, catalog=catalog, schema=schema)
        else:
            conn = backend.open(credentials, read_only=True)
            try:
                items = backend.browse(conn, catalog=catalog, schema=schema)
            finally:
                conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Browse failed: {exc}") from exc

    return {"items": items}
```

- [ ] **Step 8.2: Run full suite**

```bash
uv run pytest backend/tests/ -q
```

Expected: 114 passed.

- [ ] **Step 8.3: Verify zero dialect branches remain in refactored files**

```bash
grep -rn "if db_type\|if dialect\|== \"postgresql\"\|== \"duckdb\"\|== \"sqlite\"\|== \"databricks\"\|== \"postgres\"" \
  backend/services/analytics_db.py \
  backend/services/pool.py \
  backend/api/connections/schema_detect.py \
  backend/api/connections/browse.py
```

Expected: no output.

- [ ] **Step 8.4: Commit**

```bash
git add backend/api/connections/browse.py
git commit -m "refactor: browse endpoint uses backend plugin"
```

---

## Chunk 5: Final Verification

### Task 9: Regression + smoke checks

- [ ] **Step 9.1: Full test suite with verbose output**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/db-backends-plugin
uv run pytest backend/tests/ -v 2>&1 | tail -40
```

Expected: all tests pass, 0 failures.

- [ ] **Step 9.2: Verify registry has all four backends**

```bash
uv run python -c "
from backend.backends import _REGISTRY
assert set(_REGISTRY.keys()) == {'duckdb', 'postgresql', 'sqlite', 'databricks'}
print('Registry OK:', list(_REGISTRY.keys()))
"
```

- [ ] **Step 9.3: Verify Protocol conformance for all backends**

```bash
uv run python -c "
from backend.backends.base import DatabaseBackend
from backend.backends.duckdb import DuckDBBackend
from backend.backends.sqlite import SQLiteBackend
from backend.backends.postgresql import PostgreSQLBackend
from backend.backends.databricks import DatabricksBackend

for cls in (DuckDBBackend, SQLiteBackend, PostgreSQLBackend, DatabricksBackend):
    b = cls()
    assert isinstance(b, DatabaseBackend), f'{cls.__name__} fails Protocol check'
    print(f'{cls.__name__}: dialect={b.dialect_name}, use_pool={b.use_pool}')
"
```

Expected: 4 lines, each showing dialect and use_pool values.

- [ ] **Step 9.4: Final commit**

```bash
git add -A
git commit -m "chore: verify db-backends-plugin refactor complete"
```

---

## Notes

- `sql_builder.py` is intentionally left unchanged — it is a deprecated shim. New code uses `backend.*` SQL fragment methods. Remove in a future PR.
- `connection_executor.py` is unchanged (thin re-export module).
- To add a new engine: create `backend/backends/<engine>/`, implement `DatabaseBackend`, add to `_REGISTRY` in `backend/backends/__init__.py`, add to `DbType` Literal in `api/connections/models.py`.
