# Python API — E2E Tests Design Spec
**Date:** 2026-03-25
**Status:** Approved

## Overview

Add a `@pytest.mark.e2e` test category that exercises all exposed FastAPI analytics endpoints against real databases using pre-configured connection IDs. Tests verify the full stack — routing → DI → `open_analytics_db` → real backend driver → real DB → HTTP response — without mocking anything.

---

## Goals

- Catch regressions in the service layer that unit tests (which mock the DB) cannot catch
- Work with any schema (schema config is pre-configured in the product DB per connection)
- Skip gracefully when credentials or connection IDs are absent (zero CI impact)
- Cover all exposed analytics and connection management endpoints

---

## Architecture

### Approach

Each E2E test file uses FastAPI's `TestClient(app)` — the real app, no dependency overrides. The test passes a `connection_id` query param that points to a real connection already registered in the product DB (with schema config set up). The full request/response cycle runs: router → `get_analytics_db` dependency → `open_analytics_db` → real backend → real database.

Tests assert:
1. `status_code == 200`
2. Response has expected top-level keys
3. Value types are correct (e.g. `data` is a list, counts are integers or floats)

No assertions on specific values — the data in the test DB is unknown. An empty list response (0 rows) is valid as long as the status is 200.

### Skip Logic

Each file skips if `TEST_<BACKEND>_CONNECTION_ID` is not set. This is the only required env var — it's a UUID pointing to a pre-configured connection in the product DB. No credential env vars are read by the E2E tests directly (credentials are stored encrypted in the product DB).

---

## File Structure

```
backend/tests/e2e/
├── __init__.py
├── conftest.py                      # shared client factory, date helpers
├── test_e2e_postgresql.py
├── test_e2e_clickhouse.py
├── test_e2e_snowflake.py
├── test_e2e_databricks.py
└── test_e2e_sqlite.py
```

---

## Env Vars

| Backend | Required env var |
|---|---|
| PostgreSQL | `TEST_POSTGRES_CONNECTION_ID` |
| ClickHouse | `TEST_CLICKHOUSE_CONNECTION_ID` |
| Snowflake | `TEST_SNOWFLAKE_CONNECTION_ID` |
| Databricks | `TEST_DATABRICKS_CONNECTION_ID` |
| SQLite | `TEST_SQLITE_CONNECTION_ID` |

These are UUIDs of connections pre-registered in the product DB with schema config already set up. One-time manual setup per environment.

---

## Shared conftest.py

```python
# backend/tests/e2e/conftest.py
from datetime import date, timedelta
from starlette.testclient import TestClient
from backend.main import app


def make_client() -> TestClient:
    return TestClient(app)


def default_params(connection_id: str) -> dict:
    end = date.today()
    start = end - timedelta(days=30)
    return {
        "connection_id": connection_id,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }
```

---

## Endpoint Coverage

Each backend file contains one test class with one test method per endpoint. `target_event` and `events` for paths/path-funnel are fetched dynamically from `/api/events` at fixture setup time. If the DB has no events, path tests are skipped.

| Endpoint | Required params beyond connection_id | Asserted shape |
|---|---|---|
| `GET /api/events` | — | `{"events": list}` |
| `GET /api/events/top` | `start_date`, `end_date` | `{"data": list}` |
| `GET /api/trend` | `start_date`, `end_date` | `{"data": list, "total_unique_users": int\|float}` |
| `GET /api/retention` | `start_date`, `end_date` | `{"granularity": str, "milestones": list, "total_available_cohorts": int, "data": list}` |
| `GET /api/conversion` | `start_date`, `end_date` | `{"data": list}` |
| `GET /api/paths` | `start_date`, `end_date`, `target_event` (from events list) | `{"data": list, "target_event": str}` |
| `GET /api/path-analysis` | `start_date`, `end_date` | `{"data": list, "total_paths": int}` |
| `GET /api/path-funnel` | `start_date`, `end_date`, `events` (first 2 from events list) | `{"data": list, "total_steps": int}` |
| `GET /api/pivot` | `start_date`, `end_date`, `measures=count_events` | `{"data": list, "measures": list}` |
| `GET /api/pivot/options` | — | `{"dimensions": list, "measures": list}` |
| `GET /api/raw/events` | `start_date`, `end_date` | `{"data": list, "total": int, "limit": int, "offset": int}` |
| `GET /api/raw/sessions` | `start_date`, `end_date` | `{"data": list, "total": int, "limit": int, "offset": int}` |
| `GET /api/sessions/summary` | `start_date`, `end_date` | `{"data": list}` |
| `GET /api/users/{user_id}/events` | `user_id` (first user from raw/events) | `{"user_id": str, "data": list}` |
| `POST /api/connections/{id}/test` | path param | `200` |
| `GET /api/connections/{id}/schema` | path param | `200`, response is dict |

**Excluded endpoints (intentional):**
- `GET /api/pivot/grid`, `POST /api/pivot/grid/rows`, `GET /api/pivot/grid/filter-values` — AG Grid server-side row model; requires complex request body. Out of scope for this test suite.
- `WebSocket /ws` — separate concern
- `mission_control` router — separate concern
- Connections CRUD (`POST`, `PATCH`, `DELETE`) — would mutate the product DB during tests

---

## Example Test File (PostgreSQL)

```python
"""E2E test: all API endpoints against a real PostgreSQL connection.

Required env var:
    TEST_POSTGRES_CONNECTION_ID   UUID of a pre-configured connection in the product DB
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
        """Fetch first available event name for endpoints that require one."""
        r = client.get("/api/events", params={"connection_id": CONNECTION_ID})
        events = r.json().get("events", [])
        return events[0] if events else None

    @pytest.fixture(scope="class")
    def first_user(self, client, params):
        """Fetch first available user_id for user-specific endpoints."""
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

    def test_pivot_options(self, client, params):
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

---

## pyproject.toml Changes

Add `e2e` marker alongside `integration`:

```toml
[tool.pytest.ini_options]
markers = [
    "integration: marks tests that require a real external database connection (deselect with '-m not integration')",
    "e2e: marks end-to-end tests that require a pre-configured connection_id in the product DB (deselect with '-m not e2e')",
]
```

---

## test.sh Changes

Add `--e2e` flag:

```bash
./test.sh --e2e                              # e2e tests only
./test.sh --e2e --env-file .env.test         # with credentials from file
./test.sh --e2e --env-file .env.test -k postgres  # filter to one backend
```

---

## Pre-requisites (one-time setup per environment)

1. Ensure `STRATIFIO_PRODUCT_DB_PATH` points to the product DB containing the test connections.
2. For each backend you want to test:
   - Create a connection via `POST /api/connections` with real credentials
   - Configure the schema via `PUT /api/connections/{id}/schema` (map `user_id_field`, `timestamp_field`, `event_name_field`, `events_table`)
   - Note the connection UUID
   - Add to `.env.test`: `TEST_POSTGRES_CONNECTION_ID=<uuid>`

---

## What This Does NOT Test

- Specific data values (unknown test DB content)
- Authentication (auth is disabled by default in dev/test)
- WebSocket endpoint (`/ws`) — separate concern
- `mission_control` router — separate concern
- AG Grid endpoints (`/api/pivot/grid/*`) — complex request body, out of scope
- Connections CRUD mutations (`POST`, `PATCH`, `DELETE`) — would mutate the product DB
