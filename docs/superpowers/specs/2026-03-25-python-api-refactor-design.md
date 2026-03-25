# Python API Refactor — Design Spec
**Date:** 2026-03-25
**Status:** Approved

## Overview

Four sequential workstreams to improve the quality, testability, and SaaS-readiness of the `backend/` Python API:

1. Aggressive dead code removal
2. Architecture review + FastAPI DI/middleware refactor
3. TDD fixes for connector backends
4. Real-world connection integration testing guide

---

## 1. Dead Code Removal

**Scope:** Aggressive — remove obvious dead code, unused code, and flag ambiguous cases for human review before deletion.

**Confirmed dead code:**

| Item | Location | Action |
|---|---|---|
| `_EVENTS_REF_RE` | `services/analytics_db.py:17` | Delete — defined but never referenced |
| `create_analytics_app()` | `main.py:121–133` | Delete — never imported or called |
| `verify_api_key` | `core/auth.py` | Replace with `get_current_user` (see §2) |
| `_to_named_params` duplicate | `backends/databricks/__init__.py` | Delete — consolidate into `backends/_utils.py`; the copy in `analytics_db.py` is live |

**Refactor targets (not dead, but need cleanup):**

| Item | Location | Action |
|---|---|---|
| `_resolve_path_to_sql` | `services/analytics_db.py` | Live — used in 2 places. Refactor target post-DI: fold into `backend.json_extract_string()` once all backends correctly implement it |

**Process:** Run `ruff check --select F` for unused imports. Grep for each function name. For anything ambiguous beyond the above, flag with `# DEAD CODE CANDIDATE` comment and present to user before deleting.

---

## 2. Architecture Refactor — FastAPI DI + Middleware

### Principles

The backend is the analytics core of a potential SaaS product. Replaceable infrastructure (product DB, logger, auth) must be injectable, not hardcoded. This enables:
- Swap SQLite → PostgreSQL/MySQL product DB by env var
- Plug in SaaS JWT auth without touching router code
- Structured logging contextual per-request without invasive changes
- Backend registry injectable for testing with fake backends

### Current Problems

| Component | Current State | Problem |
|---|---|---|
| `ProductDatabase` | Global singleton, SQLite hardcoded | Can't swap to another DB without code change |
| Auth | `verify_api_key` defined but wired to **no** router | Auth is dead code in practice |
| Logger | `structlog.get_logger(__name__)` per-module | Can't bind request context without middleware |
| `open_analytics_db` | Imports `get_product_db()` directly inside the function | Tight coupling, hard to test |
| Backend registry | `get_backend(db_type)` called imperatively | Can't swap backends in tests without monkey-patching |

### ProductDB — Abstract Interface + Injectable

Define a `ProductDB` Protocol:

```python
# backend/product_db/base.py
from typing import Protocol, Any

class ProductDB(Protocol):
    def fetchall(self, query: str, params: tuple = ()) -> list[Any]: ...
    def fetchone(self, query: str, params: tuple = ()) -> Any | None: ...
    def execute(self, query: str, params: tuple = ()) -> Any: ...
    def executescript(self, script: str) -> None: ...
```

**Important:** callers like `open_analytics_db` use dict-like row access (`row["id"]`, `row["db_type"]`). `SQLiteProductDB` satisfies this via `sqlite3.Row`. Any future `PostgresProductDB` must use `RealDictCursor` (psycopg2) or `dict_row` factory (psycopg3) to maintain this contract — this is an implicit Protocol requirement.

```python
# backend/product_db/deps.py
from functools import lru_cache
from typing import Annotated
from fastapi import Depends

@lru_cache
def get_product_db() -> ProductDB:
    url = settings.product_db_url  # new config key, see Config Changes
    if not url or url.startswith("sqlite"):
        return SQLiteProductDB(settings.product_db_path)
    raise ValueError(f"Unsupported product DB URL: {url}")

ProductDBDep = Annotated[ProductDB, Depends(get_product_db)]
```

**Test isolation:** The `@lru_cache` means the singleton is cached process-wide. Tests must NOT call `get_product_db()` directly. Instead, override via FastAPI's dependency system:

```python
app.dependency_overrides[get_product_db] = lambda: FakeProductDB()
```

The existing `_reset_product_db()` in `product_db/database.py` is removed; tests use `dependency_overrides` exclusively.

Routers and services receive `ProductDBDep` via function parameter, never call `get_product_db()` directly.

### `open_analytics_db` Refactor

`open_analytics_db` currently calls `get_product_db()` inside the function body. After refactor, it becomes a plain function that accepts `product_db: ProductDB` and `registry: dict[str, DatabaseBackend]` as explicit parameters.

The FastAPI dependency `get_analytics_db` in `services/connection_executor.py` is the **only** caller that wires these injected dependencies through. This keeps the two-file split:
- `analytics_db.py` — pure logic, no FastAPI imports, fully testable
- `connection_executor.py` — FastAPI dependency that calls `open_analytics_db` with injected deps

### Auth

`verify_api_key` is deleted. Replaced by `get_current_user`:

```python
# backend/core/auth.py
from fastapi import Request
from backend.product_db.deps import ProductDBDep

async def get_current_user(
    request: Request,
    product_db: ProductDBDep,  # unused in OSS path; available for SaaS JWT lookup via dependency_overrides
) -> None:
    """OSS: verify API key header. SaaS override: verify JWT via dependency_overrides."""
    if not settings.auth_enabled:
        return
    api_key = request.headers.get("X-API-Key", "")
    if api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
```

`STRATIFIO_AUTH_ENABLED` (new bool, default `False`) replaces the implicit "skip if `api_key` is empty" logic. `STRATIFIO_API_KEY` is retained as the credential to validate against when auth is enabled. Having both makes the intent explicit for operators. Auth is applied at router level — not per-endpoint — so it's enforced uniformly and replaceable by a SaaS JWT override via `dependency_overrides`.

### Logger

`structlog` already supports contextvars. We add a `RequestIdMiddleware` that binds `request_id` (a UUID) into the structlog context per request. **`user_id` is NOT bound here** — auth has not run when middleware executes.

`user_id` is bound inside `get_current_user` after the user is authenticated:

```python
structlog.contextvars.bind_contextvars(user_id=user.id)
```

This is the correct sequencing: Middleware → RequestId only; Dependency → user context.

### Backend Registry

```python
# backend/backends/deps.py
from typing import Annotated
from fastapi import Depends
from backend.backends.base import DatabaseBackend

def get_backend_registry() -> dict[str, DatabaseBackend]:
    return _REGISTRY  # existing module-level dict

BackendRegistryDep = Annotated[dict[str, DatabaseBackend], Depends(get_backend_registry)]
```

### Middleware Stack

Runtime execution order (request flows inward, response flows outward):

1. `CORSMiddleware` — **must be outermost** so preflight `OPTIONS` requests get CORS headers before any other middleware can reject them
2. `RequestIdMiddleware` (new) — binds `request_id` UUID into structlog contextvars
3. `APITrailingSlashMiddleware`

**CRITICAL — `add_middleware()` call order:** Starlette wraps in reverse order — the last `add_middleware()` call becomes the outermost middleware (first to run on request). Therefore the `main.py` registration must be:

```python
app.add_middleware(APITrailingSlashMiddleware)  # added first → innermost → runs last
app.add_middleware(RequestIdMiddleware)          # added second → middle
app.add_middleware(CORSMiddleware, ...)          # added last → outermost → runs first
```

This matches the existing `main.py` pattern where `CORSMiddleware` is already added last.

### Config Changes

Add to `backend/config.py`:
- `STRATIFIO_PRODUCT_DB_URL` — connection URL for product DB (defaults to `""`, meaning SQLite at `product_db_path`)
- `STRATIFIO_AUTH_ENABLED` — bool, defaults to `False`; when `True`, enforces API key check

---

## 3. TDD Connector Fixes

**Approach:** For each backend, run existing tests, identify failures, write a minimal failing test (red), fix the implementation (green).

**Priority order:** PostgreSQL → ClickHouse → SQLite → Snowflake → Databricks (DuckDB has full coverage and serves as the reference implementation).

**Note on PostgreSQL:** `backend/backends/postgresql/` contains only `__init__.py` and `credentials.py`. Verify whether the backend class lives inside `__init__.py` (likely) or is missing and needs creating.

**Two test layers — target the right one:**

| Fix type | Target layer |
|---|---|
| SQL generation (wrong fragment output) | Per-backend unit test in `test_backends_*.py` — no connection needed |
| Schema detection (wrong `information_schema` shape) | Contract test in `tests/contract/` with a real or stub connection |

**Known risk areas per backend:**

| Method | Risk |
|---|---|
| `build_events_cte` | DuckDB uses `EXCLUDE` — other backends must enumerate excluded columns explicitly |
| `date_diff_days` | Each dialect has different function name/syntax |
| `json_extract_string` | ClickHouse `JSONExtractString`, PostgreSQL `->>`, Databricks backtick paths all differ |
| `detect_schema` | ClickHouse doesn't use standard `information_schema.tables` |
| `interval_minutes_exceeded` | Snowflake/Databricks interval literal syntax differs |
| `_to_named_params` duplicate | Databricks local copy — consolidate into `_utils.py` |

---

## 4. Real-World Integration Testing

**File:** `docs/testing-real-connections.md`

**Approach:** `pytest` marker `@pytest.mark.integration` — skipped by default, activated when the relevant env vars are present.

**Register the marker** in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
markers = [
    "integration: marks tests that require a real external database connection (deselect with '-m not integration')",
]
```

```bash
# Run all integration tests
pytest -m integration

# Run for a specific backend
pytest -m integration -k postgres
```

**Per-backend env vars:**

| Backend | Env vars | Notes |
|---|---|---|
| PostgreSQL | `TEST_POSTGRES_URL` | e.g. `postgresql://user:pass@host/db` |
| ClickHouse | `TEST_CLICKHOUSE_URL` | e.g. `clickhouse://user:pass@host/db` |
| Snowflake | `TEST_SNOWFLAKE_ACCOUNT`, `TEST_SNOWFLAKE_USER`, `TEST_SNOWFLAKE_PASSWORD`, `TEST_SNOWFLAKE_DATABASE` | |
| Databricks | `TEST_DATABRICKS_HOST`, `TEST_DATABRICKS_TOKEN`, `TEST_DATABRICKS_HTTP_PATH` | |
| SQLite | `TEST_SQLITE_PATH` | Must be a real file path; `:memory:` is excluded — that belongs in unit tests |

**Each integration test:** connect with real credentials, run `get_tables()`, run `execute("SELECT 1", None)`, assert result. This proves the full stack (credentials parsing, connection open, query execution) works against a real database.

**CI:** Not automated. Run manually when you have credentials.

---

## Deliverables

| Deliverable | Location | Description |
|---|---|---|
| Cleaned codebase | `backend/` (in-place) | Dead code removed per §1 |
| Architecture doc | `docs/architecture.md` | Layer map, backend Protocol guide, connection lifecycle, SQL pipeline, auth model |
| DI/middleware refactor | `backend/product_db/`, `backend/core/`, `backend/backends/`, routers | Per §2 |
| Passing connector tests | `backend/tests/test_backends_*.py` | TDD fixes per §3 |
| Integration testing guide | `docs/testing-real-connections.md` | Per §4 |
| Integration test fixtures | `backend/tests/integration/` | Per §4 |
