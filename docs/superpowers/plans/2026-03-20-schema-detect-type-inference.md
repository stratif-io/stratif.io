# Schema Detect Type Inference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Infer proper types (`number`, `boolean`, `timestamp`, `string`) for JSON-extracted custom properties during schema detection by sampling real data values with dialect-specific SQL casts.

**Architecture:** Add `sample_property_types(execute_fn, table, prop_exprs, numeric_cast)` to `backend/backends/_utils.py`. Each of three backends (DuckDB, PostgreSQL, SQLite) calls it inside `detect_schema` after building `proposed_custom_properties`, upgrading any `"string"` properties whose sampled values look numeric. Sampling is wrapped in try/except — any failure leaves types unchanged.

**Tech Stack:** Python, Pydantic, DuckDB, PostgreSQL (psycopg2), SQLite3, pytest

---

## Task 1: Add `sample_property_types` to `_utils.py` with unit tests

**Files:**
- Create: `backend/tests/test_backends_utils.py`
- Modify: `backend/backends/_utils.py`

- [ ] 1. Create `backend/tests/test_backends_utils.py` with these failing tests:

```python
"""Tests for backend/_utils.py shared helpers."""
import pytest
from backend.backends._utils import sample_property_types


def test_sample_detects_numeric_property():
    """Non-null MAX result → property upgraded to 'number'."""
    def execute_fn(sql):
        return [(3.14,)]  # single prop, non-null → numeric

    result = sample_property_types(
        execute_fn,
        "events",
        {"total_amount": "json_extract(properties, '$.total_amount')"},
        "CASE WHEN {expr} GLOB '[0-9]*' THEN 1.0 ELSE NULL END",
    )
    assert result == {"total_amount": "number"}


def test_sample_non_numeric_not_upgraded():
    """NULL MAX result → property not in result dict."""
    def execute_fn(sql):
        return [(None,)]  # null → not numeric

    result = sample_property_types(
        execute_fn,
        "events",
        {"label": "json_extract(properties, '$.label')"},
        "CASE WHEN {expr} GLOB '[0-9]*' THEN 1.0 ELSE NULL END",
    )
    assert result == {}


def test_sample_mixed_properties():
    """Multiple props: only non-null ones upgraded."""
    def execute_fn(sql):
        return [(5.0, None, 42.0)]

    result = sample_property_types(
        execute_fn,
        "events",
        {"price": "e1", "name": "e2", "qty": "e3"},
        "TRY_CAST({expr} AS DOUBLE)",
    )
    assert result == {"price": "number", "qty": "number"}
    assert "name" not in result


def test_sample_returns_empty_on_db_exception():
    """Any DB error → empty dict (silent fallback)."""
    def execute_fn(sql):
        raise RuntimeError("db error")

    result = sample_property_types(execute_fn, "events", {"x": "expr"}, "TRY_CAST({expr} AS DOUBLE)")
    assert result == {}


def test_sample_returns_empty_for_empty_props():
    """No properties → empty dict, no query issued."""
    called = []
    def execute_fn(sql):
        called.append(sql)
        return []

    result = sample_property_types(execute_fn, "events", {}, "TRY_CAST({expr} AS DOUBLE)")
    assert result == {}
    assert called == []


def test_sample_returns_empty_when_no_rows():
    """Empty result set → empty dict."""
    result = sample_property_types(lambda sql: [], "events", {"x": "e"}, "TRY_CAST({expr} AS DOUBLE)")
    assert result == {}
```

- [ ] 2. Run to confirm all tests fail:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_utils.py -v 2>&1 | tail -20
```

Expected: 6 failed (ImportError or AttributeError).

- [ ] 3. Add `sample_property_types` to `backend/backends/_utils.py` (append after `infer_type`):

```python
def sample_property_types(
    execute_fn,
    table: str,
    prop_exprs: dict[str, str],
    numeric_cast: str,
) -> dict[str, str]:
    """Sample up to 500 rows to detect numeric JSON properties.

    Args:
        execute_fn: callable(sql: str) -> list[row] | None
        table: events table name
        prop_exprs: {property_name: sql_expression} for string-typed props
        numeric_cast: dialect-specific template with {expr} placeholder;
                      should return non-null for numeric values, null otherwise.
    Returns:
        dict mapping name -> "number" for each upgraded property (empty = no upgrades)
    """
    if not prop_exprs:
        return {}
    try:
        names = list(prop_exprs.keys())
        cast_cols = ", ".join(
            f'MAX({numeric_cast.format(expr=prop_exprs[name])}) AS col_{i}'
            for i, name in enumerate(names)
        )
        sql = f'SELECT {cast_cols} FROM (SELECT * FROM "{table}" LIMIT 500)'
        rows = execute_fn(sql)
        if not rows:
            return {}
        row = rows[0]
        return {names[i]: "number" for i, val in enumerate(row) if val is not None}
    except Exception:
        return {}
```

- [ ] 4. Run tests again — all 6 must pass:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_utils.py -v 2>&1 | tail -20
```

Expected: 6 passed.

- [ ] 5. Commit:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && git add backend/backends/_utils.py backend/tests/test_backends_utils.py && git commit -m "feat: add sample_property_types utility for JSON field type inference"
```

---

## Task 2: Integrate sampling into DuckDB `detect_schema`

**Files:**
- Modify: `backend/backends/duckdb/__init__.py`
- Modify: `backend/tests/test_backends_duckdb.py`

- [ ] 1. Add failing test to `TestDuckDBDetectSchema` class in `backend/tests/test_backends_duckdb.py`:

```python
def test_detect_schema_infers_numeric_json_property(self, backend):
    import duckdb as _duckdb
    conn = _duckdb.connect(":memory:")
    conn.execute(
        "CREATE TABLE events (user_id VARCHAR, timestamp TIMESTAMP, event_name VARCHAR, properties JSON)"
    )
    conn.execute(
        "INSERT INTO events VALUES "
        "('u1', '2024-01-01', 'Purchase', '{\"total_amount\": 99.99}'), "
        "('u2', '2024-01-02', 'Purchase', '{\"total_amount\": 49.50}')"
    )
    info = backend.detect_schema(conn, None)
    conn.close()
    prop = next((p for p in info.proposed_custom_properties if p["name"] == "total_amount"), None)
    assert prop is not None, "total_amount should be in proposed_custom_properties"
    assert prop["type"] == "number", f"expected 'number', got '{prop['type']}'"
```

- [ ] 2. Run to confirm it fails:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_duckdb.py::TestDuckDBDetectSchema::test_detect_schema_infers_numeric_json_property -v 2>&1 | tail -15
```

Expected: FAIL (type is "string").

- [ ] 3. Update `backend/backends/duckdb/__init__.py`. Add `sample_property_types` to the `_utils` import:

```python
from backend.backends._utils import pick_events_table, suggest_fields, infer_type, sample_property_types
```

Add constant near the top of the module (after imports):

```python
_DUCKDB_NUMERIC_CAST = "TRY_CAST({expr} AS DOUBLE)"
```

Then add sampling block at the end of `detect_schema`, before the `return SchemaInfo(...)` line:

```python
        # Upgrade string-typed JSON properties to number where sampling confirms it
        string_json_props = [p for p in proposed if p["type"] == "string" and "." in p["path"]]
        if string_json_props:
            col_name, _ = string_json_props[0]["path"].split(".", 1)
            prop_exprs = {
                p["name"]: self.json_extract_string(col_name, p["name"])
                for p in string_json_props
            }
            upgrades = sample_property_types(
                lambda sql: conn.execute(sql).fetchall(),
                events_table,
                prop_exprs,
                _DUCKDB_NUMERIC_CAST,
            )
            for p in proposed:
                if p["name"] in upgrades:
                    p["type"] = upgrades[p["name"]]
```

Note: `col_name` is taken from the first JSON prop's path. If multiple JSON columns exist, group by column first. For the common case of a single `properties` column this is sufficient.

- [ ] 4. Run the new test:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_duckdb.py::TestDuckDBDetectSchema -v 2>&1 | tail -15
```

Expected: all pass including the new test.

- [ ] 5. Run full backend tests:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_duckdb.py -v 2>&1 | tail -10
```

Expected: all pass.

- [ ] 6. Commit:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && git add backend/backends/duckdb/__init__.py backend/tests/test_backends_duckdb.py && git commit -m "feat(duckdb): infer numeric type for JSON properties during schema detect"
```

---

## Task 3: Integrate sampling into SQLite `detect_schema`

**Files:**
- Modify: `backend/backends/sqlite/__init__.py`
- Modify: `backend/tests/test_backends_sqlite.py`

- [ ] 1. Add failing test to `TestSQLiteDetectSchema` class in `backend/tests/test_backends_sqlite.py`:

```python
def test_detect_schema_infers_numeric_json_property(self, backend):
    import sqlite3 as _sqlite3
    conn = _sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE purchases (user_id TEXT, timestamp TEXT, event_name TEXT, props TEXT)"
    )
    conn.execute("INSERT INTO purchases VALUES ('u1', '2024-01-01', 'Buy', '{\"price\": \"9.99\"}')")
    conn.execute("INSERT INTO purchases VALUES ('u2', '2024-01-02', 'Buy', '{\"price\": \"19.99\"}')")
    conn.commit()
    info = backend.detect_schema(conn, "purchases")
    conn.close()
    prop = next((p for p in info.proposed_custom_properties if p["name"] == "price"), None)
    assert prop is not None, "price should be in proposed_custom_properties"
    assert prop["type"] == "number", f"expected 'number', got '{prop['type']}'"
```

- [ ] 2. Run to confirm it fails:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_sqlite.py::TestSQLiteDetectSchema::test_detect_schema_infers_numeric_json_property -v 2>&1 | tail -15
```

Expected: FAIL.

- [ ] 3. Update `backend/backends/sqlite/__init__.py`. Add `sample_property_types` to the `_utils` import. Add constant:

```python
_SQLITE_NUMERIC_CAST = (
    "CASE WHEN {expr} GLOB '[0-9]*'"
    " OR {expr} GLOB '-[0-9]*'"
    " OR {expr} GLOB '[0-9]*.[0-9]*'"
    " OR {expr} GLOB '-[0-9]*.[0-9]*'"
    " THEN 1.0 ELSE NULL END"
)
```

Then add sampling block at the end of `detect_schema` before `return SchemaInfo(...)`:

```python
        # Upgrade string-typed JSON properties to number where sampling confirms it
        string_json_props = [p for p in proposed if p["type"] == "string" and "." in p["path"]]
        if string_json_props:
            col_name, _ = string_json_props[0]["path"].split(".", 1)
            prop_exprs = {
                p["name"]: self.json_extract_string(col_name, p["name"])
                for p in string_json_props
            }
            upgrades = sample_property_types(
                lambda sql: conn.execute(sql).fetchall(),
                events_table,
                prop_exprs,
                _SQLITE_NUMERIC_CAST,
            )
            for p in proposed:
                if p["name"] in upgrades:
                    p["type"] = upgrades[p["name"]]
```

- [ ] 4. Run test:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_sqlite.py::TestSQLiteDetectSchema -v 2>&1 | tail -15
```

Expected: all pass.

- [ ] 5. Run full SQLite tests:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_sqlite.py -v 2>&1 | tail -10
```

Expected: all pass.

- [ ] 6. Commit:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && git add backend/backends/sqlite/__init__.py backend/tests/test_backends_sqlite.py && git commit -m "feat(sqlite): infer numeric type for JSON properties during schema detect"
```

---

## Task 4: Integrate sampling into PostgreSQL `detect_schema`

**Files:**
- Modify: `backend/backends/postgresql/__init__.py`
- Modify: `backend/tests/test_backends_postgresql.py`

- [ ] 1. Add failing test to `TestPostgreSQLDetectSchema` (add this class if it doesn't exist) in `backend/tests/test_backends_postgresql.py`:

```python
class TestPostgreSQLDetectSchema:
    def test_detect_schema_infers_numeric_json_property(self, backend):
        """Mock cursors: table list → columns (with jsonb) → key extraction → sampling."""
        # Cursor 1: table list
        c1 = _make_cursor([("events",)])
        # Cursor 2: column list — user_id + properties jsonb
        c2 = _make_cursor([("user_id", "character varying"), ("properties", "jsonb")])
        # Cursor 3: jsonb_object_keys for 'properties'
        c3 = _make_cursor([("amount",)])
        # Cursor 4: sampling query — non-null means numeric
        c4 = _make_cursor([(1.0,)])

        cursor_seq = iter([c1, c2, c3, c4])
        conn = MagicMock()
        conn.cursor.side_effect = lambda: next(cursor_seq)

        info = backend.detect_schema(conn, None)
        prop = next((p for p in info.proposed_custom_properties if p["name"] == "amount"), None)
        assert prop is not None, "amount should be in proposed_custom_properties"
        assert prop["type"] == "number", f"expected 'number', got '{prop['type']}'"
```

- [ ] 2. Run to confirm failure:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_postgresql.py::TestPostgreSQLDetectSchema -v 2>&1 | tail -15
```

Expected: FAIL.

- [ ] 3. Update `backend/backends/postgresql/__init__.py`. Add `sample_property_types` to `_utils` import. Add constant:

```python
_PG_NUMERIC_CAST = r"(CASE WHEN {expr} ~ '^-?[0-9]+(\.[0-9]+)?$' THEN 1.0 ELSE NULL END)"
```

Then add sampling block at the end of `detect_schema` before `return SchemaInfo(...)`:

```python
        # Upgrade string-typed JSON properties to number where sampling confirms it
        string_json_props = [p for p in proposed if p["type"] == "string" and "." in p["path"]]
        if string_json_props:
            col_name, _ = string_json_props[0]["path"].split(".", 1)
            prop_exprs = {
                p["name"]: self.json_extract_string(col_name, p["name"])
                for p in string_json_props
            }

            def _pg_execute(sql: str):
                cur = conn.cursor()
                try:
                    cur.execute(sql)
                    return cur.fetchall()
                except Exception:
                    return None
                finally:
                    with contextlib.suppress(Exception):
                        cur.close()

            upgrades = sample_property_types(_pg_execute, events_table, prop_exprs, _PG_NUMERIC_CAST)
            for p in proposed:
                if p["name"] in upgrades:
                    p["type"] = upgrades[p["name"]]
```

- [ ] 4. Run the new test:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/test_backends_postgresql.py::TestPostgreSQLDetectSchema -v 2>&1 | tail -15
```

Expected: pass.

- [ ] 5. Run full PostgreSQL tests + all backend tests:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && python -m pytest backend/tests/ -v 2>&1 | tail -15
```

Expected: all pass (403+ tests).

- [ ] 6. Commit:

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feature/dimension-category-schema && git add backend/backends/postgresql/__init__.py backend/tests/test_backends_postgresql.py && git commit -m "feat(postgresql): infer numeric type for JSON properties during schema detect"
```
