# Python API — Real-World Integration Testing Guide

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `@pytest.mark.integration` test category so developers can run each backend against a real database to verify the full connection stack (credentials → connect → query → result) works in production.

**Architecture:** Integration tests skip by default. They are activated by setting backend-specific env vars. Each test opens a real connection, runs `get_tables()` and `execute("SELECT 1", None)`, and verifies the result. They reuse the existing `DatabaseBackend` Protocol interface — no new test logic invented.

**Tech Stack:** Python 3.12, pytest, `@pytest.mark.integration`, per-backend driver packages

**Spec:** `docs/superpowers/specs/2026-03-25-python-api-refactor-design.md` §4

**Prerequisite:** Plan A (DI refactor) should be complete so `get_backend_registry()` is injectable.

---

## File Map

**New files:**
- `backend/tests/integration/__init__.py`
- `backend/tests/integration/conftest.py`
- `backend/tests/integration/test_integration_postgresql.py`
- `backend/tests/integration/test_integration_clickhouse.py`
- `backend/tests/integration/test_integration_snowflake.py`
- `backend/tests/integration/test_integration_databricks.py`
- `backend/tests/integration/test_integration_sqlite.py`
- `docs/testing-real-connections.md`

**Modified files:**
- `pyproject.toml` — already done in Plan A Task 9 (marker registration). Verify it's there.

---

## Task 1: Create integration test infrastructure

**Files:**
- Create: `backend/tests/integration/__init__.py`
- Create: `backend/tests/integration/conftest.py`

- [ ] **Step 1: Create the integration test package**

  ```bash
  mkdir -p /Users/carlo/my_work/stratifio/stratifio-oss/backend/tests/integration
  touch backend/tests/integration/__init__.py
  ```

- [ ] **Step 2: Write a failing test for the infrastructure itself**

  Create `backend/tests/integration/conftest.py`:
  ```python
  """Shared fixtures for integration tests.

  Integration tests require real database credentials via environment variables.
  Run with: pytest -m integration
  Skip in CI unless credentials are present.
  """
  import os
  import pytest


  def pytest_collection_modifyitems(items):
      """Add integration marker skip reason to any integration test missing credentials."""
      pass  # individual tests handle their own skip logic via pytest.importorskip / env checks
  ```

- [ ] **Step 3: Verify the marker is registered in `pyproject.toml`**

  ```bash
  grep -A2 "markers" pyproject.toml
  ```
  Expected output includes:
  ```
  "integration: marks tests that require a real external database connection..."
  ```
  If missing, add it now (see Plan A Task 9).

- [ ] **Step 4: Commit infrastructure**

  ```bash
  git add backend/tests/integration/
  git commit -m "test: create integration test infrastructure"
  ```

---

## Task 2: PostgreSQL integration test

**Files:**
- Create: `backend/tests/integration/test_integration_postgresql.py`

- [ ] **Step 1: Write the test**

  ```python
  """Integration test: PostgreSQL backend against a real database.

  Required env var:
      TEST_POSTGRES_URL  e.g. postgresql://user:pass@localhost:5432/analytics
  """
  import os
  import pytest

  POSTGRES_URL = os.environ.get("TEST_POSTGRES_URL", "")


  @pytest.mark.integration
  @pytest.mark.skipif(not POSTGRES_URL, reason="TEST_POSTGRES_URL not set")
  class TestPostgreSQLIntegration:
      @pytest.fixture
      def backend_and_conn(self):
          from backend.backends.postgresql import PostgreSQLBackend
          from backend.backends.postgresql.credentials import PostgreSQLCredentials
          import urllib.parse

          parsed = urllib.parse.urlparse(POSTGRES_URL)
          creds = PostgreSQLCredentials(
              host=parsed.hostname,
              port=parsed.port or 5432,
              database=parsed.path.lstrip("/"),
              user=parsed.username,
              password=parsed.password,
          )
          backend = PostgreSQLBackend()
          conn = backend.open(creds, read_only=True)
          yield backend, conn
          conn.close()

      def test_select_one(self, backend_and_conn):
          backend, conn = backend_and_conn
          rows = backend.execute(conn, "SELECT 1", None)
          assert rows == [(1,)]

      def test_get_tables_returns_list(self, backend_and_conn):
          backend, conn = backend_and_conn
          tables = backend.get_tables(conn)
          assert isinstance(tables, list)

      def test_dialect_name(self, backend_and_conn):
          backend, _ = backend_and_conn
          assert backend.dialect_name == "postgres"

      def test_date_trunc_executes(self, backend_and_conn):
          backend, conn = backend_and_conn
          expr = backend.date_trunc("day", "NOW()")
          rows = backend.execute(conn, f"SELECT {expr}", None)
          assert len(rows) == 1
  ```

- [ ] **Step 2: Verify the test skips when env var is absent**

  ```bash
  uv run pytest backend/tests/integration/test_integration_postgresql.py -v
  ```
  Expected: `SKIPPED` (not FAIL, not ERROR) — because `TEST_POSTGRES_URL` is not set.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/integration/test_integration_postgresql.py
  git commit -m "test(integration): add PostgreSQL integration test (skips without TEST_POSTGRES_URL)"
  ```

---

## Task 3: ClickHouse integration test

**Files:**
- Create: `backend/tests/integration/test_integration_clickhouse.py`

- [ ] **Step 1: Write the test**

  ```python
  """Integration test: ClickHouse backend against a real database.

  Required env var:
      TEST_CLICKHOUSE_URL  e.g. clickhouse://user:pass@localhost:8123/analytics
  """
  import os
  import pytest

  CLICKHOUSE_URL = os.environ.get("TEST_CLICKHOUSE_URL", "")


  @pytest.mark.integration
  @pytest.mark.skipif(not CLICKHOUSE_URL, reason="TEST_CLICKHOUSE_URL not set")
  class TestClickHouseIntegration:
      @pytest.fixture
      def backend_and_conn(self):
          from backend.backends.clickhouse import ClickHouseBackend
          from backend.backends.clickhouse.credentials import ClickHouseCredentials
          import urllib.parse

          parsed = urllib.parse.urlparse(CLICKHOUSE_URL)
          secure = parsed.scheme == "clickhouses"
          creds = ClickHouseCredentials(
              host=parsed.hostname,
              port=parsed.port or (8443 if secure else 8123),
              database=parsed.path.lstrip("/") or "default",
              user=parsed.username or "default",
              password=parsed.password or "",
              secure=secure,
          )
          backend = ClickHouseBackend()
          conn = backend.open(creds, read_only=True)
          yield backend, conn
          conn.close()

      def test_select_one(self, backend_and_conn):
          backend, conn = backend_and_conn
          rows = backend.execute(conn, "SELECT 1", None)
          assert rows[0][0] == 1

      def test_get_tables_returns_list(self, backend_and_conn):
          backend, conn = backend_and_conn
          tables = backend.get_tables(conn)
          assert isinstance(tables, list)

      def test_dialect_name(self, backend_and_conn):
          backend, _ = backend_and_conn
          assert backend.dialect_name == "clickhouse"
  ```

- [ ] **Step 2: Verify skips without env var**

  ```bash
  uv run pytest backend/tests/integration/test_integration_clickhouse.py -v
  ```
  Expected: `SKIPPED`.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/integration/test_integration_clickhouse.py
  git commit -m "test(integration): add ClickHouse integration test"
  ```

---

## Task 4: Snowflake integration test

**Files:**
- Create: `backend/tests/integration/test_integration_snowflake.py`

- [ ] **Step 1: Write the test**

  ```python
  """Integration test: Snowflake backend against a real account.

  Required env vars:
      TEST_SNOWFLAKE_ACCOUNT    e.g. xy12345.us-east-1
      TEST_SNOWFLAKE_USER       e.g. MYUSER
      TEST_SNOWFLAKE_PASSWORD
      TEST_SNOWFLAKE_DATABASE   e.g. ANALYTICS
  """
  import os
  import pytest

  _REQUIRED = ["TEST_SNOWFLAKE_ACCOUNT", "TEST_SNOWFLAKE_USER", "TEST_SNOWFLAKE_PASSWORD", "TEST_SNOWFLAKE_DATABASE"]
  _MISSING = [k for k in _REQUIRED if not os.environ.get(k)]


  @pytest.mark.integration
  @pytest.mark.skipif(bool(_MISSING), reason=f"Missing env vars: {_MISSING}")
  class TestSnowflakeIntegration:
      @pytest.fixture
      def backend_and_conn(self):
          from backend.backends.snowflake import SnowflakeBackend
          from backend.backends.snowflake.credentials import SnowflakeCredentials

          creds = SnowflakeCredentials(
              account=os.environ["TEST_SNOWFLAKE_ACCOUNT"],
              user=os.environ["TEST_SNOWFLAKE_USER"],
              password=os.environ["TEST_SNOWFLAKE_PASSWORD"],
              database=os.environ["TEST_SNOWFLAKE_DATABASE"],
          )
          backend = SnowflakeBackend()
          conn = backend.open(creds, read_only=True)
          yield backend, conn
          conn.close()

      def test_select_one(self, backend_and_conn):
          backend, conn = backend_and_conn
          rows = backend.execute(conn, "SELECT 1", None)
          assert rows[0][0] == 1

      def test_get_tables_returns_list(self, backend_and_conn):
          backend, conn = backend_and_conn
          tables = backend.get_tables(conn)
          assert isinstance(tables, list)
  ```

- [ ] **Step 2: Verify skips**

  ```bash
  uv run pytest backend/tests/integration/test_integration_snowflake.py -v
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/integration/test_integration_snowflake.py
  git commit -m "test(integration): add Snowflake integration test"
  ```

---

## Task 5: Databricks integration test

**Files:**
- Create: `backend/tests/integration/test_integration_databricks.py`

- [ ] **Step 1: Write the test**

  ```python
  """Integration test: Databricks backend against a real cluster/SQL warehouse.

  Required env vars:
      TEST_DATABRICKS_HOST        e.g. adb-1234.azuredatabricks.net
      TEST_DATABRICKS_TOKEN       personal access token
      TEST_DATABRICKS_HTTP_PATH   e.g. /sql/1.0/warehouses/abc123
  """
  import os
  import pytest

  _REQUIRED = ["TEST_DATABRICKS_HOST", "TEST_DATABRICKS_TOKEN", "TEST_DATABRICKS_HTTP_PATH"]
  _MISSING = [k for k in _REQUIRED if not os.environ.get(k)]


  @pytest.mark.integration
  @pytest.mark.skipif(bool(_MISSING), reason=f"Missing env vars: {_MISSING}")
  class TestDatabricksIntegration:
      @pytest.fixture
      def backend_and_conn(self):
          from backend.backends.databricks import DatabricksBackend
          from backend.backends.databricks.credentials import DatabricksCredentials

          creds = DatabricksCredentials(
              host=os.environ["TEST_DATABRICKS_HOST"],
              token=os.environ["TEST_DATABRICKS_TOKEN"],
              http_path=os.environ["TEST_DATABRICKS_HTTP_PATH"],
          )
          backend = DatabricksBackend()
          conn = backend.open(creds, read_only=True)
          yield backend, conn
          conn.close()

      def test_select_one(self, backend_and_conn):
          backend, conn = backend_and_conn
          rows = backend.execute(conn, "SELECT 1", None)
          assert rows[0][0] == 1

      def test_get_tables_returns_list(self, backend_and_conn):
          backend, conn = backend_and_conn
          tables = backend.get_tables(conn)
          assert isinstance(tables, list)
  ```

- [ ] **Step 2: Verify skips**

  ```bash
  uv run pytest backend/tests/integration/test_integration_databricks.py -v
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/integration/test_integration_databricks.py
  git commit -m "test(integration): add Databricks integration test"
  ```

---

## Task 6: SQLite integration test (file-based only)

**Files:**
- Create: `backend/tests/integration/test_integration_sqlite.py`

- [ ] **Step 1: Write the test**

  ```python
  """Integration test: SQLite backend against a real file-based database.

  Required env var:
      TEST_SQLITE_PATH   absolute path to a real SQLite file (NOT :memory:)

  Note: :memory: is excluded — in-memory SQLite is covered by unit tests.
  This test verifies file I/O, permissions, and the full open() path.
  """
  import os
  import pytest

  SQLITE_PATH = os.environ.get("TEST_SQLITE_PATH", "")


  @pytest.mark.integration
  @pytest.mark.skipif(not SQLITE_PATH or SQLITE_PATH == ":memory:", reason="TEST_SQLITE_PATH not set to a file path")
  class TestSQLiteIntegration:
      @pytest.fixture
      def backend_and_conn(self):
          from backend.backends.sqlite import SQLiteBackend
          from backend.backends.sqlite.credentials import SQLiteCredentials

          creds = SQLiteCredentials(file_path=SQLITE_PATH)
          backend = SQLiteBackend()
          conn = backend.open(creds, read_only=True)
          yield backend, conn
          conn.close()

      def test_select_one(self, backend_and_conn):
          backend, conn = backend_and_conn
          rows = backend.execute(conn, "SELECT 1", None)
          assert rows[0][0] == 1

      def test_get_tables_returns_list(self, backend_and_conn):
          backend, conn = backend_and_conn
          tables = backend.get_tables(conn)
          assert isinstance(tables, list)
  ```

- [ ] **Step 2: Verify skips**

  ```bash
  uv run pytest backend/tests/integration/test_integration_sqlite.py -v
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/integration/test_integration_sqlite.py
  git commit -m "test(integration): add SQLite file-based integration test"
  ```

---

## Task 7: Write `docs/testing-real-connections.md`

**Files:**
- Create: `docs/testing-real-connections.md`

- [ ] **Step 1: Write the guide**

  ```markdown
  # Testing Real Database Connections

  Integration tests verify the full connection stack against real databases.
  They are skipped by default and activated by setting environment variables.

  ## Running Integration Tests

  ```bash
  # Run all integration tests (skips any without credentials)
  uv run pytest -m integration -v

  # Run for a specific backend
  uv run pytest -m integration -k postgres -v
  ```

  ## Backend Credentials

  Set these env vars before running. You can add them to a `.env.test` file
  (never commit credentials).

  ### PostgreSQL
  ```bash
  export TEST_POSTGRES_URL="postgresql://user:pass@host:5432/dbname"
  ```

  ### ClickHouse
  ```bash
  export TEST_CLICKHOUSE_URL="clickhouse://user:pass@host:8123/dbname"
  # For TLS: use clickhouses://...
  ```

  ### Snowflake
  ```bash
  export TEST_SNOWFLAKE_ACCOUNT="xy12345.us-east-1"
  export TEST_SNOWFLAKE_USER="MYUSER"
  export TEST_SNOWFLAKE_PASSWORD="..."
  export TEST_SNOWFLAKE_DATABASE="ANALYTICS"
  ```

  ### Databricks
  ```bash
  export TEST_DATABRICKS_HOST="adb-1234567890.12.azuredatabricks.net"
  export TEST_DATABRICKS_TOKEN="dapi..."
  export TEST_DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/abc123"
  ```

  ### SQLite (file-based only)
  ```bash
  export TEST_SQLITE_PATH="/absolute/path/to/your.sqlite"
  # NOTE: :memory: is excluded — use unit tests for in-memory SQLite
  ```

  ## What Each Test Verifies

  Each integration test:
  1. Parses credentials from env vars
  2. Opens a real connection via `backend.open()`
  3. Runs `backend.get_tables()` — verifies the connection can query metadata
  4. Runs `backend.execute("SELECT 1", None)` — verifies query execution
  5. Closes the connection

  This covers the full path: credentials → driver → network → database → result.

  ## Test Location

  Integration tests live in `backend/tests/integration/`. They are marked with
  `@pytest.mark.integration` and will be skipped automatically in CI unless
  credentials are explicitly provided.
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/testing-real-connections.md
  git commit -m "docs: add testing-real-connections.md guide"
  ```

---

## Task 8: Final verification

- [ ] **Step 1: Run all tests to make sure nothing broke**

  ```bash
  uv run pytest backend/tests/ -v --ignore=backend/tests/integration/
  ```
  Expected: all pass (no regressions from adding integration tests).

- [ ] **Step 2: Run integration tests without credentials — all should skip**

  ```bash
  uv run pytest backend/tests/integration/ -v
  ```
  Expected: all `SKIPPED`, zero `FAILED`, zero `ERROR`.

- [ ] **Step 3: Verify no unknown marker warnings**

  ```bash
  uv run pytest backend/tests/integration/ -v --strict-markers
  ```
  Expected: runs cleanly with no marker warnings.
