# Python API — TDD Connector Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix logic errors in the 5 non-DuckDB database backend implementations using TDD — write a failing test for each bug, then fix the implementation.

**Architecture:** Each backend (`PostgreSQL`, `ClickHouse`, `SQLite`, `Snowflake`, `Databricks`) implements the `DatabaseBackend` Protocol defined in `backend/backends/base.py`. Unit tests (SQL generation, no connection needed) live in `backend/tests/test_backends_*.py`. The DuckDB backend is the reference implementation — when in doubt about correct behavior, check `backend/backends/duckdb/__init__.py`.

**Tech Stack:** Python 3.12, pytest, unittest.mock (for connection mocks), fakesnow (Snowflake fake), databricks-sql-connector stub

**Spec:** `docs/superpowers/specs/2026-03-25-python-api-refactor-design.md` §3

**Prerequisites:**
- Plan A (dead code + DI) must be complete before running this plan. Specifically: Plan A Task 1 Step 4 moves `_to_named_params` to `backend/backends/_utils.py`. Task 6 Step 3 in this plan will fail with an `ImportError` if that migration has not happened.
- Contract tests (`backend/tests/contract/`) use an in-process DuckDB connection — no external service needed. They are safe to run locally.

---

## How to Run Tests

```bash
# Run all backend tests
cd /Users/carlo/my_work/stratifio/stratifio-oss && uv run pytest backend/tests/test_backends_*.py -v

# Run one backend
uv run pytest backend/tests/test_backends_postgresql.py -v

# Run contract tests (DuckDB only — needs a connection)
uv run pytest backend/tests/contract/ -v
```

---

## Task 1: Audit — find all failing tests before making any changes

- [ ] **Step 1: Run all backend unit tests and record failures**

  ```bash
  uv run pytest backend/tests/test_backends_postgresql.py backend/tests/test_backends_clickhouse.py backend/tests/test_backends_sqlite.py backend/tests/test_backends_snowflake.py backend/tests/test_backends_databricks.py -v 2>&1 | tee /tmp/backend_test_audit.txt
  cat /tmp/backend_test_audit.txt
  ```

  Record which tests fail and what the error messages are. Do not fix anything yet — this task is audit only.

- [ ] **Step 2: Note the ClickHouse `use_pool` discrepancy**

  In `backend/backends/clickhouse/__init__.py`, `use_pool` returns `False`.
  In `backend/tests/test_backends_clickhouse.py`, `test_use_pool_is_true` asserts it is `True`.
  One of these is wrong. Check `backend/services/pool.py` to see if ClickHouse is expected to pool. The answer determines which one to fix — the test or the implementation.

- [ ] **Step 3: Commit audit findings (no code changes)**

  No commit — this is discovery only. Proceed to fix tasks.

---

## Task 2: Fix PostgreSQL backend bugs

**Files:**
- Test: `backend/tests/test_backends_postgresql.py`
- Modify: `backend/backends/postgresql/__init__.py`

- [ ] **Step 1: Run PostgreSQL tests to see current failures**

  ```bash
  uv run pytest backend/tests/test_backends_postgresql.py -v
  ```

- [ ] **Step 2: Write ALL the PostgreSQL SQL fragment tests first (before fixing anything)**

  Add a `TestPostgreSQLCTE` and `TestPostgreSQLSQLFragments` class to `backend/tests/test_backends_postgresql.py`. Write every test listed below, then run them to see which fail:

  ```python
  class TestPostgreSQLCTE:
      def test_build_events_cte_no_exclude_syntax(self, backend):
          cte = backend.build_events_cte("raw", "uid", "ts", "action", [])
          assert "EXCLUDE" not in cte
          assert "user_id" in cte
          assert "timestamp" in cte
          assert "event_name" in cte

      def test_build_events_cte_with_custom_props_includes_root_col(self, backend):
          cte = backend.build_events_cte(
              "raw", "uid", "ts", "action",
              [{"name": "device", "path": "properties.device"}],
          )
          assert "properties" in cte

      def test_prepend_events_cte_wraps_query(self, backend):
          result = backend.prepend_events_cte("(SELECT * FROM raw)", "SELECT COUNT(*) FROM events")
          assert result.startswith("WITH events AS")

  class TestPostgreSQLSQLFragments:
      def test_date_diff_days_produces_integer_days(self, backend):
          result = backend.date_diff_days("a", "b")
          assert "a" in result and "b" in result
          assert any(x in result.upper() for x in ("EXTRACT", "DATEDIFF", "AGE", "EPOCH"))

      def test_json_extract_string_simple_uses_arrow(self, backend):
          result = backend.json_extract_string("props", "device")
          assert "->>" in result and "props" in result and "device" in result

      def test_json_extract_string_nested_uses_path_text(self, backend):
          result = backend.json_extract_string("props", "a.b")
          assert "json_extract_path_text" in result or "->>" in result

      def test_date_trunc_day(self, backend):
          assert backend.date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"

      def test_epoch_diff_seconds(self, backend):
          result = backend.epoch_diff_seconds("a", "b")
          assert "EPOCH" in result.upper()

      def test_interval_minutes_exceeded(self, backend):
          result = backend.interval_minutes_exceeded("a", "b", 30)
          assert "30" in result and "INTERVAL" in result.upper()

      def test_string_concat(self, backend):
          assert backend.string_concat("a", "b") == "a || b"

      def test_cast_to_text(self, backend):
          result = backend.cast_to_text("x")
          assert "x" in result and "TEXT" in result.upper()

      def test_extract_hour(self, backend):
          assert "HOUR" in backend.extract_hour("ts").upper()

      def test_extract_day_of_week(self, backend):
          result = backend.extract_day_of_week("ts")
          assert "DOW" in result.upper() or "DAYOFWEEK" in result.upper()
  ```

  Run to see all failures at once:
  ```bash
  uv run pytest backend/tests/test_backends_postgresql.py -v
  ```

- [ ] **Step 3: Fix each failure in `backend/backends/postgresql/__init__.py`**

  For each failing test, fix the implementation. Do not fix tests that are already passing. The DuckDB backend (`backend/backends/duckdb/__init__.py`) is the reference — check it when the expected behavior is unclear.

- [ ] **Step 4: Run PostgreSQL tests to confirm all pass**

  ```bash
  uv run pytest backend/tests/test_backends_postgresql.py -v
  ```
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/tests/test_backends_postgresql.py backend/backends/postgresql/__init__.py
  git commit -m "fix(postgresql): fix backend logic errors found by TDD"
  ```

---

## Task 3: Fix ClickHouse backend bugs

**Files:**
- Test: `backend/tests/test_backends_clickhouse.py`
- Modify: `backend/backends/clickhouse/__init__.py`

- [ ] **Step 1: Run ClickHouse tests to see current failures**

  ```bash
  uv run pytest backend/tests/test_backends_clickhouse.py -v
  ```

- [ ] **Step 2: Fix `use_pool` discrepancy**

  Check `backend/services/pool.py` — does it ever pool ClickHouse connections? If not, `use_pool` should be `False` and the test `test_use_pool_is_true` is wrong. Fix the test to assert `False`. If ClickHouse should pool, fix the implementation.

  The current implementation returns `False`. Fix the test:
  ```python
  def test_use_pool_is_false(self, backend):
      assert backend.use_pool is False
  ```

- [ ] **Step 3: Add missing SQL fragment tests and fix bugs found**

  ClickHouse uses backtick quoting and its own function names. Add tests for each fragment method:

  ```python
  class TestClickHouseSQLFragments:
      def test_date_trunc_day(self, backend):
          result = backend.date_trunc("day", "ts")
          assert "toStartOfDay" in result and "ts" in result

      def test_date_trunc_week(self, backend):
          result = backend.date_trunc("week", "ts")
          assert "toStartOfWeek" in result

      def test_date_diff_days(self, backend):
          result = backend.date_diff_days("a", "b")
          assert "a" in result and "b" in result
          assert any(x in result for x in ("dateDiff", "toRelativeDayNum", "DATEDIFF"))

      def test_json_extract_string(self, backend):
          result = backend.json_extract_string("props", "device")
          assert "props" in result and "device" in result
          # ClickHouse uses JSONExtractString
          assert "JSONExtract" in result or "visitParamExtractString" in result

      def test_string_concat(self, backend):
          result = backend.string_concat("a", "b")
          assert "a" in result and "b" in result
          assert "||" in result or "concat" in result.lower()

      def test_cast_to_text(self, backend):
          result = backend.cast_to_text("x")
          assert "x" in result
          assert "toString" in result or "CAST" in result

      def test_build_events_cte_no_exclude(self, backend):
          cte = backend.build_events_cte("raw", "uid", "ts", "action", [])
          assert "EXCLUDE" not in cte

      def test_interval_minutes_exceeded(self, backend):
          result = backend.interval_minutes_exceeded("a", "b", 30)
          assert "30" in result

      def test_extract_hour(self, backend):
          assert "HOUR" in backend.extract_hour("ts").upper() or "toHour" in backend.extract_hour("ts")

      def test_extract_day_of_week(self, backend):
          result = backend.extract_day_of_week("ts")
          assert "ts" in result
  ```

  For each test that fails, fix the implementation in `clickhouse/__init__.py`.

- [ ] **Step 4: Run all ClickHouse tests**

  ```bash
  uv run pytest backend/tests/test_backends_clickhouse.py -v
  ```
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/tests/test_backends_clickhouse.py backend/backends/clickhouse/__init__.py
  git commit -m "fix(clickhouse): fix use_pool flag and SQL fragment bugs (TDD)"
  ```

---

## Task 4: Fix SQLite backend bugs

**Files:**
- Test: `backend/tests/test_backends_sqlite.py`
- Modify: `backend/backends/sqlite/__init__.py`

- [ ] **Step 1: Run SQLite tests**

  ```bash
  uv run pytest backend/tests/test_backends_sqlite.py -v
  ```

- [ ] **Step 2: Add comprehensive SQL fragment tests**

  SQLite uses very different syntax — no `DATE_TRUNC`, uses `strftime`; no `INTERVAL` syntax; JSON uses `json_extract`:

  ```python
  class TestSQLiteSQLFragments:
      def test_date_trunc_day_uses_strftime(self, backend):
          result = backend.date_trunc("day", "ts")
          assert "strftime" in result.lower() or "date(" in result.lower()

      def test_date_diff_days_uses_julianday(self, backend):
          result = backend.date_diff_days("a", "b")
          assert "julianday" in result.lower() or "strftime" in result.lower()

      def test_json_extract_string(self, backend):
          result = backend.json_extract_string("props", "device")
          assert "json_extract" in result.lower()
          assert "props" in result and "device" in result

      def test_build_events_cte_no_exclude(self, backend):
          cte = backend.build_events_cte("raw", "uid", "ts", "action", [])
          assert "EXCLUDE" not in cte

      def test_interval_minutes_exceeded(self, backend):
          result = backend.interval_minutes_exceeded("a", "b", 30)
          assert "30" in result

      def test_cast_to_text(self, backend):
          result = backend.cast_to_text("x")
          assert "x" in result
          assert "CAST" in result.upper() or "TEXT" in result.upper()

      def test_extract_hour(self, backend):
          result = backend.extract_hour("ts")
          assert "strftime" in result.lower() or "HOUR" in result.upper()
  ```

  For each failing test, fix the implementation.

- [ ] **Step 3: Verify with in-memory SQLite connection**

  Create an in-memory SQLite test fixture and run an end-to-end smoke test:

  ```python
  import sqlite3

  @pytest.fixture
  def mem_conn():
      conn = sqlite3.connect(":memory:")
      conn.row_factory = sqlite3.Row
      conn.execute("CREATE TABLE events (user_id TEXT, timestamp TEXT, event_name TEXT, props TEXT)")
      conn.execute("INSERT INTO events VALUES ('u1','2024-01-01 10:00:00','PageView','{\"device\":\"mobile\"}')")
      yield conn
      conn.close()

  def test_execute_returns_rows(backend, mem_conn):
      rows = backend.execute(mem_conn, "SELECT COUNT(*) FROM events", None)
      assert rows[0][0] == 1

  def test_get_tables_returns_events(backend, mem_conn):
      tables = backend.get_tables(mem_conn)
      assert "events" in tables
  ```

- [ ] **Step 4: Run all SQLite tests**

  ```bash
  uv run pytest backend/tests/test_backends_sqlite.py -v
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add backend/tests/test_backends_sqlite.py backend/backends/sqlite/__init__.py
  git commit -m "fix(sqlite): fix SQL fragment bugs via TDD (strftime, json_extract, etc.)"
  ```

---

## Task 5: Fix Snowflake backend bugs

**Files:**
- Test: `backend/tests/test_backends_snowflake.py`
- Modify: `backend/backends/snowflake/__init__.py`

- [ ] **Step 1: Run Snowflake tests**

  ```bash
  uv run pytest backend/tests/test_backends_snowflake.py -v
  ```

  Note: `fakesnow` is installed (see `pyproject.toml` dev deps) and can be used for connection-level tests.

- [ ] **Step 2: Add SQL fragment tests**

  Snowflake uses standard SQL mostly but with some differences:

  ```python
  class TestSnowflakeSQLFragments:
      def test_date_trunc_day(self, backend):
          result = backend.date_trunc("day", "ts")
          assert "DATE_TRUNC" in result.upper() and "day" in result

      def test_date_diff_days(self, backend):
          result = backend.date_diff_days("a", "b")
          assert "DATEDIFF" in result.upper() or "TIMESTAMPDIFF" in result.upper()

      def test_json_extract_string(self, backend):
          result = backend.json_extract_string("v", "key")
          # Snowflake: v:key::string  or  GET(v, 'key')
          assert "v" in result and "key" in result

      def test_build_events_cte_no_exclude(self, backend):
          cte = backend.build_events_cte("raw", "uid", "ts", "action", [])
          assert "EXCLUDE" not in cte

      def test_cast_to_text(self, backend):
          result = backend.cast_to_text("x")
          assert "x" in result
          assert "TEXT" in result.upper() or "VARCHAR" in result.upper() or "STRING" in result.upper()

      def test_interval_minutes_exceeded(self, backend):
          result = backend.interval_minutes_exceeded("a", "b", 30)
          assert "30" in result

      def test_string_concat(self, backend):
          result = backend.string_concat("a", "b")
          assert "||" in result or "CONCAT" in result.upper()
  ```

- [ ] **Step 3: Run all Snowflake tests**

  ```bash
  uv run pytest backend/tests/test_backends_snowflake.py -v
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add backend/tests/test_backends_snowflake.py backend/backends/snowflake/__init__.py
  git commit -m "fix(snowflake): fix SQL fragment bugs via TDD"
  ```

---

## Task 6: Fix Databricks backend bugs

**Files:**
- Test: `backend/tests/test_backends_databricks.py`
- Modify: `backend/backends/databricks/__init__.py`

- [ ] **Step 1: Run Databricks tests**

  ```bash
  uv run pytest backend/tests/test_backends_databricks.py -v
  ```

  Note: There's a stub in `backend/tests/contract/stubs/databricks_stub.py` that can help with connection mocks.

- [ ] **Step 2: Add SQL fragment tests — Databricks uses backtick quoting like ClickHouse**

  ```python
  class TestDatabricksSQLFragments:
      def test_identifier_quote_char_is_backtick(self, backend):
          assert backend.identifier_quote_char == '`'

      def test_date_trunc_day(self, backend):
          result = backend.date_trunc("day", "ts")
          assert "DATE_TRUNC" in result.upper() or "TRUNC" in result.upper()

      def test_date_diff_days(self, backend):
          result = backend.date_diff_days("a", "b")
          assert "DATEDIFF" in result.upper() or "TIMESTAMPDIFF" in result.upper()

      def test_json_extract_string(self, backend):
          result = backend.json_extract_string("v", "key")
          assert "v" in result and "key" in result
          # Databricks: get_json_object(v, '$.key')
          assert "get_json_object" in result.lower() or ":" in result

      def test_build_events_cte_no_exclude(self, backend):
          cte = backend.build_events_cte("raw", "uid", "ts", "action", [])
          assert "EXCLUDE" not in cte

      def test_interval_minutes_exceeded(self, backend):
          result = backend.interval_minutes_exceeded("a", "b", 30)
          assert "30" in result

      def test_cast_to_text(self, backend):
          result = backend.cast_to_text("x")
          assert "x" in result
          assert "STRING" in result.upper() or "TEXT" in result.upper() or "VARCHAR" in result.upper()
  ```

- [ ] **Step 3: Verify `_to_named_params` import works after Task 1 cleanup**

  The Databricks backend may use `_to_named_params` from the deleted local copy. Verify the import from `analytics_db` works:

  ```bash
  uv run python -c "from backend.backends.databricks import DatabricksBackend; print('ok')"
  ```

- [ ] **Step 4: Run all Databricks tests**

  ```bash
  uv run pytest backend/tests/test_backends_databricks.py -v
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add backend/tests/test_backends_databricks.py backend/backends/databricks/__init__.py
  git commit -m "fix(databricks): fix SQL fragment bugs via TDD"
  ```

---

## Task 7: Run full test suite and contract tests

- [ ] **Step 1: Run all backend tests**

  ```bash
  uv run pytest backend/tests/test_backends_*.py -v
  ```
  Expected: all pass.

- [ ] **Step 2: Run contract tests**

  ```bash
  uv run pytest backend/tests/contract/ -v
  ```
  These test all backends against the same behavioral contract. Fix any failures.

- [ ] **Step 3: Run full test suite**

  ```bash
  uv run pytest backend/tests/ -v
  ```
  Expected: all pass.

- [ ] **Step 4: Final commit**

  ```bash
  git add -p
  git commit -m "test: all connector unit tests and contract tests passing"
  ```
