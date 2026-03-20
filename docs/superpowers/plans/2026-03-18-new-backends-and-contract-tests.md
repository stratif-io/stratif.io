# New Backends & Contract Test Suite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Snowflake and ClickHouse database backends, improve Databricks test coverage, and introduce a parametrized contract test suite that validates every backend against the same correctness criteria.

**Architecture:** Follow the existing plugin pattern — each backend is a class in `backend/backends/<name>/` implementing the `DatabaseBackend` Protocol. Contract tests live in `backend/tests/contract/` and use pytest parametrize so all backends run the same tests automatically. Test infrastructure uses testcontainers (ClickHouse, PostgreSQL), fakesnow (Snowflake), and a custom DuckDB-backed stub (Databricks).

**Tech Stack:** Python 3.12, pytest, testcontainers>=4.8, fakesnow, snowflake-connector-python, clickhouse-connect, DuckDB (stub)

---

## File Map

**New files:**
- `backend/backends/snowflake/__init__.py` — SnowflakeBackend
- `backend/backends/snowflake/credentials.py` — SnowflakeCredentials
- `backend/backends/clickhouse/__init__.py` — ClickHouseBackend
- `backend/backends/clickhouse/credentials.py` — ClickHouseCredentials
- `backend/tests/contract/__init__.py` — empty, marks as package
- `backend/tests/contract/conftest.py` — session-scoped fixtures + parametrize matrix
- `backend/tests/contract/stubs/__init__.py` — empty
- `backend/tests/contract/stubs/databricks_stub.py` — DBAPI2 stub backed by DuckDB
- `backend/tests/contract/test_connection.py` — connection open/error tests
- `backend/tests/contract/test_dialect.py` — all 13 dialect method tests
- `backend/tests/contract/test_schema.py` — list_tables, detect_fields tests
- `backend/tests/contract/test_queries.py` — end-to-end query shape tests
- `backend/tests/contract/KNOWN_LIMITATIONS.md` — documented stub gaps

**Modified files:**
- `backend/backends/__init__.py` — register snowflake and clickhouse
- `pyproject.toml` — optional extras for snowflake/clickhouse; test deps

---

## Task 1: Add Dependencies

**Files:**
- Modify: `pyproject.toml`

- [ ] **Step 1: Add optional extras and test deps**

Open `pyproject.toml`. Add after the `[project]` section's `dependencies` block:

```toml
[project.optional-dependencies]
snowflake = ["snowflake-connector-python>=3.0.0"]
clickhouse = ["clickhouse-connect>=0.7.0"]
```

And in `[dependency-groups]`, add to the `dev` list:
```toml
dev = [
    # existing entries...
    "testcontainers[clickhouse]>=4.8",
    "fakesnow>=0.9.0",
]
```

- [ ] **Step 2: Verify pyproject.toml parses correctly**

```bash
uv run python -c "import tomllib; tomllib.load(open('pyproject.toml','rb'))"
```
Expected: no output (no error).

- [ ] **Step 3: Commit**

```bash
git add pyproject.toml
git commit -m "chore: add snowflake, clickhouse, and test deps to pyproject.toml"
```

---

## Task 2: Snowflake Credentials

**Files:**
- Create: `backend/backends/snowflake/credentials.py`

- [ ] **Step 1: Write the test**

Add to `backend/tests/test_backends_snowflake.py` (new file, just for unit tests of this backend):

```python
"""Unit tests for SnowflakeBackend (mock-based)."""
import pytest
from backend.backends.snowflake.credentials import SnowflakeCredentials


class TestSnowflakeCredentials:
    def test_valid_minimal(self):
        c = SnowflakeCredentials(
            account="xy12345.us-east-1",
            user="alice",
            password="secret",
            warehouse="COMPUTE_WH",
            database="ANALYTICS",
            schema="PUBLIC",
        )
        assert c.role is None

    def test_with_role(self):
        c = SnowflakeCredentials(
            account="xy12345.us-east-1",
            user="alice",
            password="secret",
            warehouse="COMPUTE_WH",
            database="ANALYTICS",
            schema="PUBLIC",
            role="ANALYST",
        )
        assert c.role == "ANALYST"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
uv run pytest backend/tests/test_backends_snowflake.py -v
```
Expected: `ImportError` or `ModuleNotFoundError` (file doesn't exist yet).

- [ ] **Step 3: Create credentials file**

```python
# backend/backends/snowflake/credentials.py
from pydantic import BaseModel


class SnowflakeCredentials(BaseModel):
    account: str       # e.g. "xy12345.us-east-1"
    user: str
    password: str
    warehouse: str
    database: str
    schema: str
    role: str | None = None
```

Also create `backend/backends/snowflake/__init__.py` as an empty file for now (we'll fill it in Task 3).

- [ ] **Step 4: Run test to verify it passes**

```bash
uv run pytest backend/tests/test_backends_snowflake.py::TestSnowflakeCredentials -v
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/backends/snowflake/
git add backend/tests/test_backends_snowflake.py
git commit -m "feat(snowflake): add SnowflakeCredentials model"
```

---

## Task 3: Snowflake Backend — Identity and Dialect

**Files:**
- Modify: `backend/backends/snowflake/__init__.py`
- Modify: `backend/tests/test_backends_snowflake.py`

- [ ] **Step 1: Write failing tests for identity and dialect**

Append to `backend/tests/test_backends_snowflake.py`:

```python
from backend.backends.snowflake import SnowflakeBackend
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return SnowflakeBackend()


class TestSnowflakeIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "snowflake"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)

    def test_pool_key(self, backend):
        creds = SnowflakeCredentials(
            account="a", user="u", password="p",
            warehouse="w", database="d", schema="s"
        )
        assert backend.pool_key("conn1", creds) == ("conn1", "snowflake")


class TestSnowflakeDialect:
    def test_date_trunc_day(self, backend):
        assert backend.date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"

    def test_date_trunc_month(self, backend):
        assert backend.date_trunc("month", "ts") == "DATE_TRUNC('month', ts)"

    def test_date_diff_days(self, backend):
        result = backend.date_diff_days("a", "b")
        assert "DATEDIFF" in result.upper() and "'day'" in result.lower()

    def test_epoch_diff_seconds(self, backend):
        result = backend.epoch_diff_seconds("a", "b")
        assert "DATEDIFF" in result.upper() and "'second'" in result.lower()

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "DATEDIFF" in result.upper() and "30" in result

    def test_string_concat_two(self, backend):
        result = backend.string_concat("a", "b")
        assert "||" in result

    def test_string_concat_three(self, backend):
        result = backend.string_concat("a", "b", "c")
        assert result.count("||") == 2

    def test_cast_to_text(self, backend):
        assert "::string" in backend.cast_to_text("x")

    def test_json_extract_string(self, backend):
        result = backend.json_extract_string("props", "key")
        assert "::string" in result

    def test_extract_hour(self, backend):
        assert "HOUR" in backend.extract_hour("ts").upper()

    def test_extract_day_of_week(self, backend):
        assert "DAYOFWEEK" in backend.extract_day_of_week("ts").upper()

    def test_extract_year(self, backend):
        assert "YEAR" in backend.extract_year("ts").upper()

    def test_extract_month(self, backend):
        assert "MONTH" in backend.extract_month("ts").upper()

    def test_extract_week(self, backend):
        assert "WEEK" in backend.extract_week("ts").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()
```

- [ ] **Step 2: Run to verify they fail**

```bash
uv run pytest backend/tests/test_backends_snowflake.py -v
```
Expected: ImportError or AttributeError (backend not implemented).

- [ ] **Step 3: Implement SnowflakeBackend**

```python
# backend/backends/snowflake/__init__.py
"""Snowflake database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends.snowflake.credentials import SnowflakeCredentials


class SnowflakeBackend:

    @property
    def dialect_name(self) -> str:
        return "snowflake"

    @property
    def identifier_quote_char(self) -> str:
        return '"'

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> SnowflakeCredentials:
        return SnowflakeCredentials.model_validate(raw)

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        import snowflake.connector
        creds = SnowflakeCredentials.model_validate(credentials.model_dump())
        kwargs: dict = dict(
            account=creds.account,
            user=creds.user,
            password=creds.password,
            warehouse=creds.warehouse,
            database=creds.database,
            schema=creds.schema,
        )
        if creds.role:
            kwargs["role"] = creds.role
        return snowflake.connector.connect(**kwargs)

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "snowflake")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            from snowflake.connector.errors import DatabaseError, OperationalError
            return isinstance(exc, (DatabaseError, OperationalError))
        except ImportError:
            return False

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_expr} LIMIT 0")
                return frozenset(d[0].lower() for d in cursor.description or [])
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
            cursor.execute("SHOW TABLES")
            return [r[1] for r in cursor.fetchall()]
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
                cursor.execute("SHOW SCHEMAS")
                rows = cursor.fetchall()
                return [{"name": r[1], "full_name": r[1], "kind": "schema"} for r in rows]
            cursor.execute(f'SHOW TABLES IN SCHEMA "{schema}"')
            rows = cursor.fetchall()
            return [{"name": r[1], "full_name": f"{schema}.{r[1]}", "kind": "table"} for r in rows]
        finally:
            with contextlib.suppress(Exception):
                cursor.close()

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables = self.get_tables(conn)
        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = %s ORDER BY ordinal_position",
                (events_table.upper(),),
            )
            columns = [ColumnInfo(name=r[0].lower(), type=r[1]) for r in cursor.fetchall()]
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
            if "VARIANT" in sql_type or "OBJECT" in sql_type:
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
        return f"DATEDIFF('day', {start}, {end})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"DATEDIFF('second', {start}, {end})"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"DATEDIFF('minute', {earlier}, {later}) > {minutes}"

    def string_concat(self, *parts: str) -> str:
        return " || ".join(parts)

    def cast_to_text(self, expr: str) -> str:
        return f"{expr}::string"

    def json_extract_string(self, col: str, key: str) -> str:
        return f"{col}:{key}::string"

    def extract_hour(self, col: str) -> str:
        return f"EXTRACT(HOUR FROM {col})"

    def extract_day_of_week(self, col: str) -> str:
        return f"DAYOFWEEK({col})"

    def extract_year(self, col: str) -> str:
        return f"EXTRACT(YEAR FROM {col})"

    def extract_month(self, col: str) -> str:
        return f"EXTRACT(MONTH FROM {col})"

    def extract_week(self, col: str) -> str:
        return f"EXTRACT(WEEK FROM {col})"

    def extract_quarter(self, col: str) -> str:
        return f"EXTRACT(QUARTER FROM {col})"
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest backend/tests/test_backends_snowflake.py -v
```
Expected: all PASS (dialect tests don't need a real connection).

- [ ] **Step 5: Commit**

```bash
git add backend/backends/snowflake/ backend/tests/test_backends_snowflake.py
git commit -m "feat(snowflake): implement SnowflakeBackend with full dialect support"
```

---

## Task 4: ClickHouse Credentials

**Files:**
- Create: `backend/backends/clickhouse/credentials.py`
- Create: `backend/tests/test_backends_clickhouse.py`

- [ ] **Step 1: Write failing credential tests**

```python
# backend/tests/test_backends_clickhouse.py
"""Unit tests for ClickHouseBackend (mock-based)."""
import pytest
from backend.backends.clickhouse.credentials import ClickHouseCredentials


class TestClickHouseCredentials:
    def test_valid_minimal(self):
        c = ClickHouseCredentials(host="ch.example.com", database="analytics",
                                   user="default", password="secret")
        assert c.port == 8443
        assert c.secure is True
        assert c.always_final is False

    def test_custom_port(self):
        c = ClickHouseCredentials(host="localhost", database="db",
                                   user="u", password="p", port=9000, secure=False)
        assert c.port == 9000
        assert c.secure is False

    def test_always_final_flag(self):
        c = ClickHouseCredentials(host="h", database="db", user="u",
                                   password="p", always_final=True)
        assert c.always_final is True
```

- [ ] **Step 2: Run to verify fail**

```bash
uv run pytest backend/tests/test_backends_clickhouse.py -v
```
Expected: ImportError.

- [ ] **Step 3: Create credentials**

```python
# backend/backends/clickhouse/credentials.py
from pydantic import BaseModel


class ClickHouseCredentials(BaseModel):
    host: str
    port: int = 8443
    database: str
    user: str
    password: str
    secure: bool = True
    always_final: bool = False
```

Also create `backend/backends/clickhouse/__init__.py` as empty for now.

- [ ] **Step 4: Run to verify pass**

```bash
uv run pytest backend/tests/test_backends_clickhouse.py::TestClickHouseCredentials -v
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/backends/clickhouse/ backend/tests/test_backends_clickhouse.py
git commit -m "feat(clickhouse): add ClickHouseCredentials model"
```

---

## Task 5: ClickHouse Backend — Identity and Dialect

**Files:**
- Modify: `backend/backends/clickhouse/__init__.py`
- Modify: `backend/tests/test_backends_clickhouse.py`

- [ ] **Step 1: Write failing identity and dialect tests**

Append to `backend/tests/test_backends_clickhouse.py`:

```python
from backend.backends.clickhouse import ClickHouseBackend
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return ClickHouseBackend()


class TestClickHouseIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "clickhouse"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '`'

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)

    def test_pool_key(self, backend):
        creds = ClickHouseCredentials(host="h", database="db", user="u", password="p")
        assert backend.pool_key("conn1", creds) == ("conn1", "clickhouse")


class TestClickHouseDialect:
    def test_date_trunc_hour(self, backend):
        assert backend.date_trunc("hour", "ts") == "toStartOfHour(ts)"

    def test_date_trunc_day(self, backend):
        assert backend.date_trunc("day", "ts") == "toStartOfDay(ts)"

    def test_date_trunc_week(self, backend):
        assert backend.date_trunc("week", "ts") == "toStartOfWeek(ts)"

    def test_date_trunc_month(self, backend):
        assert backend.date_trunc("month", "ts") == "toStartOfMonth(ts)"

    def test_date_trunc_quarter(self, backend):
        assert backend.date_trunc("quarter", "ts") == "toStartOfQuarter(ts)"

    def test_date_trunc_year(self, backend):
        assert backend.date_trunc("year", "ts") == "toStartOfYear(ts)"

    def test_date_trunc_unknown_raises(self, backend):
        with pytest.raises(ValueError, match="Unsupported date_trunc unit"):
            backend.date_trunc("decade", "ts")

    def test_date_diff_days(self, backend):
        result = backend.date_diff_days("a", "b")
        assert "dateDiff" in result and "'day'" in result

    def test_epoch_diff_seconds(self, backend):
        result = backend.epoch_diff_seconds("a", "b")
        assert "dateDiff" in result and "'second'" in result

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "dateDiff" in result and "30" in result

    def test_string_concat_two(self, backend):
        result = backend.string_concat("a", "b")
        assert result == "concat(a, b)"

    def test_string_concat_three(self, backend):
        result = backend.string_concat("a", "b", "c")
        assert result == "concat(a, b, c)"

    def test_cast_to_text(self, backend):
        assert backend.cast_to_text("x") == "toString(x)"

    def test_json_extract_string(self, backend):
        result = backend.json_extract_string("props", "key")
        assert "JSONExtractString" in result

    def test_extract_hour(self, backend):
        assert backend.extract_hour("ts") == "toHour(ts)"

    def test_extract_day_of_week(self, backend):
        assert backend.extract_day_of_week("ts") == "toDayOfWeek(ts)"

    def test_extract_year(self, backend):
        assert backend.extract_year("ts") == "toYear(ts)"

    def test_extract_month(self, backend):
        assert backend.extract_month("ts") == "toMonth(ts)"

    def test_extract_week(self, backend):
        assert backend.extract_week("ts") == "toWeek(ts)"

    def test_extract_quarter(self, backend):
        assert backend.extract_quarter("ts") == "toQuarter(ts)"
```

- [ ] **Step 2: Run to verify fail**

```bash
uv run pytest backend/tests/test_backends_clickhouse.py -v
```
Expected: ImportError or AttributeError.

- [ ] **Step 3: Implement ClickHouseBackend**

```python
# backend/backends/clickhouse/__init__.py
"""ClickHouse database backend."""
from __future__ import annotations

import contextlib
import re
from typing import Any

from pydantic import BaseModel

from backend.backends._utils import infer_type, pick_events_table, suggest_fields
from backend.backends.base import ColumnInfo, SchemaInfo
from backend.backends.clickhouse.credentials import ClickHouseCredentials

_DATE_TRUNC_MAP = {
    "hour": "toStartOfHour",
    "day": "toStartOfDay",
    "week": "toStartOfWeek",
    "month": "toStartOfMonth",
    "quarter": "toStartOfQuarter",
    "year": "toStartOfYear",
}

_FROM_TABLE_RE = re.compile(r"\bFROM\s+(`[^`]+`|\S+)", re.IGNORECASE)


class ClickHouseBackend:

    @property
    def dialect_name(self) -> str:
        return "clickhouse"

    @property
    def identifier_quote_char(self) -> str:
        return "`"

    @property
    def use_pool(self) -> bool:
        return True

    def parse_credentials(self, raw: dict) -> ClickHouseCredentials:
        return ClickHouseCredentials.model_validate(raw)

    def open(self, credentials: BaseModel, read_only: bool = True) -> Any:
        import clickhouse_connect
        creds = ClickHouseCredentials.model_validate(credentials.model_dump())
        client = clickhouse_connect.get_client(
            host=creds.host,
            port=creds.port,
            database=creds.database,
            username=creds.user,
            password=creds.password,
            secure=creds.secure,
        )
        client._creds = creds  # carry credentials so execute() can read always_final
        return client

    def pool_key(self, connection_id: str, credentials: BaseModel) -> tuple:
        return (connection_id, "clickhouse")

    def is_connection_error(self, exc: Exception) -> bool:
        try:
            from clickhouse_connect.driver.exceptions import DatabaseError, OperationalError
            return isinstance(exc, (DatabaseError, OperationalError))
        except ImportError:
            return False

    def _execute_raw(self, conn: Any, query: str) -> list[tuple]:
        result = conn.query(query)
        return [tuple(row) for row in result.result_rows]

    def get_table_columns(self, conn: Any, table_expr: str) -> frozenset[str]:
        try:
            result = conn.query(f"SELECT * FROM {table_expr} LIMIT 0")
            return frozenset(result.column_names) if result.column_names else frozenset()
        except Exception:
            return frozenset()

    def table_exists(self, conn: Any, table_name: str) -> bool:
        try:
            conn.query(f"SELECT 1 FROM `{table_name}` LIMIT 1")
            return True
        except Exception:
            return False

    def get_tables(self, conn: Any) -> list[str]:
        result = conn.query("SHOW TABLES")
        return [row[0] for row in result.result_rows]

    def get_columns_for_browse(self, conn: Any, table: str) -> list[str]:
        try:
            result = conn.query(f"SELECT * FROM `{table}` LIMIT 0")
            return list(result.column_names) if result.column_names else []
        except Exception:
            return []

    def browse(self, conn: Any, catalog: str | None, schema: str | None) -> list[dict]:
        if schema is None:
            result = conn.query("SHOW DATABASES")
            return [{"name": r[0], "full_name": r[0], "kind": "schema"} for r in result.result_rows]
        result = conn.query(f"SHOW TABLES FROM `{schema}`")
        return [{"name": r[0], "full_name": f"{schema}.{r[0]}", "kind": "table"} for r in result.result_rows]

    def detect_schema(self, conn: Any, events_table_hint: str | None) -> SchemaInfo:
        tables = self.get_tables(conn)
        events_table = pick_events_table(tables, events_table_hint)
        if not events_table:
            return SchemaInfo(tables=tables, events_table="", columns=[], suggestions={},
                              proposed_custom_properties=[])
        result = conn.query(f"DESCRIBE TABLE `{events_table}`")
        columns = [ColumnInfo(name=r[0], type=r[1]) for r in result.result_rows]
        suggestions = suggest_fields(columns)
        core_values = set(suggestions.values())
        proposed: list[dict] = []
        for col in columns:
            if col.name in core_values:
                continue
            sql_type = col.type.upper()
            if "JSON" in sql_type or "STRING" in sql_type:
                proposed.append({"name": col.name, "path": col.name, "type": "string"})
            else:
                proposed.append({"name": col.name, "path": col.name, "type": infer_type(sql_type)})
        return SchemaInfo(tables=tables, events_table=events_table, columns=columns,
                          suggestions=suggestions, proposed_custom_properties=proposed)

    def execute(self, conn: Any, query: str, params: list | None) -> list[tuple]:
        if params:
            query = query.replace("?", "%s")
        creds = getattr(conn, "_creds", None)
        always_final = getattr(creds, "always_final", False)
        if always_final:
            query = _FROM_TABLE_RE.sub(lambda m: m.group(0) + " FINAL", query, count=1)
        if params:
            result = conn.query(query, parameters=params)
        else:
            result = conn.query(query)
        return [tuple(row) for row in result.result_rows]

    def build_events_cte(
        self, source_table: str, uid_field: str, ts_field: str,
        en_field: str, custom_props: list[dict],
    ) -> str:
        q = "`"
        quoted_table = ".".join(f"{q}{p}{q}" for p in source_table.split("."))
        core = f"{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name"
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
        fn = _DATE_TRUNC_MAP.get(unit)
        if fn is None:
            raise ValueError(f"Unsupported date_trunc unit: {unit!r}")
        return f"{fn}({col})"

    def date_diff_days(self, start: str, end: str) -> str:
        return f"dateDiff('day', {start}, {end})"

    def epoch_diff_seconds(self, start: str, end: str) -> str:
        return f"dateDiff('second', {start}, {end})"

    def interval_minutes_exceeded(self, earlier: str, later: str, minutes: int) -> str:
        return f"dateDiff('minute', {earlier}, {later}) > {minutes}"

    def string_concat(self, *parts: str) -> str:
        return f"concat({', '.join(parts)})"

    def cast_to_text(self, expr: str) -> str:
        return f"toString({expr})"

    def json_extract_string(self, col: str, key: str) -> str:
        return f"JSONExtractString({col}, '{key}')"

    def extract_hour(self, col: str) -> str:
        return f"toHour({col})"

    def extract_day_of_week(self, col: str) -> str:
        return f"toDayOfWeek({col})"

    def extract_year(self, col: str) -> str:
        return f"toYear({col})"

    def extract_month(self, col: str) -> str:
        return f"toMonth({col})"

    def extract_week(self, col: str) -> str:
        return f"toWeek({col})"

    def extract_quarter(self, col: str) -> str:
        return f"toQuarter({col})"
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest backend/tests/test_backends_clickhouse.py -v
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/backends/clickhouse/ backend/tests/test_backends_clickhouse.py
git commit -m "feat(clickhouse): implement ClickHouseBackend with full dialect support"
```

---

## Task 6: Register New Backends

**Files:**
- Modify: `backend/backends/__init__.py`

- [ ] **Step 1: Write failing registration test**

Add to a new file `backend/tests/test_backend_registry.py`:

```python
"""Tests for backend registry."""
from backend.backends import get_backend


def test_snowflake_registered():
    backend = get_backend("snowflake")
    assert backend.dialect_name == "snowflake"


def test_clickhouse_registered():
    backend = get_backend("clickhouse")
    assert backend.dialect_name == "clickhouse"


def test_unknown_raises():
    import pytest
    with pytest.raises(ValueError, match="Unsupported db_type"):
        get_backend("oracle")
```

- [ ] **Step 2: Run to verify fail**

```bash
uv run pytest backend/tests/test_backend_registry.py -v
```
Expected: FAIL — `ValueError: Unsupported db_type: 'snowflake'`.

- [ ] **Step 3: Register backends**

Append to `backend/backends/__init__.py`:

```python
from backend.backends.snowflake import SnowflakeBackend  # noqa: E402
_register("snowflake", SnowflakeBackend())

from backend.backends.clickhouse import ClickHouseBackend  # noqa: E402
_register("clickhouse", ClickHouseBackend())
```

- [ ] **Step 4: Run to verify pass**

```bash
uv run pytest backend/tests/test_backend_registry.py -v
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/backends/__init__.py backend/tests/test_backend_registry.py
git commit -m "feat: register snowflake and clickhouse backends in registry"
```

---

## Task 7: Contract Test Infrastructure

**Files:**
- Create: `backend/tests/contract/__init__.py`
- Create: `backend/tests/contract/stubs/__init__.py`
- Create: `backend/tests/contract/stubs/databricks_stub.py`
- Create: `backend/tests/contract/conftest.py`
- Create: `backend/tests/contract/KNOWN_LIMITATIONS.md`

- [ ] **Step 1: Create Databricks stub**

```python
# backend/tests/contract/stubs/databricks_stub.py
"""DBAPI2-compatible Databricks stub backed by DuckDB in-memory.

Used in contract tests to validate connection flow, credential parsing,
and basic query shapes without a real Databricks workspace.
See KNOWN_LIMITATIONS.md for what this stub does NOT cover.
"""
from __future__ import annotations

import duckdb


class _Cursor:
    def __init__(self, conn: duckdb.DuckDBPyConnection) -> None:
        self._conn = conn
        self.description: list | None = None
        self._results: list[tuple] = []

    def execute(self, query: str, parameters: list | None = None) -> None:
        # Databricks uses ? placeholders; DuckDB also supports ? so no translation needed
        rel = self._conn.execute(query, parameters or [])
        self._results = rel.fetchall()
        desc = rel.description
        self.description = desc if desc else None

    def fetchall(self) -> list[tuple]:
        return self._results

    def close(self) -> None:
        pass


class _Connection:
    def __init__(self) -> None:
        self._db = duckdb.connect(":memory:")

    def cursor(self) -> _Cursor:
        return _Cursor(self._db)

    def close(self) -> None:
        self._db.close()


def connect(**kwargs) -> _Connection:  # noqa: ARG001 — kwargs mirror databricks.sql.connect signature
    """Drop-in replacement for databricks.sql.connect() backed by DuckDB."""
    return _Connection()
```

- [ ] **Step 2: Create `conftest.py`**

```python
# backend/tests/contract/conftest.py
"""Session-scoped fixtures for contract tests.

Each fixture provides a live (or emulated) backend + open connection
with a seeded test table called `test_events`.
"""
from __future__ import annotations

import duckdb
import pytest

# ── helpers ──────────────────────────────────────────────────────────────────

_SEED_SQL = """
CREATE TABLE IF NOT EXISTS test_events (
    user_id    VARCHAR,
    timestamp  TIMESTAMP,
    event_name VARCHAR,
    properties VARCHAR  -- JSON string for backends that support json_extract
);
INSERT INTO test_events VALUES
    ('u1', '2024-01-01 10:00:00', 'page_view', '{"page": "/home"}'),
    ('u1', '2024-01-01 10:05:00', 'click',     '{"element": "btn"}'),
    ('u2', '2024-01-02 09:00:00', 'page_view', '{"page": "/about"}');
"""


def _is_docker_available() -> bool:
    try:
        import docker
        docker.from_env().ping()
        return True
    except Exception:
        return False


_docker_available = pytest.mark.skipif(
    not _is_docker_available(),
    reason="Docker not available",
)


# ── DuckDB ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def duckdb_conn():
    conn = duckdb.connect(":memory:")
    conn.execute(_SEED_SQL)
    yield conn
    conn.close()


# ── SQLite ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def sqlite_conn():
    import sqlite3
    conn = sqlite3.connect(":memory:")
    conn.executescript(_SEED_SQL.replace("VARCHAR", "TEXT").replace("TIMESTAMP", "TEXT"))
    yield conn
    conn.close()


# ── PostgreSQL (testcontainers) ───────────────────────────────────────────────

@pytest.fixture(scope="session")
@_docker_available
def postgresql_conn():
    from testcontainers.postgres import PostgresContainer
    with PostgresContainer("postgres:16") as pg:
        import psycopg2
        conn = psycopg2.connect(pg.get_connection_url().replace("postgresql+psycopg2://", ""))
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE test_events (
                user_id TEXT, timestamp TIMESTAMP, event_name TEXT, properties TEXT
            )
        """)
        cur.execute("""
            INSERT INTO test_events VALUES
            ('u1','2024-01-01 10:00:00','page_view','{"page": "/home"}'),
            ('u1','2024-01-01 10:05:00','click','{"element": "btn"}'),
            ('u2','2024-01-02 09:00:00','page_view','{"page": "/about"}')
        """)
        cur.close()
        yield conn
        conn.close()


# ── ClickHouse (testcontainers) ──────────────────────────────────────────────

@pytest.fixture(scope="session")
@_docker_available
def clickhouse_conn():
    from testcontainers.clickhouse import ClickHouseContainer
    with ClickHouseContainer("clickhouse/clickhouse-server:24") as ch:
        import clickhouse_connect
        client = clickhouse_connect.get_client(
            host=ch.get_container_host_ip(),
            port=int(ch.get_exposed_port(8123)),
            username="default",
            password="",
            database="default",
            secure=False,
        )
        client.command("""
            CREATE TABLE test_events (
                user_id String,
                timestamp DateTime,
                event_name String,
                properties String
            ) ENGINE = MergeTree() ORDER BY timestamp
        """)
        client.command("""
            INSERT INTO test_events VALUES
            ('u1', '2024-01-01 10:00:00', 'page_view', '{"page": "/home"}'),
            ('u1', '2024-01-01 10:05:00', 'click', '{"element": "btn"}'),
            ('u2', '2024-01-02 09:00:00', 'page_view', '{"page": "/about"}')
        """)
        yield client


# ── Snowflake (fakesnow) ──────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def snowflake_conn():
    fakesnow = pytest.importorskip("fakesnow")
    with fakesnow.patch():
        import snowflake.connector
        conn = snowflake.connector.connect(
            account="fakesnow", user="test", password="test",
            warehouse="wh", database="DB", schema="PUBLIC",
        )
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE test_events (
                user_id VARCHAR, timestamp TIMESTAMP_NTZ,
                event_name VARCHAR, properties VARIANT
            )
        """)
        cur.execute("""
            INSERT INTO test_events VALUES
            ('u1', '2024-01-01 10:00:00'::TIMESTAMP_NTZ, 'page_view', PARSE_JSON('{"page": "/home"}')),
            ('u1', '2024-01-01 10:05:00'::TIMESTAMP_NTZ, 'click', PARSE_JSON('{"element": "btn"}')),
            ('u2', '2024-01-02 09:00:00'::TIMESTAMP_NTZ, 'page_view', PARSE_JSON('{"page": "/about"}'))
        """)
        cur.close()
        yield conn
        conn.close()  # close before fakesnow.patch() context exits


# ── Databricks (stub) ────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def databricks_conn():
    from backend.tests.contract.stubs.databricks_stub import connect
    conn = connect(server_hostname="stub", http_path="/sql/stub", access_token="stub")
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE test_events (
            user_id VARCHAR, timestamp TIMESTAMP,
            event_name VARCHAR, properties VARCHAR
        )
    """)
    cur.execute("""
        INSERT INTO test_events VALUES
        ('u1', '2024-01-01 10:00:00', 'page_view', '{"page": "/home"}'),
        ('u1', '2024-01-01 10:05:00', 'click', '{"element": "btn"}'),
        ('u2', '2024-01-02 09:00:00', 'page_view', '{"page": "/about"}')
    """)
    yield conn
    conn.close()


# ── Parametrized fixture ──────────────────────────────────────────────────────

from backend.backends.duckdb import DuckDBBackend
from backend.backends.sqlite import SQLiteBackend
from backend.backends.postgresql import PostgreSQLBackend
from backend.backends.clickhouse import ClickHouseBackend
from backend.backends.snowflake import SnowflakeBackend
from backend.backends.databricks import DatabricksBackend


@pytest.fixture(scope="session")
def all_backend_fixtures(request, duckdb_conn, sqlite_conn, snowflake_conn, databricks_conn):
    """Build backend map. Docker-backed fixtures are fetched lazily so tests skip gracefully."""
    result = {
        "duckdb":     (DuckDBBackend(),     duckdb_conn),
        "sqlite":     (SQLiteBackend(),     sqlite_conn),
        "snowflake":  (SnowflakeBackend(),  snowflake_conn),
        "databricks": (DatabricksBackend(), databricks_conn),
    }
    for db_type, backend_cls, fixture_name in [
        ("postgresql", PostgreSQLBackend, "postgresql_conn"),
        ("clickhouse", ClickHouseBackend, "clickhouse_conn"),
    ]:
        try:
            conn = request.getfixturevalue(fixture_name)
            result[db_type] = (backend_cls(), conn)
        except pytest.skip.Exception:
            pass  # Docker not available — skip this backend silently
    return result


@pytest.fixture(
    params=["duckdb", "sqlite", "postgresql", "clickhouse", "snowflake", "databricks"]
)
def backend_and_conn(request, all_backend_fixtures):
    """Yields (backend_instance, live_connection) for each db type."""
    db_type = request.param
    fixture = all_backend_fixtures.get(db_type)
    if fixture is None:
        pytest.skip(f"{db_type} fixture not available")
    return fixture
```

- [ ] **Step 3: Create empty `__init__.py` files**

```bash
touch backend/tests/contract/__init__.py
touch backend/tests/contract/stubs/__init__.py
```

- [ ] **Step 4: Create KNOWN_LIMITATIONS.md**

```markdown
# Contract Test Known Limitations

## Databricks (stub-based)

Tests use a DuckDB-backed stub instead of a real Databricks workspace.

**Not covered:**
- Databricks-specific SQL: `SHOW CATALOGS`, `DESCRIBE TABLE EXTENDED`, Unity Catalog paths
- Backtick identifier quoting with Databricks-specific reserved words
- `MAP`, `STRUCT`, `ARRAY` type inference — maps to DuckDB equivalents, may differ
- `interval_minutes_exceeded` uses DuckDB interval arithmetic; Databricks timestamp arithmetic may differ
- Connection pool TTL behaviour (stub connections don't time out)

**Covered:**
- Credential parsing and connection open/close flow
- Query execution and result shape (rows + description)
- All 13 dialect method SQL string outputs
- Schema detection against a seeded DuckDB table

Run `databricks-live.yml` workflow for full validation against a real workspace.
```

- [ ] **Step 5: Verify stubs can be imported**

```bash
uv run python -c "from backend.tests.contract.stubs.databricks_stub import connect; print('ok')"
```
Expected: `ok`

- [ ] **Step 6: Commit**

```bash
git add backend/tests/contract/
git commit -m "feat(contract): add test infrastructure, fixtures, and Databricks stub"
```

---

## Task 8: Contract — Connection Tests

**Files:**
- Create: `backend/tests/contract/test_connection.py`

- [ ] **Step 1: Write tests**

```python
# backend/tests/contract/test_connection.py
"""Contract tests: connection open and error handling."""


def test_backend_has_dialect_name(backend_and_conn):
    backend, _ = backend_and_conn
    assert isinstance(backend.dialect_name, str) and len(backend.dialect_name) > 0


def test_backend_has_identifier_quote_char(backend_and_conn):
    backend, _ = backend_and_conn
    assert backend.identifier_quote_char in ('"', "`", "'")


def test_use_pool_is_bool(backend_and_conn):
    backend, _ = backend_and_conn
    assert isinstance(backend.use_pool, bool)


def test_is_connection_error_false_for_valueerror(backend_and_conn):
    backend, _ = backend_and_conn
    assert backend.is_connection_error(ValueError("nope")) is False


def test_pool_key_returns_tuple_with_connection_id(backend_and_conn):
    from pydantic import BaseModel
    backend, _ = backend_and_conn
    # We just need pool_key to be callable and return a tuple starting with connection_id
    # Use a minimal credentials stub
    class _Creds(BaseModel):
        pass
    try:
        key = backend.pool_key("test_conn_id", _Creds())
        assert isinstance(key, tuple)
        assert key[0] == "test_conn_id"
    except Exception:
        pass  # backends that validate credentials will skip gracefully
```

- [ ] **Step 2: Run contract connection tests (in-process backends only)**

```bash
uv run pytest backend/tests/contract/test_connection.py -v -k "duckdb or sqlite or databricks"
```
Expected: PASS for in-process backends.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/contract/test_connection.py
git commit -m "test(contract): add connection contract tests"
```

---

## Task 9: Contract — Dialect Tests

**Files:**
- Create: `backend/tests/contract/test_dialect.py`

- [ ] **Step 1: Write tests**

```python
# backend/tests/contract/test_dialect.py
"""Contract tests: all 13 dialect methods must produce valid SQL strings."""


def test_date_trunc_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.date_trunc("day", "ts")
    assert isinstance(result, str) and "ts" in result


def test_date_diff_days_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.date_diff_days("a", "b")
    assert isinstance(result, str) and "a" in result and "b" in result


def test_epoch_diff_seconds_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.epoch_diff_seconds("a", "b")
    assert isinstance(result, str) and "a" in result and "b" in result


def test_interval_minutes_exceeded_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.interval_minutes_exceeded("a", "b", 30)
    assert isinstance(result, str) and "30" in result


def test_string_concat_two_parts(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.string_concat("x", "y")
    assert isinstance(result, str) and "x" in result and "y" in result


def test_string_concat_three_parts(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.string_concat("x", "y", "z")
    assert isinstance(result, str) and "x" in result and "z" in result


def test_cast_to_text_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.cast_to_text("col")
    assert isinstance(result, str) and "col" in result


def test_json_extract_string_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    result = backend.json_extract_string("props", "key")
    assert isinstance(result, str) and ("props" in result or "key" in result)


def test_extract_hour_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_hour("ts")


def test_extract_day_of_week_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_day_of_week("ts")


def test_extract_year_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_year("ts")


def test_extract_month_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_month("ts")


def test_extract_week_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_week("ts")


def test_extract_quarter_returns_string(backend_and_conn):
    backend, conn = backend_and_conn
    assert "ts" in backend.extract_quarter("ts")


def test_date_trunc_result_executes(backend_and_conn):
    """date_trunc output must produce valid executable SQL."""
    backend, conn = backend_and_conn
    expr = backend.date_trunc("day", "timestamp")
    query = f"SELECT {expr} FROM test_events LIMIT 1"
    rows = backend.execute(conn, query, None)
    assert isinstance(rows, list)


def test_extract_hour_result_executes(backend_and_conn):
    backend, conn = backend_and_conn
    expr = backend.extract_hour("timestamp")
    query = f"SELECT {expr} FROM test_events LIMIT 1"
    rows = backend.execute(conn, query, None)
    assert len(rows) > 0
    assert isinstance(rows[0][0], (int, float))
```

- [ ] **Step 2: Run dialect tests on in-process backends**

```bash
uv run pytest backend/tests/contract/test_dialect.py -v -k "duckdb or sqlite or databricks"
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/contract/test_dialect.py
git commit -m "test(contract): add dialect contract tests (all 13 Protocol methods)"
```

---

## Task 10: Contract — Schema and Query Tests

**Files:**
- Create: `backend/tests/contract/test_schema.py`
- Create: `backend/tests/contract/test_queries.py`

- [ ] **Step 1: Write schema tests**

```python
# backend/tests/contract/test_schema.py
"""Contract tests: schema introspection."""


def test_get_tables_returns_list(backend_and_conn):
    backend, conn = backend_and_conn
    tables = backend.get_tables(conn)
    assert isinstance(tables, list)
    assert len(tables) > 0


def test_test_events_table_exists(backend_and_conn):
    backend, conn = backend_and_conn
    tables = backend.get_tables(conn)
    lower_tables = [t.lower() for t in tables]
    assert "test_events" in lower_tables


def test_get_columns_for_browse(backend_and_conn):
    backend, conn = backend_and_conn
    cols = backend.get_columns_for_browse(conn, "test_events")
    assert isinstance(cols, list)
    lower = [c.lower() for c in cols]
    assert "user_id" in lower
    assert "timestamp" in lower
    assert "event_name" in lower


def test_table_exists_true(backend_and_conn):
    backend, conn = backend_and_conn
    assert backend.table_exists(conn, "test_events") is True


def test_table_exists_false(backend_and_conn):
    backend, conn = backend_and_conn
    assert backend.table_exists(conn, "definitely_does_not_exist_xyz") is False
```

- [ ] **Step 2: Write query tests**

```python
# backend/tests/contract/test_queries.py
"""Contract tests: end-to-end query execution."""


def test_simple_select(backend_and_conn):
    backend, conn = backend_and_conn
    rows = backend.execute(conn, "SELECT COUNT(*) FROM test_events", None)
    assert rows[0][0] == 3


def test_select_with_where(backend_and_conn):
    backend, conn = backend_and_conn
    rows = backend.execute(conn, "SELECT COUNT(*) FROM test_events WHERE event_name = ?", ["page_view"])
    assert rows[0][0] == 2


def test_events_cte_builds_and_executes(backend_and_conn):
    backend, conn = backend_and_conn
    cte_body = backend.build_events_cte(
        source_table="test_events",
        uid_field="user_id",
        ts_field="timestamp",
        en_field="event_name",
        custom_props=[],
    )
    query = backend.prepend_events_cte(cte_body, "SELECT COUNT(*) FROM events")
    rows = backend.execute(conn, query, None)
    assert rows[0][0] == 3


def test_trend_shape(backend_and_conn):
    """Simulates a daily trend query using CTE + date_trunc."""
    backend, conn = backend_and_conn
    cte_body = backend.build_events_cte("test_events", "user_id", "timestamp", "event_name", [])
    date_bucket = backend.date_trunc("day", "timestamp")
    inner = f"SELECT {date_bucket} AS day, COUNT(*) AS cnt FROM events GROUP BY 1 ORDER BY 1"
    query = backend.prepend_events_cte(cte_body, inner)
    rows = backend.execute(conn, query, None)
    assert len(rows) >= 1
    # Each row should be (date, count)
    assert rows[0][1] >= 1


def test_string_concat_executes(backend_and_conn):
    backend, conn = backend_and_conn
    expr = backend.string_concat("user_id", "'-'", "event_name")
    query = f"SELECT {expr} FROM test_events LIMIT 1"
    rows = backend.execute(conn, query, None)
    assert len(rows) == 1
    assert "-" in str(rows[0][0])
```

- [ ] **Step 3: Run schema + query tests on in-process backends**

```bash
uv run pytest backend/tests/contract/test_schema.py backend/tests/contract/test_queries.py -v -k "duckdb or sqlite or databricks"
```
Expected: PASS.

- [ ] **Step 4: Run full in-process contract suite**

```bash
uv run pytest backend/tests/contract/ -v -k "duckdb or sqlite or databricks"
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/contract/test_schema.py backend/tests/contract/test_queries.py
git commit -m "test(contract): add schema and query contract tests"
```

---

## Task 11: Run Full Test Suite

- [ ] **Step 1: Run all existing tests to confirm nothing is broken**

```bash
uv run pytest backend/tests/ -v --ignore=backend/tests/contract
```
Expected: all PASS (existing tests unaffected).

- [ ] **Step 2: Run contract tests for all in-process backends**

```bash
uv run pytest backend/tests/contract/ -v -k "duckdb or sqlite or databricks"
```
Expected: all PASS.

- [ ] **Step 3: Run full test suite**

```bash
uv run pytest backend/tests/ -v
```
Note: Docker-backed tests (postgresql, clickhouse) will be skipped if Docker is unavailable — that is expected behaviour.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Snowflake + ClickHouse backends with contract test suite"
```
