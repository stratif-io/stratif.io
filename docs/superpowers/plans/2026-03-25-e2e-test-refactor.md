# E2E Test Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor E2E tests to be self-bootstrapping from credentials in `connections.yaml`, executing a full 11-step lifecycle per backend instead of requiring pre-seeded connection IDs.

**Architecture:** A module-level `E2E_CONFIG` dict (parsed from `connections.yaml` at import time) drives backend selection. A session-scoped `client` fixture creates a temp-file SQLite product DB and a `TestClient`. `BaseE2ETest` runs 11 ordered steps per backend, storing state in class variables between steps.

**Tech Stack:** Python 3.12, pytest, starlette TestClient, pyyaml, FastAPI

**Spec:** `docs/superpowers/specs/2026-03-25-e2e-test-refactor-design.md`

---

## File Map

**New files:**
- `backend/tests/e2e/connections.yaml` — committed config, credentials per backend
- `backend/tests/e2e/fixtures/seed.py` — script to generate test fixture DBs

**Rewritten files:**
- `backend/tests/e2e/conftest.py` — module-level `E2E_CONFIG`, session-scoped `client` fixture
- `backend/tests/e2e/base.py` — `BaseE2ETest` with 11 ordered test steps
- `backend/tests/e2e/test_e2e_sqlite.py` — one-liner subclass
- `backend/tests/e2e/test_e2e_duckdb.py` — one-liner subclass
- `backend/tests/e2e/test_e2e_postgresql.py` — one-liner subclass
- `backend/tests/e2e/test_e2e_clickhouse.py` — one-liner subclass
- `backend/tests/e2e/test_e2e_snowflake.py` — one-liner subclass
- `backend/tests/e2e/test_e2e_databricks.py` — one-liner subclass

**Modified files:**
- `pyproject.toml` — add `pyyaml` to dev deps; update `e2e` marker description
- `.gitignore` — add `backend/tests/e2e/fixtures/*.db` and `*.duckdb`

---

## Task 1: Add pyyaml dependency and create fixture seed script

**Files:**
- Modify: `pyproject.toml`
- Modify: `.gitignore`
- Create: `backend/tests/e2e/fixtures/seed.py`

- [ ] **Step 1: Add pyyaml to dev dependencies**

  In `pyproject.toml`, add `"pyyaml>=6.0"` to `[dependency-groups] dev`:

  ```toml
  [dependency-groups]
  dev = [
      "pre-commit>=4.3.0",
      "pytest>=8.4.2",
      "pyyaml>=6.0",
      "ruff>=0.15.2",
      "ty>=0.0.17",
      "testcontainers[clickhouse,postgres]>=4.8",
      "fakesnow>=0.9.0",
  ]
  ```

- [ ] **Step 2: Install the new dependency**

  Run: `uv sync`
  Expected: resolves and installs pyyaml without errors.

- [ ] **Step 3: Add generated fixture files to .gitignore**

  Add to `.gitignore`:
  ```
  # E2E test fixtures (generated — run backend/tests/e2e/fixtures/seed.py to create)
  backend/tests/e2e/fixtures/test.db
  backend/tests/e2e/fixtures/test.duckdb
  ```

- [ ] **Step 4: Create the fixtures directory and seed script**

  Create `backend/tests/e2e/fixtures/__init__.py` (empty).

  Create `backend/tests/e2e/fixtures/seed.py`:

  ```python
  """Generate small SQLite and DuckDB test fixture databases for E2E tests.

  Run from the project root:
      python backend/tests/e2e/fixtures/seed.py

  Produces:
      backend/tests/e2e/fixtures/test.db      (SQLite)
      backend/tests/e2e/fixtures/test.duckdb  (DuckDB)

  Uses 200 users over 90 days — small enough to be fast, large enough
  for all analytics endpoints to return results.
  """
  import os
  import sys
  from pathlib import Path

  # Ensure project root is on path when run directly.
  ROOT = Path(__file__).resolve().parents[4]
  if str(ROOT) not in sys.path:
      sys.path.insert(0, str(ROOT))

  FIXTURES_DIR = Path(__file__).parent
  SQLITE_OUT = FIXTURES_DIR / "test.db"
  DUCKDB_OUT = FIXTURES_DIR / "test.duckdb"

  _SEED_USERS = 200
  _SEED_DAYS = 90


  def _seed_sqlite() -> None:
      import sqlite3, json, random, uuid
      from datetime import datetime, timedelta
      from seeders.seeder import COUNTRIES, FUNNEL_PATH, BROWSERS, DEVICE_TYPES

      print(f"Seeding SQLite → {SQLITE_OUT}")
      SQLITE_OUT.unlink(missing_ok=True)
      conn = sqlite3.connect(str(SQLITE_OUT))
      conn.execute("""
          CREATE TABLE events (
              user_id    TEXT NOT NULL,
              event_name TEXT NOT NULL,
              timestamp  DATETIME NOT NULL,
              properties TEXT NOT NULL
          )
      """)
      conn.execute("CREATE INDEX idx_ts ON events (timestamp)")
      conn.commit()

      rng = random.Random(42)
      country_codes = list(COUNTRIES.keys())
      country_weights = [COUNTRIES[c]["weight"] for c in country_codes]
      browser_names = [b[0] for b in BROWSERS]
      browser_weights = [b[1] for b in BROWSERS]
      device_names = [d[0] for d in DEVICE_TYPES]
      device_weights = [d[1] for d in DEVICE_TYPES]

      now = datetime.now()
      rows: list[tuple] = []

      for _ in range(_SEED_USERS):
          uid = str(uuid.uuid4())
          country = rng.choices(country_codes, weights=country_weights)[0]
          city = rng.choice(COUNTRIES[country]["cities"])
          browser = rng.choices(browser_names, weights=browser_weights)[0]
          device = rng.choices(device_names, weights=device_weights)[0]

          for _ in range(rng.randint(1, 5)):
              ts = now - timedelta(days=rng.randint(0, _SEED_DAYS - 1),
                                   hours=rng.randint(0, 23),
                                   minutes=rng.randint(0, 59))
              event = rng.choice(list(FUNNEL_PATH))
              props = {
                  "country": country,
                  "city": city,
                  "browser": browser,
                  "device_type": device,
                  "session_id": str(uuid.uuid4())[:12],
              }
              rows.append((uid, event, ts.strftime("%Y-%m-%d %H:%M:%S"), json.dumps(props)))

      conn.executemany(
          "INSERT INTO events (user_id, event_name, timestamp, properties) VALUES (?,?,?,?)",
          rows,
      )
      conn.commit()
      conn.close()
      print(f"  Done — {len(rows)} events written to {SQLITE_OUT}")


  def _seed_duckdb() -> None:
      import json, random, uuid
      from datetime import datetime, timedelta
      import duckdb
      from seeders.seeder import COUNTRIES, FUNNEL_PATH, BROWSERS, DEVICE_TYPES

      print(f"Seeding DuckDB → {DUCKDB_OUT}")
      DUCKDB_OUT.unlink(missing_ok=True)
      conn = duckdb.connect(str(DUCKDB_OUT))
      conn.execute("""
          CREATE TABLE events (
              user_id    VARCHAR,
              event_name VARCHAR,
              timestamp  TIMESTAMP,
              properties JSON
          )
      """)

      rng = random.Random(42)
      country_codes = list(COUNTRIES.keys())
      country_weights = [COUNTRIES[c]["weight"] for c in country_codes]
      browser_names = [b[0] for b in BROWSERS]
      browser_weights = [b[1] for b in BROWSERS]
      device_names = [d[0] for d in DEVICE_TYPES]
      device_weights = [d[1] for d in DEVICE_TYPES]

      now = datetime.now()
      rows: list[tuple] = []

      for _ in range(_SEED_USERS):
          uid = str(uuid.uuid4())
          country = rng.choices(country_codes, weights=country_weights)[0]
          city = rng.choice(COUNTRIES[country]["cities"])
          browser = rng.choices(browser_names, weights=browser_weights)[0]
          device = rng.choices(device_names, weights=device_weights)[0]

          for _ in range(rng.randint(1, 5)):
              ts = now - timedelta(days=rng.randint(0, _SEED_DAYS - 1),
                                   hours=rng.randint(0, 23),
                                   minutes=rng.randint(0, 59))
              event = rng.choice(list(FUNNEL_PATH))
              props = json.dumps({
                  "country": country,
                  "city": city,
                  "browser": browser,
                  "device_type": device,
                  "session_id": str(uuid.uuid4())[:12],
              })
              rows.append((uid, event, ts, props))

      conn.executemany(
          "INSERT INTO events VALUES (?, ?, ?, ?)",
          rows,
      )
      conn.close()
      print(f"  Done — {len(rows)} events written to {DUCKDB_OUT}")


  if __name__ == "__main__":
      _seed_sqlite()
      _seed_duckdb()
      print("\nFixtures created. Run: pytest -m e2e")
  ```

- [ ] **Step 5: Generate the fixture databases**

  Run: `uv run python backend/tests/e2e/fixtures/seed.py`

  Expected output:
  ```
  Seeding SQLite → backend/tests/e2e/fixtures/test.db
    Done — <N> events written to ...test.db
  Seeding DuckDB → backend/tests/e2e/fixtures/test.duckdb
    Done — <N> events written to ...test.duckdb
  Fixtures created. Run: pytest -m e2e
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add pyproject.toml .gitignore backend/tests/e2e/fixtures/
  git commit -m "chore(e2e): add pyyaml dep and fixture seed script"
  ```

---

## Task 2: Create connections.yaml

**Files:**
- Create: `backend/tests/e2e/connections.yaml`

- [ ] **Step 1: Create the config file**

  Create `backend/tests/e2e/connections.yaml`:

  ```yaml
  backends:
    sqlite:
      enabled: true
      credentials:
        file_path: ./backend/tests/e2e/fixtures/test.db
      expected_columns:
        - city
        - country

    duckdb:
      enabled: true
      credentials:
        file_path: ./backend/tests/e2e/fixtures/test.duckdb
      expected_columns:
        - city
        - country

    postgresql:
      enabled: false
      credentials: {}
      expected_columns: []

    clickhouse:
      enabled: false
      credentials: {}
      expected_columns: []

    snowflake:
      enabled: false
      credentials: {}
      expected_columns: []

    databricks:
      enabled: false
      credentials: {}
      expected_columns: []
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add backend/tests/e2e/connections.yaml
  git commit -m "chore(e2e): add connections.yaml config"
  ```

---

## Task 3: Rewrite conftest.py

**Files:**
- Modify: `backend/tests/e2e/conftest.py`

- [ ] **Step 1: Rewrite conftest.py**

  Replace the entire contents of `backend/tests/e2e/conftest.py`:

  ```python
  """Shared E2E test infrastructure.

  E2E tests are self-bootstrapping: each backend's credentials are read from
  connections.yaml. Tests create their own product DB and connection records.

  Run with: pytest -m e2e
  """
  import pathlib

  import pytest
  import yaml
  from starlette.testclient import TestClient

  from backend.config import settings
  from backend.main import app
  from backend.product_db.deps import get_product_db
  from backend.product_db.migrations import init_product_db

  # ---------------------------------------------------------------------------
  # Module-level config — parsed at import time so setup_class can access it
  # without needing pytest fixture injection.
  # ---------------------------------------------------------------------------

  _CONFIG_PATH = pathlib.Path(__file__).parent / "connections.yaml"
  E2E_CONFIG: dict = yaml.safe_load(_CONFIG_PATH.read_text())["backends"]

  # Resolve relative file_path credentials to absolute paths based on the
  # project root (repo root is 4 levels up from this file). This makes paths
  # work regardless of the working directory pytest is run from.
  _REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
  for _backend_cfg in E2E_CONFIG.values():
      creds = _backend_cfg.get("credentials") or {}
      if "file_path" in creds:
          fp = pathlib.Path(creds["file_path"])
          if not fp.is_absolute():
              creds["file_path"] = str(_REPO_ROOT / fp)

  # ---------------------------------------------------------------------------
  # Encryption key used for all E2E credential storage — not a real secret.
  # ---------------------------------------------------------------------------

  _E2E_ENCRYPTION_KEY = "e2e-test-encryption-key-32-chars!!"


  # ---------------------------------------------------------------------------
  # Session-scoped TestClient with temp-file product DB
  # ---------------------------------------------------------------------------


  @pytest.fixture(scope="session")
  def client(tmp_path_factory):
      """Return a TestClient backed by a temp-file SQLite product DB.

      Why a named file (not :memory:): SQLiteProductDB opens a new
      sqlite3.connect() per operation. :memory: creates a separate isolated
      DB on each call. A named file ensures all callers — both Depends() and
      direct get_product_db() calls in routers — see the same data.

      Why cache_clear() before AND after: clears any stale cached instance
      from a prior run before setup, and prevents the temp-file path from
      leaking beyond this session after teardown.
      """
      db_path = tmp_path_factory.mktemp("product_db") / "product.db"

      settings.product_db_path = str(db_path)
      settings.encryption_key = _E2E_ENCRYPTION_KEY
      get_product_db.cache_clear()
      init_product_db()

      with TestClient(app, raise_server_exceptions=True) as c:
          yield c

      get_product_db.cache_clear()
  ```

- [ ] **Step 2: Verify conftest imports cleanly**

  Run: `uv run python -c "from backend.tests.e2e.conftest import E2E_CONFIG; print(list(E2E_CONFIG.keys()))"`

  Expected: `['sqlite', 'duckdb', 'postgresql', 'clickhouse', 'snowflake', 'databricks']`

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/e2e/conftest.py
  git commit -m "feat(e2e): rewrite conftest with module-level config and temp-db client fixture"
  ```

---

## Task 4: Rewrite base.py with 11 ordered steps

**Files:**
- Modify: `backend/tests/e2e/base.py`

This is the core of the refactor. Each method name starts with `test_0N_` so pytest's default alphabetical ordering runs them in sequence. State accumulates in class variables between steps.

- [ ] **Step 1: Rewrite base.py**

  Replace the entire contents of `backend/tests/e2e/base.py`:

  ```python
  """Base class for self-bootstrapping E2E tests.

  Each dialect subclass sets db_type and inherits the 11-step lifecycle:

    01 create_connection     — POST /api/connections/
    02 bad_creds             — throwaway connection with wrong credentials
    03 good_creds            — confirm good connection passes /test
    04 schema_empty          — schema is null before configuration
    05 detect_schema         — GET /schema/detect, store result
    06 schema_has_columns    — expected_columns are in the detected schema
    07 save_schema           — PUT /schema with detected suggestions
    08 add_filters           — PUT /filters with city + country
    09 queries_with_dates    — all analytics endpoints with date range
    10 queries_all_time      — all analytics endpoints without dates
    11 cleanup               — DELETE connection

  State flows through class variables:
    cls.connection_id     — set in test_01, used by test_02–test_11
    cls.detected_schema   — set in test_05, used by test_06–test_11

  Skip guards: if a required class var is None (prior step didn't complete),
  subsequent steps skip rather than fail, keeping the output clean.
  """
  from __future__ import annotations

  from datetime import date, timedelta
  from typing import ClassVar, Optional

  import pytest

  from backend.tests.e2e.conftest import E2E_CONFIG


  class BaseE2ETest:
      db_type: ClassVar[str] = ""
      connection_id: ClassVar[Optional[str]] = None
      detected_schema: ClassVar[Optional[dict]] = None

      # ------------------------------------------------------------------
      # Class setup — skip entire class if backend is not enabled
      # ------------------------------------------------------------------

      @classmethod
      def setup_class(cls) -> None:
          cfg = E2E_CONFIG.get(cls.db_type, {})
          if not cfg.get("enabled", False):
              pytest.skip(f"backend '{cls.db_type}' not enabled in connections.yaml")
          cls.connection_id = None
          cls.detected_schema = None

      # ------------------------------------------------------------------
      # Helpers
      # ------------------------------------------------------------------

      def _credentials(self) -> dict:
          return dict(E2E_CONFIG[self.db_type]["credentials"])

      def _bad_credentials(self) -> dict:
          """Derive credentials guaranteed to fail connection."""
          creds = self._credentials()
          if self.db_type in ("sqlite", "duckdb"):
              creds["file_path"] = "/nonexistent/path/does_not_exist.db"
          elif self.db_type in ("postgresql", "clickhouse", "snowflake"):
              creds["password"] = creds.get("password", "") + "_wrong"
          elif self.db_type == "databricks":
              creds["token"] = creds.get("token", "") + "_wrong"
          return creds

      def _date_params(self, connection_id: str) -> dict:
          """Return query params with a 60-day date window."""
          end = date.today()
          start = end - timedelta(days=60)
          return {
              "connection_id": connection_id,
              "start_date": start.isoformat(),
              "end_date": end.isoformat(),
          }

      def _all_time_params(self, connection_id: str) -> dict:
          """Return query params without date bounds."""
          return {"connection_id": connection_id}

      def _skip_if_no_connection(self) -> None:
          if not type(self).connection_id:
              pytest.skip("connection_id not available — test_01 did not complete")

      def _skip_if_no_schema(self) -> None:
          if not type(self).detected_schema:
              pytest.skip("detected_schema not available — test_05 did not complete")

      # ------------------------------------------------------------------
      # Step 01 — Create connection
      # ------------------------------------------------------------------

      def test_01_create_connection(self, client) -> None:
          r = client.post(
              "/api/connections/",
              json={
                  "name": f"e2e-test-{self.db_type}",
                  "db_type": self.db_type,
                  "credentials": self._credentials(),
              },
          )
          assert r.status_code == 201, r.text
          body = r.json()
          assert "id" in body
          type(self).connection_id = body["id"]

      # ------------------------------------------------------------------
      # Step 02 — Test connection with bad credentials (throwaway)
      # ------------------------------------------------------------------

      def test_02_test_connection_bad_creds(self, client) -> None:
          self._skip_if_no_connection()

          # Create a throwaway connection with wrong credentials.
          # Its ID is stored locally — never in cls.connection_id.
          r = client.post(
              "/api/connections/",
              json={
                  "name": f"e2e-bad-{self.db_type}",
                  "db_type": self.db_type,
                  "credentials": self._bad_credentials(),
              },
          )
          assert r.status_code == 201, r.text
          throwaway_id = r.json()["id"]

          try:
              r = client.post(f"/api/connections/{throwaway_id}/test")
              # Expect either a non-200 status or ok=False in body.
              if r.status_code == 200:
                  assert r.json().get("ok") is not True, (
                      "Expected connection test to fail with bad credentials, "
                      f"got: {r.json()}"
                  )
          finally:
              client.delete(f"/api/connections/{throwaway_id}")

      # ------------------------------------------------------------------
      # Step 03 — Test connection with good credentials
      # ------------------------------------------------------------------

      def test_03_test_connection_good(self, client) -> None:
          self._skip_if_no_connection()
          conn_id = type(self).connection_id
          r = client.post(f"/api/connections/{conn_id}/test")
          assert r.status_code == 200, r.text
          assert r.json().get("ok") is True, r.json()

      # ------------------------------------------------------------------
      # Step 04 — Schema is null before any configuration
      # ------------------------------------------------------------------

      def test_04_schema_empty(self, client) -> None:
          self._skip_if_no_connection()
          conn_id = type(self).connection_id
          r = client.get(f"/api/connections/{conn_id}/schema")
          assert r.status_code == 200, r.text
          assert r.json() is None, f"Expected null schema, got: {r.json()}"

      # ------------------------------------------------------------------
      # Step 05 — Detect schema
      # ------------------------------------------------------------------

      def test_05_detect_schema(self, client) -> None:
          self._skip_if_no_connection()
          conn_id = type(self).connection_id
          r = client.get(f"/api/connections/{conn_id}/schema/detect")
          assert r.status_code == 200, r.text
          body = r.json()
          assert "columns" in body, f"Missing 'columns' key: {body}"
          assert "suggestions" in body, f"Missing 'suggestions' key: {body}"
          assert "proposed_custom_properties" in body, (
              f"Missing 'proposed_custom_properties' key: {body}"
          )
          type(self).detected_schema = body

      # ------------------------------------------------------------------
      # Step 06 — Detected schema contains expected columns
      # ------------------------------------------------------------------

      def test_06_schema_has_expected_columns(self, client) -> None:
          self._skip_if_no_connection()
          self._skip_if_no_schema()

          expected = E2E_CONFIG[self.db_type].get("expected_columns", [])
          if not expected:
              pytest.skip("No expected_columns configured for this backend")

          schema = type(self).detected_schema
          detected_names = {c["name"] for c in schema.get("columns", [])}
          detected_names |= {
              p["name"] for p in schema.get("proposed_custom_properties", [])
          }

          missing = [col for col in expected if col not in detected_names]
          assert not missing, (
              f"Expected columns {missing} not found in detected schema.\n"
              f"Detected: {sorted(detected_names)}"
          )

      # ------------------------------------------------------------------
      # Step 07 — Save schema with detected suggestions
      # ------------------------------------------------------------------

      def test_07_save_schema(self, client) -> None:
          self._skip_if_no_connection()
          self._skip_if_no_schema()
          conn_id = type(self).connection_id
          suggestions = type(self).detected_schema["suggestions"]
          r = client.put(f"/api/connections/{conn_id}/schema", json=suggestions)
          assert r.status_code == 200, r.text

      # ------------------------------------------------------------------
      # Step 08 — Add city and country as global filters
      # ------------------------------------------------------------------

      def test_08_add_global_filters(self, client) -> None:
          self._skip_if_no_connection()
          conn_id = type(self).connection_id
          r = client.put(
              f"/api/connections/{conn_id}/filters",
              json={
                  "filter_fields": [
                      {"field": "city", "label": "City", "icon": "map-pin"},
                      {"field": "country", "label": "Country", "icon": "globe"},
                  ]
              },
          )
          assert r.status_code == 200, r.text

      # ------------------------------------------------------------------
      # Step 09 — All analytics endpoints with date range
      # ------------------------------------------------------------------

      def test_09_queries_with_dates(self, client) -> None:
          self._skip_if_no_connection()
          conn_id = type(self).connection_id
          params = self._date_params(conn_id)
          self._assert_all_analytics(client, params)

      # ------------------------------------------------------------------
      # Step 10 — All analytics endpoints without date params (all-time)
      # ------------------------------------------------------------------

      def test_10_queries_all_time(self, client) -> None:
          self._skip_if_no_connection()
          conn_id = type(self).connection_id
          params = self._all_time_params(conn_id)
          self._assert_all_analytics(client, params)

      # ------------------------------------------------------------------
      # Step 11 — Cleanup: delete the connection
      # ------------------------------------------------------------------

      def test_11_cleanup(self, client) -> None:
          self._skip_if_no_connection()
          conn_id = type(self).connection_id
          r = client.delete(f"/api/connections/{conn_id}")
          assert r.status_code == 204, r.text
          type(self).connection_id = None

      # ------------------------------------------------------------------
      # Analytics assertion helper (used by steps 09 and 10)
      # ------------------------------------------------------------------

      def _assert_all_analytics(self, client, params: dict) -> None:
          """Hit all analytics endpoints and assert valid response shape."""
          conn_id = params["connection_id"]

          # events — list of strings
          r = client.get("/api/events", params=params)
          assert r.status_code == 200, f"GET /api/events failed: {r.text}"
          assert isinstance(r.json().get("events"), list), r.json()

          # events/top — {data: list}
          r = client.get("/api/events/top", params=params)
          assert r.status_code == 200, f"GET /api/events/top failed: {r.text}"
          assert isinstance(r.json().get("data"), list), r.json()

          # trend — {data: list, total_unique_users: int}
          r = client.get("/api/trend", params=params)
          assert r.status_code == 200, f"GET /api/trend failed: {r.text}"
          body = r.json()
          assert isinstance(body.get("data"), list), body
          assert isinstance(body.get("total_unique_users"), (int, float)), body

          # retention — {data: list, granularity: str, milestones: list}
          r = client.get("/api/retention", params=params)
          assert r.status_code == 200, f"GET /api/retention failed: {r.text}"
          body = r.json()
          assert isinstance(body.get("data"), list), body
          assert isinstance(body.get("granularity"), str), body

          # conversion — {data: list}
          r = client.get("/api/conversion", params=params)
          assert r.status_code == 200, f"GET /api/conversion failed: {r.text}"
          assert isinstance(r.json().get("data"), list), r.json()

          # paths — get first event to use as target
          events_r = client.get("/api/events", params={"connection_id": conn_id})
          first_event = (events_r.json().get("events") or [None])[0]
          if first_event:
              r = client.get("/api/paths", params={**params, "target_event": first_event})
              assert r.status_code == 200, f"GET /api/paths failed: {r.text}"
              body = r.json()
              assert isinstance(body.get("data"), list), body

          # pivot — {data: list, measures: list}
          r = client.get("/api/pivot", params={**params, "measures": "count_events"})
          assert r.status_code == 200, f"GET /api/pivot failed: {r.text}"
          body = r.json()
          assert isinstance(body.get("data"), list), body
          assert isinstance(body.get("measures"), list), body

          # sessions/summary — {data: list}
          r = client.get("/api/sessions/summary", params=params)
          assert r.status_code == 200, f"GET /api/sessions/summary failed: {r.text}"
          assert isinstance(r.json().get("data"), list), r.json()

          # raw/events — {data: list, total: int}
          r = client.get("/api/raw/events", params=params)
          assert r.status_code == 200, f"GET /api/raw/events failed: {r.text}"
          body = r.json()
          assert isinstance(body.get("data"), list), body
          assert isinstance(body.get("total"), int), body

          # raw/sessions — {data: list, total: int}
          r = client.get("/api/raw/sessions", params=params)
          assert r.status_code == 200, f"GET /api/raw/sessions failed: {r.text}"
          body = r.json()
          assert isinstance(body.get("data"), list), body
          assert isinstance(body.get("total"), int), body
  ```

- [ ] **Step 2: Verify base.py imports cleanly**

  Run: `uv run python -c "from backend.tests.e2e.base import BaseE2ETest; print('OK')"`

  Expected: `OK`

- [ ] **Step 3: Commit**

  ```bash
  git add backend/tests/e2e/base.py
  git commit -m "feat(e2e): rewrite BaseE2ETest with 11-step self-bootstrapping lifecycle"
  ```

---

## Task 5: Rewrite all dialect test files

**Files:**
- Modify: all 6 `backend/tests/e2e/test_e2e_*.py` files

Each file becomes a minimal subclass of `BaseE2ETest`. The `@pytest.mark.e2e` decorator is still applied. The `@pytest.mark.skipif` decorator is removed — the skip logic now lives in `BaseE2ETest.setup_class`.

- [ ] **Step 1: Rewrite test_e2e_sqlite.py**

  ```python
  """E2E test: full lifecycle against a real SQLite connection."""
  import pytest
  from backend.tests.e2e.base import BaseE2ETest


  @pytest.mark.e2e
  class TestSQLiteE2E(BaseE2ETest):
      db_type = "sqlite"
  ```

- [ ] **Step 2: Rewrite test_e2e_duckdb.py**

  ```python
  """E2E test: full lifecycle against a real DuckDB connection."""
  import pytest
  from backend.tests.e2e.base import BaseE2ETest


  @pytest.mark.e2e
  class TestDuckDBE2E(BaseE2ETest):
      db_type = "duckdb"
  ```

- [ ] **Step 3: Rewrite test_e2e_postgresql.py**

  ```python
  """E2E test: full lifecycle against a real PostgreSQL connection."""
  import pytest
  from backend.tests.e2e.base import BaseE2ETest


  @pytest.mark.e2e
  class TestPostgreSQLE2E(BaseE2ETest):
      db_type = "postgresql"
  ```

- [ ] **Step 4: Rewrite test_e2e_clickhouse.py**

  ```python
  """E2E test: full lifecycle against a real ClickHouse connection."""
  import pytest
  from backend.tests.e2e.base import BaseE2ETest


  @pytest.mark.e2e
  class TestClickHouseE2E(BaseE2ETest):
      db_type = "clickhouse"
  ```

- [ ] **Step 5: Rewrite test_e2e_snowflake.py**

  ```python
  """E2E test: full lifecycle against a real Snowflake connection."""
  import pytest
  from backend.tests.e2e.base import BaseE2ETest


  @pytest.mark.e2e
  class TestSnowflakeE2E(BaseE2ETest):
      db_type = "snowflake"
  ```

- [ ] **Step 6: Rewrite test_e2e_databricks.py**

  ```python
  """E2E test: full lifecycle against a real Databricks connection."""
  import pytest
  from backend.tests.e2e.base import BaseE2ETest


  @pytest.mark.e2e
  class TestDatabricksE2E(BaseE2ETest):
      db_type = "databricks"
  ```

- [ ] **Step 7: Commit all dialect files**

  ```bash
  git add backend/tests/e2e/test_e2e_*.py
  git commit -m "feat(e2e): simplify dialect files to one-liner BaseE2ETest subclasses"
  ```

---

## Task 6: Run E2E tests and verify

- [ ] **Step 1: Run E2E tests**

  Run: `uv run pytest -m e2e -v 2>&1 | head -100`

  Expected:
  - `TestSQLiteE2E` — 11 tests, all PASSED
  - `TestDuckDBE2E` — 11 tests, all PASSED
  - `TestPostgreSQLE2E` — all SKIPPED (not enabled)
  - `TestClickHouseE2E` — all SKIPPED (not enabled)
  - `TestSnowflakeE2E` — all SKIPPED (not enabled)
  - `TestDatabricksE2E` — all SKIPPED (not enabled)

- [ ] **Step 2: Verify non-e2e tests still pass**

  Run: `uv run pytest -m "not e2e" --tb=short -q`

  Expected: all existing unit/integration tests pass.

- [ ] **Step 3: Update pyproject.toml e2e marker description**

  Update the `e2e` marker description in `[tool.pytest.ini_options]`:

  ```toml
  markers = [
      "integration: marks tests that require a real external database connection (deselect with '-m not integration')",
      "e2e: marks self-bootstrapping end-to-end tests — credentials come from backend/tests/e2e/connections.yaml (deselect with '-m not e2e')",
  ]
  ```

- [ ] **Step 4: Final commit**

  ```bash
  git add pyproject.toml
  git commit -m "chore(e2e): update e2e marker description in pyproject.toml"
  ```
