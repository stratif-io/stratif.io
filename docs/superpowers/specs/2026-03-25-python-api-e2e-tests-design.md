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
3. Value types are correct (e.g. `data` is a list, counts are integers)

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

def make_client():
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

Each backend file contains one test class with one test method per endpoint:

| Endpoint | Minimal params | Asserted shape |
|---|---|---|
| `GET /api/events` | `connection_id` | `{"events": list}` |
| `GET /api/events/top` | `connection_id`, `start_date`, `end_date` | `{"data": list}` |
| `GET /api/trend` | `connection_id`, `start_date`, `end_date` | `{"data": list, "total_unique_users": int}` |
| `GET /api/retention` | `connection_id`, `start_date`, `end_date` | `{"data": list}` |
| `GET /api/conversion` | `connection_id`, `start_date`, `end_date` | `{"data": list}` |
| `GET /api/paths` | `connection_id`, `start_date`, `end_date` | `{"data": list}` |
| `GET /api/pivot` | `connection_id`, `start_date`, `end_date` | `{"data": list}` |
| `GET /api/sessions` | `connection_id`, `start_date`, `end_date` | response is dict |
| `GET /api/raw/events` | `connection_id`, `start_date`, `end_date` | `{"data": list}` |
| `POST /api/connections/{id}/test` | path param | `200` |
| `GET /api/connections/{id}/schema` | path param | `200`, response is dict |

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
        assert isinstance(body["total_unique_users"], int)

    def test_retention(self, client, params):
        r = client.get("/api/retention", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_conversion(self, client, params):
        r = client.get("/api/conversion", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_paths(self, client, params):
        r = client.get("/api/paths", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_pivot(self, client, params):
        r = client.get("/api/pivot", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_sessions(self, client, params):
        r = client.get("/api/sessions", params=params)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_raw_events(self, client, params):
        r = client.get("/api/raw/events", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

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
./test.sh --e2e                          # e2e tests only
./test.sh --e2e --env-file .env.test     # with credentials from file
./test.sh --e2e --env-file .env.test -k postgres  # filter to one backend
```

---

## Pre-requisites (one-time setup per environment)

For each backend you want to test:
1. Create a connection via `POST /api/connections` with real credentials
2. Configure the schema via `PUT /api/connections/{id}/schema` (map `user_id_field`, `timestamp_field`, `event_name_field`, `events_table`)
3. Note the connection UUID
4. Add to `.env.test`: `TEST_POSTGRES_CONNECTION_ID=<uuid>`

---

## What This Does NOT Test

- Specific data values (unknown test DB content)
- Authentication (auth is disabled by default in dev/test)
- WebSocket endpoint (`/ws`) — separate concern
- `mission_control` router — separate concern
