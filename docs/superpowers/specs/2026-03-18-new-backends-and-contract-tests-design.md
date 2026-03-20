# New Backends & Contract Test Suite — Design Spec

## Overview

Add Snowflake and ClickHouse database backends, improve Databricks test coverage, and introduce a shared contract test suite that validates all backends against the same correctness criteria. The contract suite uses pytest parametrize so every new backend is automatically included in all tests.

---

## 1. Contract Test Suite

### Structure

```
backend/tests/contract/
├── conftest.py          # session-scoped fixtures, parametrize matrix
├── test_connection.py   # open(), ping, bad-credentials error handling
├── test_schema.py       # list_tables(), detect_fields(), type inference
├── test_dialect.py      # all SQL translation methods (full Protocol coverage)
├── test_queries.py      # full query execution: trends, paths, retention shapes
├── stubs/
│   └── databricks_stub.py  # DBAPI2 stub backed by DuckDB
└── KNOWN_LIMITATIONS.md    # documented gaps in stub-based testing
```

### Parametrize Matrix

```python
@pytest.fixture(params=["duckdb", "sqlite", "postgresql", "clickhouse", "snowflake", "databricks"])
def backend(request, all_backend_fixtures):
    return all_backend_fixtures[request.param]
```

Every test function receives `backend`. Adding a new backend means adding its name to `params` and providing a fixture — nothing else changes.

Docker-backed fixtures (PostgreSQL, ClickHouse) use `pytest.mark.skipif` to skip gracefully when Docker is unavailable, so developers without Docker can still run in-process backend tests.

### Test Categories

- **test_connection.py** — backend opens successfully, raises a typed error on bad credentials
- **test_schema.py** — `list_tables()` returns at least one table, `detect_fields()` returns expected column names and types
- **test_dialect.py** — all 13 dialect methods defined in the `DatabaseBackend` Protocol produce SQL that executes without error and returns the expected shape:
  - `date_trunc`, `date_diff_days`, `epoch_diff_seconds`, `interval_minutes_exceeded`
  - `string_concat`, `cast_to_text`, `json_extract_string`
  - `extract_hour`, `extract_day_of_week`, `extract_year`, `extract_month`, `extract_week`, `extract_quarter`
- **test_queries.py** — trends, funnel, retention, and paths query shapes execute end-to-end against a seeded test table

---

## 2. Test Infrastructure

### Fixture Strategy

| Backend | Strategy | Library | Scope |
|---|---|---|---|
| DuckDB | In-process `:memory:` | built-in | session |
| SQLite | In-process `:memory:` | built-in | session |
| PostgreSQL | Docker container | `testcontainers` | session |
| ClickHouse | Docker container | `testcontainers` | session |
| Snowflake | Patch `snowflake.connector` | `fakesnow` | session |
| Databricks | Patch `databricks.sql.connect` with DuckDB stub | custom | session |

All fixtures are session-scoped — one container per test run, not per test — to keep CI fast.

### Databricks Stub

```
backend/tests/contract/stubs/databricks_stub.py
```

Implements the DBAPI2 interface (`connect`, `cursor`, `execute`, `fetchall`, `description`) backed by DuckDB `:memory:`. Validates connection flow and credential parsing without a real workspace.

**Known limitations** (documented in `KNOWN_LIMITATIONS.md`):
- DuckDB does not validate Databricks-specific SQL (`SHOW CATALOGS`, `DESCRIBE TABLE EXTENDED`, backtick identifiers)
- Databricks `MAP`, `STRUCT`, and `ARRAY` types map to DuckDB equivalents — type inference tests may differ
- `interval_minutes_exceeded` uses DuckDB interval arithmetic, not Databricks timestamp arithmetic

### CI Configuration

- **Standard CI** (`test.yml`) — runs all backends on every PR via testcontainers + fakesnow + stub
- **Live Databricks CI** (`databricks-live.yml`) — optional workflow, runs on demand against a real workspace using repository secrets

---

## 3. Snowflake Backend

### Structure

```
backend/backends/snowflake/
├── __init__.py        # SnowflakeBackend
└── credentials.py     # account, user, password, warehouse, database, schema, role (optional)
```

### Credentials

The `role` field is optional. When provided, it is forwarded as the `role` kwarg to `snowflake.connector.connect()`. Omitting it uses the user's default role.

### Dialect Translations

All 13 Protocol methods:

| Method | Snowflake SQL |
|---|---|
| `date_trunc(unit, col)` | `DATE_TRUNC(unit, col)` |
| `date_diff_days(a, b)` | `DATEDIFF('day', a, b)` |
| `epoch_diff_seconds(a, b)` | `DATEDIFF('second', a, b)` |
| `interval_minutes_exceeded(a, b, n)` | `DATEDIFF('minute', a, b) > n` |
| `string_concat(*parts)` | `" \|\| ".join(parts)` (variadic, matches Protocol) |
| `cast_to_text(col)` | `col::string` |
| `json_extract_string(col, key)` | `col:key::string` (VARIANT syntax) |
| `extract_hour(col)` | `EXTRACT(hour FROM col)` |
| `extract_day_of_week(col)` | `DAYOFWEEK(col)` |
| `extract_year(col)` | `EXTRACT(year FROM col)` |
| `extract_month(col)` | `EXTRACT(month FROM col)` |
| `extract_week(col)` | `EXTRACT(week FROM col)` |
| `extract_quarter(col)` | `EXTRACT(quarter FROM col)` |

### Connection

- `use_pool = True` — Snowflake connections take ~2-3s to open
- Pool key follows existing pattern: `(connection_id, "snowflake")`
- Dependency: `snowflake-connector-python`

---

## 4. ClickHouse Backend

### Structure

```
backend/backends/clickhouse/
├── __init__.py        # ClickHouseBackend
└── credentials.py     # host, port, database, user, password, secure (bool), always_final (bool, default False)
```

### Dialect Translations

All 13 Protocol methods. `date_trunc` uses a full unit dispatch map:

| `date_trunc` unit | ClickHouse SQL |
|---|---|
| `hour` | `toStartOfHour(col)` |
| `day` | `toStartOfDay(col)` |
| `week` | `toStartOfWeek(col)` |
| `month` | `toStartOfMonth(col)` |
| `quarter` | `toStartOfQuarter(col)` |
| `year` | `toStartOfYear(col)` |

Remaining methods:

| Method | ClickHouse SQL |
|---|---|
| `date_diff_days(a, b)` | `dateDiff('day', a, b)` |
| `epoch_diff_seconds(a, b)` | `dateDiff('second', a, b)` |
| `interval_minutes_exceeded(a, b, n)` | `dateDiff('minute', a, b) > n` |
| `string_concat(*parts)` | `concat(part1, part2, ...)` (variadic, ClickHouse `concat` accepts N args) |
| `cast_to_text(col)` | `toString(col)` |
| `json_extract_string(col, key)` | `JSONExtractString(col, 'key')` |
| `extract_hour(col)` | `toHour(col)` |
| `extract_day_of_week(col)` | `toDayOfWeek(col)` |
| `extract_year(col)` | `toYear(col)` |
| `extract_month(col)` | `toMonth(col)` |
| `extract_week(col)` | `toWeek(col)` |
| `extract_quarter(col)` | `toQuarter(col)` |

### ReplacingMergeTree / FINAL Handling

ClickHouse `ReplacingMergeTree` tables can contain duplicate rows until background merges complete. The backend supports an opt-in `always_final` credentials flag (default `False`). When `True`, the backend rewrites `SELECT ... FROM <table>` to `SELECT ... FROM <table> FINAL` using a targeted regex on the FROM clause before execution.

Unconditional `FINAL` has a performance cost; users opt in explicitly per connection.

### Connection

- `use_pool = True`
- Pool key follows existing pattern: `(connection_id, "clickhouse")`
- Dependency: `clickhouse-connect` (official client, preferred over legacy `clickhouse-driver`)

---

## 5. Databricks (Existing Backend — Test Coverage Only)

The existing Databricks backend implementation is unchanged. The new stub fixture provides test coverage for:

- Credential parsing and connection open flow
- Query execution and result shape
- Dialect method correctness (validated against DuckDB as stand-in)

Known limitations are tracked in `backend/tests/contract/KNOWN_LIMITATIONS.md`.

---

## 6. Dependencies

Add to `pyproject.toml`:

```toml
[project.optional-dependencies]
snowflake = ["snowflake-connector-python"]
clickhouse = ["clickhouse-connect"]
test = ["testcontainers[clickhouse,postgresql]>=4.8", "fakesnow", "pytest"]
```

Snowflake and ClickHouse drivers are optional extras — users only install what they need.

---

## File Checklist

- `backend/backends/snowflake/__init__.py`
- `backend/backends/snowflake/credentials.py`
- `backend/backends/clickhouse/__init__.py`
- `backend/backends/clickhouse/credentials.py`
- `backend/backends/__init__.py` — register new backends in registry:
  ```python
  from backend.backends.snowflake import SnowflakeBackend  # noqa: E402
  _register("snowflake", SnowflakeBackend())

  from backend.backends.clickhouse import ClickHouseBackend  # noqa: E402
  _register("clickhouse", ClickHouseBackend())
  ```
  The string keys `"snowflake"` and `"clickhouse"` must match the `params` list in `conftest.py` and any `db_type` values passed via the API.
- `backend/tests/contract/conftest.py`
- `backend/tests/contract/test_connection.py`
- `backend/tests/contract/test_schema.py`
- `backend/tests/contract/test_dialect.py`
- `backend/tests/contract/test_queries.py`
- `backend/tests/contract/stubs/databricks_stub.py`
- `backend/tests/contract/KNOWN_LIMITATIONS.md`
- `.github/workflows/databricks-live.yml`
- `pyproject.toml` — new optional dependencies
