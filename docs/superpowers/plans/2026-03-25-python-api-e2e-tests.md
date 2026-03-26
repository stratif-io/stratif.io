# Python API — E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@pytest.mark.e2e` tests that hit all exposed FastAPI analytics endpoints against real databases using pre-configured connection IDs stored in the product DB.

**Architecture:** Each backend gets one test file in `backend/tests/e2e/`. Tests use FastAPI's `TestClient(app)` with no dependency overrides — the real app, real DI, real DB. Each file skips entirely if `TEST_<BACKEND>_CONNECTION_ID` is not set. A shared `conftest.py` provides the client factory and date helpers. Unlike the unit test conftest, E2E tests do NOT patch `init_product_db` — they need the real product DB to look up the connection.

**Tech Stack:** Python 3.12, pytest, `starlette.testclient.TestClient`, FastAPI `Depends`

**Spec:** `docs/superpowers/specs/2026-03-25-python-api-e2e-tests-design.md`

---

## File Map

**New files:**

- `backend/tests/e2e/__init__.py`
- `backend/tests/e2e/conftest.py`
- `backend/tests/e2e/test_e2e_postgresql.py`
- `backend/tests/e2e/test_e2e_clickhouse.py`
- `backend/tests/e2e/test_e2e_snowflake.py`
- `backend/tests/e2e/test_e2e_databricks.py`
- `backend/tests/e2e/test_e2e_sqlite.py`

**Modified files:**

- `pyproject.toml` — add `e2e` marker to `[tool.pytest.ini_options]`
- `test.sh` — add `--e2e` flag

---

## Task 1: Infrastructure — directory, conftest, marker, test.sh

**Files:**

- Create: `backend/tests/e2e/__init__.py`
- Create: `backend/tests/e2e/conftest.py`
- Modify: `pyproject.toml`
- Modify: `test.sh`

- [ ] **Step 1: Create the e2e package directory**

  ```bash
  mkdir -p backend/tests/e2e
  touch backend/tests/e2e/__init__.py
  ```

- [ ] **Step 2: Create `backend/tests/e2e/conftest.py`**

  ```python
  """Shared fixtures for E2E tests.

  E2E tests require a pre-configured connection in the product DB.
  Run with: pytest -m e2e
  Set TEST_<BACKEND>_CONNECTION_ID env vars to activate each backend.

  NOTE: Unlike unit tests, E2E tests do NOT patch init_product_db.
  The real product DB is needed to look up connections.
  Ensure STRATIFIO_PRODUCT_DB_PATH points to the correct DB.
  """
  from datetime import date, timedelta
  from starlette.testclient import TestClient
  from backend.main import app


  def make_client() -> TestClient:
      """Return a TestClient using the real app with no dependency overrides."""
      return TestClient(app)


  def default_params(connection_id: str) -> dict:
      """Return base query params with last-30-days date window."""
      end = date.today()
      start = end - timedelta(days=30)
      return {
          "connection_id": connection_id,
          "start_date": start.isoformat(),
          "end_date": end.isoformat(),
      }
  ```

- [ ] **Step 3: Add `e2e` marker to `pyproject.toml`**

  Find the `markers` list under `[tool.pytest.ini_options]` and add the `e2e` entry:

  ```toml
  [tool.pytest.ini_options]
  markers = [
      "integration: marks tests that require a real external database connection (deselect with '-m not integration')",
      "e2e: marks end-to-end tests that require a pre-configured connection_id in the product DB (deselect with '-m not e2e')",
  ]
  ```

- [ ] **Step 4: Add `--e2e` flag to `test.sh`**

  In the `for arg in "$@"` loop, add:

  ```bash
  --e2e) E2E_ONLY=true ;;
  ```

  Add `E2E_ONLY=false` to the variable initialisation block.

  Add a `run_e2e` function after `run_integration`:

  ```bash
  run_e2e() {
    echo ""
    echo "━━━ E2E tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    local args=("$ROOT/backend/tests/e2e/" -v -m e2e)
    [ -n "$FILTER" ] && args+=(-k "$FILTER")
    pytest_cmd "${args[@]}" || FAILED+=("e2e")
  }
  ```

  Update the conditional block to handle `--e2e`:

  ```bash
  if $E2E_ONLY; then
    run_e2e
  elif $INTEGRATION_ONLY; then
    run_integration
  elif $BACKEND_ONLY; then
    run_backend
  elif $FRONTEND_ONLY; then
    run_frontend
  else
    run_backend
    run_frontend
  fi
  ```

  Also update the usage comment at the top of the file to document `--e2e`.

- [ ] **Step 5: Verify the marker is registered**

  ```bash
  uv run pytest backend/tests/e2e/ -v --strict-markers 2>&1 | tail -5
  ```

  Expected: no "unknown mark" warnings (directory is empty but pytest should parse it).

- [ ] **Step 6: Commit**

  ```bash
  git add backend/tests/e2e/ pyproject.toml test.sh
  git commit -m "test(e2e): create e2e test infrastructure, marker, and test.sh --e2e flag"
  ```

---

## Task 2: PostgreSQL E2E test

**Files:**

- Create: `backend/tests/e2e/test_e2e_postgresql.py`

- [ ] **Step 1: Create the file**

  ```python
  """E2E test: all API endpoints against a real PostgreSQL connection.

  Required env var:
      TEST_POSTGRES_CONNECTION_ID   UUID of a pre-configured connection in the product DB
                                    (with schema config set up via PUT /api/connections/{id}/schema)

  Also required:
      STRATIFIO_PRODUCT_DB_PATH     Path to the product DB containing the connection record
      STRATIFIO_ENCRYPTION_KEY      Key used to encrypt credentials in the product DB
  """
  import os
  import pytest
  from backend.tests.e2e.conftest import make_client, default_params

  CONNECTION_ID = os.environ.get("TEST_POSTGRES_CONNECTION_ID", "")


  @pytest.mark.e2e
  @pytest.mark.skipif(not CONNECTION_ID, reason="TEST_POSTGRES_CONNECTION_ID not set")
  class TestPostgreSQLE2E:
      @pytest.fixture(scope="class")
      def client(self):
          return make_client()

      @pytest.fixture(scope="class")
      def params(self):
          return default_params(CONNECTION_ID)

      @pytest.fixture(scope="class")
      def first_event(self, client, params):
          r = client.get("/api/events", params={"connection_id": CONNECTION_ID})
          events = r.json().get("events", [])
          return events[0] if events else None

      @pytest.fixture(scope="class")
      def first_user(self, client, params):
          r = client.get("/api/raw/events", params=params)
          data = r.json().get("data", [])
          return data[0]["user_id"] if data else None

      def test_events(self, client, params):
          r = client.get("/api/events", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["events"], list)

      def test_events_top(self, client, params):
          r = client.get("/api/events/top", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_trend(self, client, params):
          r = client.get("/api/trend", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_unique_users"], (int, float))

      def test_retention(self, client, params):
          r = client.get("/api/retention", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["granularity"], str)
          assert isinstance(body["milestones"], list)
          assert isinstance(body["total_available_cohorts"], int)

      def test_conversion(self, client, params):
          r = client.get("/api/conversion", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_paths(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/paths", params={**params, "target_event": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["target_event"], str)

      def test_path_analysis(self, client, params):
          r = client.get("/api/path-analysis", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_paths"], int)

      def test_path_funnel(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/path-funnel", params={**params, "events": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_steps"], int)

      def test_pivot(self, client, params):
          r = client.get("/api/pivot", params={**params, "measures": "count_events"})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["measures"], list)

      def test_pivot_options(self, client):
          r = client.get("/api/pivot/options", params={"connection_id": CONNECTION_ID})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["dimensions"], list)
          assert isinstance(body["measures"], list)

      def test_raw_events(self, client, params):
          r = client.get("/api/raw/events", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_raw_sessions(self, client, params):
          r = client.get("/api/raw/sessions", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_sessions_summary(self, client, params):
          r = client.get("/api/sessions/summary", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_user_events(self, client, params, first_user):
          if not first_user:
              pytest.skip("No users in test DB")
          r = client.get(
              f"/api/users/{first_user}/events",
              params={"connection_id": CONNECTION_ID},
          )
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["user_id"], str)

      def test_connection_test(self, client):
          r = client.post(f"/api/connections/{CONNECTION_ID}/test")
          assert r.status_code == 200

      def test_connection_schema(self, client):
          r = client.get(f"/api/connections/{CONNECTION_ID}/schema")
          assert r.status_code == 200
          assert isinstance(r.json(), dict)
  ```

- [ ] **Step 2: Verify it skips without the env var**

  ```bash
  uv run pytest backend/tests/e2e/test_e2e_postgresql.py -v 2>&1 | tail -5
  ```

  Expected: all tests `SKIPPED` (not FAIL, not ERROR).

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/e2e/test_e2e_postgresql.py
  git commit -m "test(e2e): add PostgreSQL E2E test"
  ```

---

## Task 3: ClickHouse E2E test

**Files:**

- Create: `backend/tests/e2e/test_e2e_clickhouse.py`

- [ ] **Step 1: Create the file**

  Same structure as PostgreSQL. Only the env var name and class name differ:

  ```python
  """E2E test: all API endpoints against a real ClickHouse connection.

  Required env var:
      TEST_CLICKHOUSE_CONNECTION_ID   UUID of a pre-configured connection in the product DB
  """
  import os
  import pytest
  from backend.tests.e2e.conftest import make_client, default_params

  CONNECTION_ID = os.environ.get("TEST_CLICKHOUSE_CONNECTION_ID", "")


  @pytest.mark.e2e
  @pytest.mark.skipif(not CONNECTION_ID, reason="TEST_CLICKHOUSE_CONNECTION_ID not set")
  class TestClickHouseE2E:
      @pytest.fixture(scope="class")
      def client(self):
          return make_client()

      @pytest.fixture(scope="class")
      def params(self):
          return default_params(CONNECTION_ID)

      @pytest.fixture(scope="class")
      def first_event(self, client, params):
          r = client.get("/api/events", params={"connection_id": CONNECTION_ID})
          events = r.json().get("events", [])
          return events[0] if events else None

      @pytest.fixture(scope="class")
      def first_user(self, client, params):
          r = client.get("/api/raw/events", params=params)
          data = r.json().get("data", [])
          return data[0]["user_id"] if data else None

      def test_events(self, client, params):
          r = client.get("/api/events", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["events"], list)

      def test_events_top(self, client, params):
          r = client.get("/api/events/top", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_trend(self, client, params):
          r = client.get("/api/trend", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_unique_users"], (int, float))

      def test_retention(self, client, params):
          r = client.get("/api/retention", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["granularity"], str)
          assert isinstance(body["milestones"], list)
          assert isinstance(body["total_available_cohorts"], int)

      def test_conversion(self, client, params):
          r = client.get("/api/conversion", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_paths(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/paths", params={**params, "target_event": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["target_event"], str)

      def test_path_analysis(self, client, params):
          r = client.get("/api/path-analysis", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_paths"], int)

      def test_path_funnel(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/path-funnel", params={**params, "events": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_steps"], int)

      def test_pivot(self, client, params):
          r = client.get("/api/pivot", params={**params, "measures": "count_events"})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["measures"], list)

      def test_pivot_options(self, client):
          r = client.get("/api/pivot/options", params={"connection_id": CONNECTION_ID})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["dimensions"], list)
          assert isinstance(body["measures"], list)

      def test_raw_events(self, client, params):
          r = client.get("/api/raw/events", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_raw_sessions(self, client, params):
          r = client.get("/api/raw/sessions", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_sessions_summary(self, client, params):
          r = client.get("/api/sessions/summary", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_user_events(self, client, params, first_user):
          if not first_user:
              pytest.skip("No users in test DB")
          r = client.get(
              f"/api/users/{first_user}/events",
              params={"connection_id": CONNECTION_ID},
          )
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["user_id"], str)

      def test_connection_test(self, client):
          r = client.post(f"/api/connections/{CONNECTION_ID}/test")
          assert r.status_code == 200

      def test_connection_schema(self, client):
          r = client.get(f"/api/connections/{CONNECTION_ID}/schema")
          assert r.status_code == 200
          assert isinstance(r.json(), dict)
  ```

- [ ] **Step 2: Verify it skips without the env var**

  ```bash
  uv run pytest backend/tests/e2e/test_e2e_clickhouse.py -v 2>&1 | tail -5
  ```

  Expected: all `SKIPPED`.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/e2e/test_e2e_clickhouse.py
  git commit -m "test(e2e): add ClickHouse E2E test"
  ```

---

## Task 4: Snowflake E2E test

**Files:**

- Create: `backend/tests/e2e/test_e2e_snowflake.py`

- [ ] **Step 1: Create the file**

  Same structure as PostgreSQL/ClickHouse. Env var: `TEST_SNOWFLAKE_CONNECTION_ID`, class: `TestSnowflakeE2E`.

  ```python
  """E2E test: all API endpoints against a real Snowflake connection.

  Required env var:
      TEST_SNOWFLAKE_CONNECTION_ID   UUID of a pre-configured connection in the product DB
  """
  import os
  import pytest
  from backend.tests.e2e.conftest import make_client, default_params

  CONNECTION_ID = os.environ.get("TEST_SNOWFLAKE_CONNECTION_ID", "")


  @pytest.mark.e2e
  @pytest.mark.skipif(not CONNECTION_ID, reason="TEST_SNOWFLAKE_CONNECTION_ID not set")
  class TestSnowflakeE2E:
      @pytest.fixture(scope="class")
      def client(self):
          return make_client()

      @pytest.fixture(scope="class")
      def params(self):
          return default_params(CONNECTION_ID)

      @pytest.fixture(scope="class")
      def first_event(self, client, params):
          r = client.get("/api/events", params={"connection_id": CONNECTION_ID})
          events = r.json().get("events", [])
          return events[0] if events else None

      @pytest.fixture(scope="class")
      def first_user(self, client, params):
          r = client.get("/api/raw/events", params=params)
          data = r.json().get("data", [])
          return data[0]["user_id"] if data else None

      def test_events(self, client, params):
          r = client.get("/api/events", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["events"], list)

      def test_events_top(self, client, params):
          r = client.get("/api/events/top", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_trend(self, client, params):
          r = client.get("/api/trend", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_unique_users"], (int, float))

      def test_retention(self, client, params):
          r = client.get("/api/retention", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["granularity"], str)
          assert isinstance(body["milestones"], list)
          assert isinstance(body["total_available_cohorts"], int)

      def test_conversion(self, client, params):
          r = client.get("/api/conversion", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_paths(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/paths", params={**params, "target_event": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["target_event"], str)

      def test_path_analysis(self, client, params):
          r = client.get("/api/path-analysis", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_paths"], int)

      def test_path_funnel(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/path-funnel", params={**params, "events": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_steps"], int)

      def test_pivot(self, client, params):
          r = client.get("/api/pivot", params={**params, "measures": "count_events"})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["measures"], list)

      def test_pivot_options(self, client):
          r = client.get("/api/pivot/options", params={"connection_id": CONNECTION_ID})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["dimensions"], list)
          assert isinstance(body["measures"], list)

      def test_raw_events(self, client, params):
          r = client.get("/api/raw/events", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_raw_sessions(self, client, params):
          r = client.get("/api/raw/sessions", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_sessions_summary(self, client, params):
          r = client.get("/api/sessions/summary", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_user_events(self, client, params, first_user):
          if not first_user:
              pytest.skip("No users in test DB")
          r = client.get(
              f"/api/users/{first_user}/events",
              params={"connection_id": CONNECTION_ID},
          )
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["user_id"], str)

      def test_connection_test(self, client):
          r = client.post(f"/api/connections/{CONNECTION_ID}/test")
          assert r.status_code == 200

      def test_connection_schema(self, client):
          r = client.get(f"/api/connections/{CONNECTION_ID}/schema")
          assert r.status_code == 200
          assert isinstance(r.json(), dict)
  ```

- [ ] **Step 2: Verify skips, commit**

  ```bash
  uv run pytest backend/tests/e2e/test_e2e_snowflake.py -v 2>&1 | tail -5
  git add backend/tests/e2e/test_e2e_snowflake.py
  git commit -m "test(e2e): add Snowflake E2E test"
  ```

---

## Task 5: Databricks E2E test

**Files:**

- Create: `backend/tests/e2e/test_e2e_databricks.py`

- [ ] **Step 1: Create the file**

  Same structure. Env var: `TEST_DATABRICKS_CONNECTION_ID`, class: `TestDatabricksE2E`.

  ```python
  """E2E test: all API endpoints against a real Databricks connection.

  Required env var:
      TEST_DATABRICKS_CONNECTION_ID   UUID of a pre-configured connection in the product DB
  """
  import os
  import pytest
  from backend.tests.e2e.conftest import make_client, default_params

  CONNECTION_ID = os.environ.get("TEST_DATABRICKS_CONNECTION_ID", "")


  @pytest.mark.e2e
  @pytest.mark.skipif(not CONNECTION_ID, reason="TEST_DATABRICKS_CONNECTION_ID not set")
  class TestDatabricksE2E:
      @pytest.fixture(scope="class")
      def client(self):
          return make_client()

      @pytest.fixture(scope="class")
      def params(self):
          return default_params(CONNECTION_ID)

      @pytest.fixture(scope="class")
      def first_event(self, client, params):
          r = client.get("/api/events", params={"connection_id": CONNECTION_ID})
          events = r.json().get("events", [])
          return events[0] if events else None

      @pytest.fixture(scope="class")
      def first_user(self, client, params):
          r = client.get("/api/raw/events", params=params)
          data = r.json().get("data", [])
          return data[0]["user_id"] if data else None

      def test_events(self, client, params):
          r = client.get("/api/events", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["events"], list)

      def test_events_top(self, client, params):
          r = client.get("/api/events/top", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_trend(self, client, params):
          r = client.get("/api/trend", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_unique_users"], (int, float))

      def test_retention(self, client, params):
          r = client.get("/api/retention", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["granularity"], str)
          assert isinstance(body["milestones"], list)
          assert isinstance(body["total_available_cohorts"], int)

      def test_conversion(self, client, params):
          r = client.get("/api/conversion", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_paths(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/paths", params={**params, "target_event": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["target_event"], str)

      def test_path_analysis(self, client, params):
          r = client.get("/api/path-analysis", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_paths"], int)

      def test_path_funnel(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/path-funnel", params={**params, "events": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_steps"], int)

      def test_pivot(self, client, params):
          r = client.get("/api/pivot", params={**params, "measures": "count_events"})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["measures"], list)

      def test_pivot_options(self, client):
          r = client.get("/api/pivot/options", params={"connection_id": CONNECTION_ID})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["dimensions"], list)
          assert isinstance(body["measures"], list)

      def test_raw_events(self, client, params):
          r = client.get("/api/raw/events", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_raw_sessions(self, client, params):
          r = client.get("/api/raw/sessions", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_sessions_summary(self, client, params):
          r = client.get("/api/sessions/summary", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_user_events(self, client, params, first_user):
          if not first_user:
              pytest.skip("No users in test DB")
          r = client.get(
              f"/api/users/{first_user}/events",
              params={"connection_id": CONNECTION_ID},
          )
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["user_id"], str)

      def test_connection_test(self, client):
          r = client.post(f"/api/connections/{CONNECTION_ID}/test")
          assert r.status_code == 200

      def test_connection_schema(self, client):
          r = client.get(f"/api/connections/{CONNECTION_ID}/schema")
          assert r.status_code == 200
          assert isinstance(r.json(), dict)
  ```

- [ ] **Step 2: Verify skips, commit**

  ```bash
  uv run pytest backend/tests/e2e/test_e2e_databricks.py -v 2>&1 | tail -5
  git add backend/tests/e2e/test_e2e_databricks.py
  git commit -m "test(e2e): add Databricks E2E test"
  ```

---

## Task 6: SQLite E2E test

**Files:**

- Create: `backend/tests/e2e/test_e2e_sqlite.py`

- [ ] **Step 1: Create the file**

  Same structure. Env var: `TEST_SQLITE_CONNECTION_ID`, class: `TestSQLiteE2E`.

  ```python
  """E2E test: all API endpoints against a real SQLite connection.

  Required env var:
      TEST_SQLITE_CONNECTION_ID   UUID of a pre-configured connection in the product DB
  """
  import os
  import pytest
  from backend.tests.e2e.conftest import make_client, default_params

  CONNECTION_ID = os.environ.get("TEST_SQLITE_CONNECTION_ID", "")


  @pytest.mark.e2e
  @pytest.mark.skipif(not CONNECTION_ID, reason="TEST_SQLITE_CONNECTION_ID not set")
  class TestSQLiteE2E:
      @pytest.fixture(scope="class")
      def client(self):
          return make_client()

      @pytest.fixture(scope="class")
      def params(self):
          return default_params(CONNECTION_ID)

      @pytest.fixture(scope="class")
      def first_event(self, client, params):
          r = client.get("/api/events", params={"connection_id": CONNECTION_ID})
          events = r.json().get("events", [])
          return events[0] if events else None

      @pytest.fixture(scope="class")
      def first_user(self, client, params):
          r = client.get("/api/raw/events", params=params)
          data = r.json().get("data", [])
          return data[0]["user_id"] if data else None

      def test_events(self, client, params):
          r = client.get("/api/events", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["events"], list)

      def test_events_top(self, client, params):
          r = client.get("/api/events/top", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_trend(self, client, params):
          r = client.get("/api/trend", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_unique_users"], (int, float))

      def test_retention(self, client, params):
          r = client.get("/api/retention", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["granularity"], str)
          assert isinstance(body["milestones"], list)
          assert isinstance(body["total_available_cohorts"], int)

      def test_conversion(self, client, params):
          r = client.get("/api/conversion", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_paths(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/paths", params={**params, "target_event": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["target_event"], str)

      def test_path_analysis(self, client, params):
          r = client.get("/api/path-analysis", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_paths"], int)

      def test_path_funnel(self, client, params, first_event):
          if not first_event:
              pytest.skip("No events in test DB")
          r = client.get("/api/path-funnel", params={**params, "events": first_event})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total_steps"], int)

      def test_pivot(self, client, params):
          r = client.get("/api/pivot", params={**params, "measures": "count_events"})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["measures"], list)

      def test_pivot_options(self, client):
          r = client.get("/api/pivot/options", params={"connection_id": CONNECTION_ID})
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["dimensions"], list)
          assert isinstance(body["measures"], list)

      def test_raw_events(self, client, params):
          r = client.get("/api/raw/events", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_raw_sessions(self, client, params):
          r = client.get("/api/raw/sessions", params=params)
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["total"], int)
          assert isinstance(body["limit"], int)
          assert isinstance(body["offset"], int)

      def test_sessions_summary(self, client, params):
          r = client.get("/api/sessions/summary", params=params)
          assert r.status_code == 200
          assert isinstance(r.json()["data"], list)

      def test_user_events(self, client, params, first_user):
          if not first_user:
              pytest.skip("No users in test DB")
          r = client.get(
              f"/api/users/{first_user}/events",
              params={"connection_id": CONNECTION_ID},
          )
          assert r.status_code == 200
          body = r.json()
          assert isinstance(body["data"], list)
          assert isinstance(body["user_id"], str)

      def test_connection_test(self, client):
          r = client.post(f"/api/connections/{CONNECTION_ID}/test")
          assert r.status_code == 200

      def test_connection_schema(self, client):
          r = client.get(f"/api/connections/{CONNECTION_ID}/schema")
          assert r.status_code == 200
          assert isinstance(r.json(), dict)
  ```

- [ ] **Step 2: Verify skips, commit**

  ```bash
  uv run pytest backend/tests/e2e/test_e2e_sqlite.py -v 2>&1 | tail -5
  git add backend/tests/e2e/test_e2e_sqlite.py
  git commit -m "test(e2e): add SQLite E2E test"
  ```

---

## Task 7: Final verification

- [ ] **Step 1: Run full e2e directory without credentials — all should skip**

  ```bash
  uv run pytest backend/tests/e2e/ -v --strict-markers 2>&1 | tail -15
  ```

  Expected: all `SKIPPED`, zero `FAILED`, zero `ERROR`, no marker warnings.

- [ ] **Step 2: Run full backend test suite to confirm no regressions**

  ```bash
  uv run pytest backend/tests/ -q -m "not integration and not e2e" --tb=no 2>&1 | tail -5
  ```

  Expected: all pass, 0 failed (count may differ from your environment).

- [ ] **Step 3: Verify test.sh --e2e flag**

  ```bash
  ./test.sh --e2e 2>&1 | tail -10
  ```

  Expected: all e2e tests skip (no credentials set), exit 0.

- [ ] **Step 4: Final commit if any fixes needed, then push**

  ```bash
  git push origin feat/python-api-e2e
  ```
