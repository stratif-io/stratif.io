# E2E Test Refactor — Design Spec

**Date:** 2026-03-25
**Status:** Approved

---

## Goal

Refactor backend E2E tests so they are fully self-bootstrapping from raw credentials. Instead of requiring a pre-seeded product DB with a known connection ID, tests receive database credentials from a committed config file and execute a full lifecycle: create product DB → create connection → validate → detect schema → configure → run all analytics queries.

---

## Config File

**Path:** `backend/tests/e2e/connections.yaml` (committed to the repo)

One entry per backend. `enabled: false` backends are skipped. Each enabled backend has `credentials` (backend-specific fields) and `expected_columns` (columns that must appear after schema detection). Disabled backends have empty string credentials to avoid committing placeholder passwords.

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

When enabling a backend, fill in its `credentials` block. Supported credential fields per backend:

| Backend | Credentials |
|---|---|
| `sqlite` | `file_path` |
| `duckdb` | `file_path` |
| `postgresql` | `host`, `port`, `database`, `user`, `password`, `sslmode` |
| `clickhouse` | `host`, `port`, `database`, `user`, `password` |
| `snowflake` | `account`, `user`, `password`, `warehouse`, `database`, `schema`, `role` |
| `databricks` | `host`, `token`, `path` |

---

## Test Data Requirement

Each enabled backend must point at a database pre-populated with analytics event data that:

- Contains columns `city` and `country` (directly or as JSON properties)
- Has events spanning at least 60 days
- Has enough events (>0) that all analytics endpoints return results within a 60-day window

---

## Architecture

```
backend/tests/e2e/
├── connections.yaml          # committed config — credentials per backend
├── conftest.py               # session-scoped client fixture + module-level config
├── base.py                   # BaseE2ETest — 11 ordered test methods
├── test_e2e_sqlite.py        # class SQLiteE2ETest(BaseE2ETest): db_type = "sqlite"
├── test_e2e_duckdb.py        # class DuckDBE2ETest(BaseE2ETest): db_type = "duckdb"
├── test_e2e_postgresql.py
├── test_e2e_clickhouse.py
├── test_e2e_snowflake.py
└── test_e2e_databricks.py
```

---

## Fixtures and Config Access (`conftest.py`)

### Module-level config

`connections.yaml` is parsed **at module import time** (not as a pytest fixture) so it is available to `BaseE2ETest.setup_class` without requiring fixture injection:

```python
import yaml, pathlib

_CONFIG_PATH = pathlib.Path(__file__).parent / "connections.yaml"
E2E_CONFIG: dict = yaml.safe_load(_CONFIG_PATH.read_text())["backends"]
```

`BaseE2ETest` imports `E2E_CONFIG` directly from `conftest`.

### `client` fixture (session-scoped, yield)

```python
@pytest.fixture(scope="session")
def client(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("product_db") / "product.db"

    # Set path before cache_clear so all callers (Depends and direct)
    # open the same file. settings.product_db_path is read at call time.
    settings.product_db_path = str(db_path)
    get_product_db.cache_clear()
    init_product_db()

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    get_product_db.cache_clear()  # prevent stale ref after session
```

**Why named temp file (not `:memory:`):** `SQLiteProductDB` opens a new `sqlite3.connect()` per operation. `:memory:` would create a separate isolated DB on each call. A named file ensures all callers see the same data.

**Shared across all backends:** All dialect classes share the same `client` and product DB. Isolation is by UUID connection ID — each class creates and deletes its own record. Pytest's default collector runs all methods within a class before starting the next, so class-level state is always consumed atomically. This design does not support `pytest-xdist` parallel execution.

---

## Base Class (`base.py`)

### Class variables

```python
class BaseE2ETest:
    db_type: ClassVar[str] = ""
    connection_id: ClassVar[Optional[str]] = None
    detected_schema: ClassVar[Optional[dict]] = None
```

### Backend skip (in `setup_class`)

`setup_class` accesses `E2E_CONFIG` directly (module-level, not a fixture):

```python
@classmethod
def setup_class(cls):
    cfg = E2E_CONFIG.get(cls.db_type, {})
    if not cfg.get("enabled", False):
        pytest.skip(f"backend '{cls.db_type}' not enabled in connections.yaml")
    cls.connection_id = None
    cls.detected_schema = None
```

Resetting class vars here ensures a clean state even if the class is re-imported.

### Step skip guards

At the top of each step (02–11):

```python
if not cls.connection_id:
    pytest.skip("connection_id not set — test_01 did not complete")
```

Steps 06–11 additionally guard on `cls.detected_schema` where required.

### Dialect files

```python
from .base import BaseE2ETest

class SQLiteE2ETest(BaseE2ETest):
    db_type = "sqlite"
```

Credentials are read inside `BaseE2ETest` from `E2E_CONFIG[self.db_type]["credentials"]`.

### Test execution order

Methods are named `test_01_` through `test_11_` (zero-padded). Pytest's default alphabetical ordering within a class is stable for this scheme. No plugin required.

---

## The 11 Steps

| # | Method | Action | Key Assertion |
|---|--------|--------|---------------|
| 01 | `test_01_create_connection` | `POST /api/connections/` with credentials from yaml | HTTP 201; stores `cls.connection_id` |
| 02 | `test_02_test_connection_bad_creds` | Create throwaway connection with bad creds (local var ID), `POST test`, assert failure, DELETE throwaway | Response body indicates failure |
| 03 | `test_03_test_connection_good` | `POST /api/connections/{id}/test` on good connection | HTTP 200; success indicator in body |
| 04 | `test_04_schema_empty` | `GET /api/connections/{id}/schema` | HTTP 200; body is JSON `null` |
| 05 | `test_05_detect_schema` | `GET /api/connections/{id}/schema/detect` | HTTP 200; body has keys `columns`, `suggestions`, `proposed_custom_properties`; stores `cls.detected_schema` |
| 06 | `test_06_schema_has_expected_columns` | Assert `expected_columns` from config against `cls.detected_schema` | All expected names appear in `columns[*].name` or `proposed_custom_properties[*].name` |
| 07 | `test_07_save_schema` | `PUT /api/connections/{id}/schema` with `cls.detected_schema["suggestions"]` | HTTP 200 |
| 08 | `test_08_add_global_filters` | `PUT /api/connections/{id}/filters` with `city` and `country` filter fields | HTTP 200 |
| 09 | `test_09_queries_with_dates` | All analytics endpoints with `connection_id`, `start_date=today-60d`, `end_date=today` | All HTTP 200; response matches expected shape per endpoint |
| 10 | `test_10_queries_all_time` | All analytics endpoints with `connection_id` only (no date params) | All HTTP 200; response matches expected shape per endpoint |
| 11 | `test_11_cleanup` | `DELETE /api/connections/{id}` | HTTP 204. Cleanup step — does not gate prior steps. |

### Analytics Endpoints in Steps 09 and 10

| Endpoint | Expected shape |
|---|---|
| `GET /api/events` | JSON array |
| `GET /api/events/top` | JSON array |
| `GET /api/trend` | Object with `data` key (list) |
| `GET /api/retention` | Object with `data` key (list) |
| `GET /api/conversion` | Object with `data` key (list) |
| `GET /api/paths` | Object with `nodes` and `links` keys |
| `GET /api/pivot` | Object with `rows` key (list) |
| `GET /api/sessions/summary` | Object (non-null) |
| `GET /api/raw/events` | Object with `data` key (list) |
| `GET /api/raw/sessions` | Object with `data` key (list) |

Lists may be empty without failing — the assertion is shape validity, not non-empty.

---

## Wrong Credentials Strategy (Step 02)

Throwaway connection ID is stored in a **local variable only** — never in `cls`:

| Backend | Bad credential |
|---|---|
| `sqlite`, `duckdb` | `file_path = "/nonexistent/path/does_not_exist.db"` |
| `postgresql`, `clickhouse` | Append `_wrong` to `password` |
| `snowflake` | Append `_wrong` to `password` |
| `databricks` | Append `_wrong` to `token` |

---

## Product DB Lifecycle

Named temp-file SQLite DB, created once per session. `get_product_db.cache_clear()` called in both setup and teardown. All dialect classes share it; isolation is by UUID connection ID. Temp file cleaned up by pytest at session end.
