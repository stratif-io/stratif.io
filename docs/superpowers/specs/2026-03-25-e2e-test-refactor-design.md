# E2E Test Refactor — Design Spec

**Date:** 2026-03-25
**Status:** Approved

---

## Goal

Refactor backend E2E tests so they are fully self-bootstrapping from raw credentials. Instead of requiring a pre-seeded product DB with a known connection ID, tests receive database credentials from a committed config file and execute a full lifecycle: create product DB → create connection → validate → detect schema → configure → run all analytics queries.

---

## Config File

**Path:** `backend/tests/e2e/connections.yaml` (committed to the repo)

One entry per backend. `enabled: false` backends are skipped entirely at collection time.

```yaml
backends:
  sqlite:
    enabled: true
    credentials:
      file_path: ./backend/tests/e2e/fixtures/test.db

  duckdb:
    enabled: true
    credentials:
      file_path: ./backend/tests/e2e/fixtures/test.duckdb

  postgresql:
    enabled: false
    credentials:
      host: localhost
      port: 5432
      database: stratifio_test
      user: postgres
      password: postgres
      sslmode: disable

  clickhouse:
    enabled: false
    credentials:
      host: localhost
      port: 8123
      database: stratifio_test
      user: default
      password: ""

  snowflake:
    enabled: false
    credentials:
      account: ""
      user: ""
      password: ""
      warehouse: ""
      database: ""
      schema: public
      role: ""

  databricks:
    enabled: false
    credentials:
      host: ""
      token: ""
      path: ""
```

---

## Architecture

```
backend/tests/e2e/
├── connections.yaml          # committed config — credentials per backend
├── conftest.py               # session-scoped fixtures: config loader, in-memory product DB, TestClient
├── base.py                   # BaseE2ETest — 11 ordered test methods
├── test_e2e_sqlite.py        # class SQLiteE2ETest(BaseE2ETest): db_type = "sqlite"
├── test_e2e_duckdb.py        # class DuckDBE2ETest(BaseE2ETest): db_type = "duckdb"
├── test_e2e_postgresql.py
├── test_e2e_clickhouse.py
├── test_e2e_snowflake.py
└── test_e2e_databricks.py
```

### Fixtures (`conftest.py`)

- **`e2e_config`** (session-scoped): Loads and parses `connections.yaml`. Returns a dict keyed by `db_type`.
- **`client`** (session-scoped): Creates a single in-memory SQLite product DB, injects it via `app.dependency_overrides[get_product_db]`, initializes the schema, and returns a `TestClient(app)`. Shared across all backends in the test run.

### Base Class (`base.py`)

- `BaseE2ETest` declares `db_type: str` (overridden per dialect subclass).
- On collection, if `db_type` not in config or `enabled: false`, all tests in the class are skipped.
- Class attributes accumulate state across steps: `cls.connection_id`, `cls.detected_schema`.
- Each test method checks that required prior state exists (e.g. `cls.connection_id`) and calls `pytest.skip()` if missing, preventing cascading failures from appearing as errors.

### Dialect Files

Minimal — just declare `db_type`:

```python
from .base import BaseE2ETest

class SQLiteE2ETest(BaseE2ETest):
    db_type = "sqlite"
```

---

## The 11 Steps

| # | Method | Action | Key Assertion |
|---|--------|--------|---------------|
| 01 | `test_01_create_connection` | `POST /api/connections/` with credentials from yaml | HTTP 201; stores `cls.connection_id` |
| 02 | `test_02_test_connection_bad_creds` | `POST /api/connections/{id}/test` after patching creds with bad values | Response body indicates failure |
| 03 | `test_03_test_connection_good` | `POST /api/connections/{id}/test` with real creds | HTTP 200, success |
| 04 | `test_04_schema_empty` | `GET /api/connections/{id}/schema` | Returns `null` — no schema configured yet |
| 05 | `test_05_detect_schema` | `GET /api/connections/{id}/schema/detect` | HTTP 200; stores `cls.detected_schema` |
| 06 | `test_06_schema_has_city_country` | Assert on `cls.detected_schema` | `city` and `country` present in columns or `proposed_custom_properties` |
| 07 | `test_07_save_schema` | `PUT /api/connections/{id}/schema` with suggestions from detected schema | HTTP 200 |
| 08 | `test_08_add_global_filters` | `PUT /api/connections/{id}/filters` with `city` and `country` filter fields | HTTP 200 |
| 09 | `test_09_queries_with_dates` | All analytics endpoints with `start_date` / `end_date` params | All HTTP 200; all return non-empty results |
| 10 | `test_10_queries_all_time` | Same analytics endpoints without date params | All HTTP 200; all return non-empty results |
| 11 | `test_11_cleanup` | `DELETE /api/connections/{id}` | HTTP 204 |

### Analytics Endpoints Covered in Steps 09 and 10

- `GET /api/events`
- `GET /api/events/top`
- `GET /api/trend`
- `GET /api/retention`
- `GET /api/conversion`
- `GET /api/paths`
- `GET /api/pivot`
- `GET /api/sessions/summary`
- `GET /api/raw/events`
- `GET /api/raw/sessions`

---

## Wrong Credentials Strategy (Step 02)

Bad credentials are derived automatically from the valid credentials — no extra config required:

| Backend type | Strategy |
|---|---|
| `sqlite`, `duckdb` | Replace `file_path` with `/nonexistent/path/test.db` |
| `postgresql`, `clickhouse` | Append `_wrong` to the `password` field |
| `snowflake` | Append `_wrong` to the `password` field |
| `databricks` | Append `_wrong` to the `token` field |

The test creates a second temporary connection with bad credentials, calls `/test`, asserts the response indicates failure, then deletes it.

---

## Product DB Lifecycle

A single in-memory SQLite product DB (`:memory:`) is shared across all backends in the session. It is initialized once via `init_product_db()` in the session-scoped `client` fixture. Each backend's connection is created in step 01 and deleted in step 11, keeping the shared DB clean.

---

## Test Data Assumption

Test databases are pre-populated with analytics event data that includes `city` and `country` fields. Data must span a date range suitable for the date-bounded queries in step 09.

---

## Skip Behavior

- Backend skipped entirely if `enabled: false` in config.
- Individual steps skipped (not failed) if a required prior step did not store its state (e.g. `cls.connection_id is None`).
- This ensures a failure in step 01 shows as one failure, not eleven.
