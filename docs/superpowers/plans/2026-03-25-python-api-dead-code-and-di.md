# Python API — Dead Code Removal + DI/Middleware Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove confirmed dead code and refactor the backend to use FastAPI `Depends()` for injectable infrastructure (product DB, auth, logger context, backend registry) so the analytics core is ready to embed in a SaaS product.

**Architecture:** Dead code is removed first to reduce noise. Then `ProductDatabase` is abstracted behind a `ProductDB` Protocol and injected via `Depends()`. Auth is wired to all analytics routers via `get_current_user`. `RequestIdMiddleware` provides per-request structlog context. All of this is tested by overriding dependencies in FastAPI's test client.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, structlog, pytest, `app.dependency_overrides`

**Spec:** `docs/superpowers/specs/2026-03-25-python-api-refactor-design.md`

---

## File Map

**New files:**
- `backend/product_db/base.py` — `ProductDB` Protocol
- `backend/product_db/deps.py` — `get_product_db()` factory + `ProductDBDep` type alias
- `backend/core/middleware.py` — `RequestIdMiddleware`

**Modified files:**
- `backend/config.py` — add `product_db_url`, `auth_enabled`
- `backend/product_db/__init__.py` — export `ProductDB`, `ProductDBDep`
- `backend/product_db/database.py` — remove `_reset_product_db()`; keep `SQLiteProductDB` class
- `backend/core/auth.py` — replace `verify_api_key` with `get_current_user`
- `backend/backends/__init__.py` — expose `get_backend_registry()`
- `backend/backends/deps.py` (new) — `BackendRegistryDep`
- `backend/services/analytics_db.py` — remove `_EVENTS_REF_RE`; `open_analytics_db` takes explicit params
- `backend/services/connection_executor.py` — inject `ProductDBDep` and `BackendRegistryDep` into `get_analytics_db`
- `backend/main.py` — add `RequestIdMiddleware`; remove `create_analytics_app()`
- All routers that call analytics endpoints — add `Depends(get_current_user)` at router level
- `backend/tests/conftest.py` — update overrides pattern (remove `_reset_product_db` usage)
- `pyproject.toml` — register `integration` pytest marker

---

## Task 1: Remove confirmed dead code

**Files:**
- Modify: `backend/services/analytics_db.py`
- Modify: `backend/main.py`
- Modify: `backend/core/auth.py`
- Modify: `backend/backends/databricks/__init__.py`
- Modify: `backend/backends/postgresql/__init__.py`

- [ ] **Step 1: Delete `_EVENTS_REF_RE` from `analytics_db.py`**

  Open `backend/services/analytics_db.py`. Remove the line:
  ```python
  _EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)
  ```
  Also remove the unused `re` import if it's no longer used elsewhere in the file.

- [ ] **Step 2: Delete `_EVENTS_REF_RE` from `postgresql/__init__.py`**

  Open `backend/backends/postgresql/__init__.py`. Remove:
  ```python
  _EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)
  ```
  Remove the `re` import only if `re` is no longer used (check `prepend_events_cte` — it uses `re.match`, so keep `import re`).

- [ ] **Step 3: Delete `create_analytics_app()` from `main.py`**

  Open `backend/main.py`. Remove the entire `create_analytics_app()` function (roughly 15 lines). It is never imported or called.

- [ ] **Step 4: Consolidate `_to_named_params` — move to `_utils.py`, delete Databricks duplicate**

  First, move the function to `backend/backends/_utils.py` (backends should not import from services):
  - Copy `_to_named_params` from `backend/services/analytics_db.py` into `backend/backends/_utils.py`
  - In `backend/services/analytics_db.py`, replace the function body with an import:
    ```python
    from backend.backends._utils import _to_named_params  # noqa: F401 (re-exported for callers)
    ```
  - Open `backend/backends/databricks/__init__.py`. Find the local `_to_named_params` function. Delete it. Add:
    ```python
    from backend.backends._utils import _to_named_params
    ```
  Run:
  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss && uv run pytest backend/tests/test_backends_databricks.py -v
  ```
  Expected: all tests pass.

- [ ] **Step 5: Run full test suite to verify nothing broke**

  ```bash
  cd /Users/carlo/my_work/stratifio/stratifio-oss && uv run pytest backend/tests/ -v --tb=short
  ```
  Expected: all tests pass (or same failures as before this task — do not introduce new failures).

- [ ] **Step 6: Commit**

  ```bash
  git add backend/services/analytics_db.py backend/main.py backend/core/auth.py backend/backends/databricks/__init__.py backend/backends/postgresql/__init__.py
  git commit -m "refactor: remove dead code (_EVENTS_REF_RE, create_analytics_app, duplicate _to_named_params)"
  ```

---

## Task 2: Add config keys for product DB URL and auth enabled flag

**Files:**
- Modify: `backend/config.py`

- [ ] **Step 1: Write a failing test for the new config fields**

  Open `backend/tests/` — there is no `test_config.py`. Create one:
  ```python
  # backend/tests/test_config.py
  from backend.config import Settings

  def test_product_db_url_defaults_to_empty():
      s = Settings()
      assert s.product_db_url == ""

  def test_auth_enabled_defaults_to_false():
      s = Settings()
      assert s.auth_enabled is False
  ```

  Run:
  ```bash
  uv run pytest backend/tests/test_config.py -v
  ```
  Expected: FAIL — `Settings` has no `product_db_url` or `auth_enabled`.

- [ ] **Step 2: Add fields to `Settings`**

  In `backend/config.py`, add:
  ```python
  product_db_url: str = ""   # e.g. "sqlite:///./stratifio.sqlite" or "postgresql://..."
  auth_enabled: bool = False  # set True in production to enforce API key check
  ```

- [ ] **Step 3: Run test to verify it passes**

  ```bash
  uv run pytest backend/tests/test_config.py -v
  ```
  Expected: PASS.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/config.py backend/tests/test_config.py
  git commit -m "feat: add product_db_url and auth_enabled config settings"
  ```

---

## Task 3: Define ProductDB Protocol and move SQLite implementation

**Files:**
- Create: `backend/product_db/base.py`
- Modify: `backend/product_db/database.py`
- Modify: `backend/product_db/__init__.py`

- [ ] **Step 1: Write a failing test for the Protocol**

  Create `backend/tests/test_product_db.py`:
  ```python
  from backend.product_db.base import ProductDB
  from backend.product_db.database import SQLiteProductDB
  import tempfile, os

  def test_sqlite_satisfies_protocol():
      with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as f:
          path = f.name
      try:
          db = SQLiteProductDB(path)
          assert isinstance(db, ProductDB)
      finally:
          os.unlink(path)

  def test_protocol_has_required_methods():
      # Protocol methods exist
      assert hasattr(ProductDB, 'fetchall')
      assert hasattr(ProductDB, 'fetchone')
      assert hasattr(ProductDB, 'execute')
      assert hasattr(ProductDB, 'executescript')
  ```

  Run:
  ```bash
  uv run pytest backend/tests/test_product_db.py -v
  ```
  Expected: FAIL — `ProductDB` protocol doesn't exist yet.

- [ ] **Step 2: Create `backend/product_db/base.py`**

  ```python
  """ProductDB Protocol — the interface all product database implementations must satisfy."""
  from __future__ import annotations
  from typing import Any, Protocol, runtime_checkable


  @runtime_checkable
  class ProductDB(Protocol):
      """Interface for the product database (stores connections, configs, users).

      All implementations must return dict-like rows from fetchall/fetchone
      (e.g. sqlite3.Row, psycopg2 RealDictCursor, psycopg3 dict_row) so callers
      can use row["column_name"] access.
      """

      def fetchall(self, query: str, params: tuple = ()) -> list[Any]: ...
      def fetchone(self, query: str, params: tuple = ()) -> Any | None: ...
      def execute(self, query: str, params: tuple = ()) -> Any: ...
      def executescript(self, script: str) -> None: ...
  ```

- [ ] **Step 3: Rename `ProductDatabase` → `SQLiteProductDB` in `database.py`**

  In `backend/product_db/database.py`:
  - Rename class `ProductDatabase` → `SQLiteProductDB`
  - Remove the global singleton `_product_db` and both `get_product_db()` and `_reset_product_db()` functions (they move to `deps.py` in Task 4)
  - Update `__init__` to accept `db_path: str` as a parameter instead of reading from `settings`

  ```python
  class SQLiteProductDB:
      def __init__(self, db_path: str):
          self.db_path = db_path
      # rest of implementation unchanged
  ```

- [ ] **Step 4: Update `__init__.py`**

  `backend/product_db/__init__.py`:
  ```python
  from .base import ProductDB
  from .database import SQLiteProductDB
  from .migrations import init_product_db

  __all__ = ["ProductDB", "SQLiteProductDB", "init_product_db"]
  ```

- [ ] **Step 5: Run tests**

  ```bash
  uv run pytest backend/tests/test_product_db.py -v
  ```
  Expected: PASS.

- [ ] **Step 6: Run full suite to catch breakage**

  ```bash
  uv run pytest backend/tests/ -v --tb=short
  ```
  Fix any import errors (callers importing old `ProductDatabase` or `get_product_db` from `product_db.database`).

- [ ] **Step 7: Commit**

  ```bash
  git add backend/product_db/
  git commit -m "refactor: define ProductDB Protocol, rename ProductDatabase → SQLiteProductDB"
  ```

---

## Task 4: Create `get_product_db` factory + `ProductDBDep` injection

**Files:**
- Create: `backend/product_db/deps.py`
- Modify: `backend/product_db/__init__.py`

- [ ] **Step 1: Write a failing test**

  Add to `backend/tests/test_product_db.py`:
  ```python
  from backend.product_db.deps import get_product_db

  def test_get_product_db_returns_sqlite_by_default(monkeypatch, tmp_path):
      from backend import config
      monkeypatch.setattr(config.settings, "product_db_url", "")
      monkeypatch.setattr(config.settings, "product_db_path", str(tmp_path / "test.sqlite"))
      get_product_db.cache_clear()
      db = get_product_db()
      from backend.product_db.database import SQLiteProductDB
      assert isinstance(db, SQLiteProductDB)
      get_product_db.cache_clear()
  ```

  Run:
  ```bash
  uv run pytest backend/tests/test_product_db.py::test_get_product_db_returns_sqlite_by_default -v
  ```
  Expected: FAIL.

- [ ] **Step 2: Create `backend/product_db/deps.py`**

  ```python
  """FastAPI dependency for the product database."""
  from __future__ import annotations

  from functools import lru_cache
  from typing import Annotated

  from fastapi import Depends

  from backend.config import settings
  from backend.product_db.base import ProductDB


  @lru_cache
  def get_product_db() -> ProductDB:
      """Return the configured product DB implementation.

      Uses @lru_cache so a single instance is shared per process.
      In tests, override via: app.dependency_overrides[get_product_db] = lambda: FakeProductDB()
      Never call get_product_db() directly in tests.
      """
      from backend.product_db.database import SQLiteProductDB
      if not settings.product_db_url or settings.product_db_url.startswith("sqlite"):
          return SQLiteProductDB(settings.product_db_path)
      raise ValueError(f"Unsupported product_db_url: {settings.product_db_url!r}")


  ProductDBDep = Annotated[ProductDB, Depends(get_product_db)]
  ```

- [ ] **Step 3: Update `__init__.py` to export `ProductDBDep`**

  ```python
  from .base import ProductDB
  from .database import SQLiteProductDB
  from .deps import get_product_db, ProductDBDep
  from .migrations import init_product_db

  __all__ = ["ProductDB", "SQLiteProductDB", "get_product_db", "ProductDBDep", "init_product_db"]
  ```

- [ ] **Step 4: Run tests**

  ```bash
  uv run pytest backend/tests/test_product_db.py -v
  ```
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/product_db/deps.py backend/product_db/__init__.py
  git commit -m "feat: add get_product_db factory and ProductDBDep FastAPI dependency"
  ```

---

## Task 5: Inject ProductDBDep into `get_analytics_db`

**Files:**
- Modify: `backend/services/analytics_db.py`
- Modify: `backend/services/connection_executor.py`

- [ ] **Step 1: Write a failing test**

  Add to `backend/tests/test_connection_executor.py` (or create it):
  ```python
  from unittest.mock import MagicMock
  from backend.services.connection_executor import get_analytics_db
  from backend.product_db.base import ProductDB
  import inspect

  def test_get_analytics_db_accepts_product_db_param():
      sig = inspect.signature(get_analytics_db)
      assert "product_db" in sig.parameters
  ```

  Run:
  ```bash
  uv run pytest backend/tests/test_connection_executor.py::test_get_analytics_db_accepts_product_db_param -v
  ```
  Expected: FAIL.

- [ ] **Step 2: Update `open_analytics_db` to accept injected params**

  In `backend/services/analytics_db.py`, change `open_analytics_db` signature from:
  ```python
  def open_analytics_db(connection_id: str) -> AnalyticsDatabase:
  ```
  to:
  ```python
  def open_analytics_db(
      connection_id: str,
      product_db: "ProductDB",
      registry: "dict[str, DatabaseBackend]",
  ) -> AnalyticsDatabase:
  ```

  Remove the two imports inside the function body:
  ```python
  # DELETE these lines:
  from backend.product_db import get_product_db
  # and any usage of get_product_db() — replace with the `product_db` parameter
  ```

  Also remove the `get_backend(db_type)` call and replace with:
  ```python
  if db_type not in registry:
      raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")
  backend = registry[db_type]
  ```

- [ ] **Step 3: Update `connection_executor.py` to wire the dependencies**

  ```python
  """FastAPI dependency for the analytics database."""
  from typing import Annotated

  from fastapi import Depends, HTTPException, Query

  from backend.backends.deps import BackendRegistryDep
  from backend.product_db import ProductDBDep
  from backend.services.analytics_db import AnalyticsDatabase, _to_named_params, open_analytics_db


  async def get_analytics_db(
      product_db: ProductDBDep,
      registry: BackendRegistryDep,
      connection_id: str | None = Query(None, description="Active connection ID"),
  ):
      """FastAPI dependency: yields the analytics DB for the active connection."""
      resolved_id = connection_id
      if not resolved_id:
          row = product_db.fetchone("SELECT id FROM connections ORDER BY created_at ASC LIMIT 1")
          if row:
              resolved_id = row["id"]
      if not resolved_id:
          raise HTTPException(status_code=503, detail="No analytics connection configured.")
      db = open_analytics_db(resolved_id, product_db, registry)
      try:
          yield db
      finally:
          db.close()
  ```

  Note: `BackendRegistryDep` is created in Step 4 of this same task (below).

- [ ] **Step 4: Create `backend/backends/deps.py`** (needed for Step 3)

  ```python
  """FastAPI dependency for the backend registry."""
  from __future__ import annotations

  from typing import Annotated

  from fastapi import Depends

  from backend.backends import _REGISTRY
  from backend.backends.base import DatabaseBackend


  def get_backend_registry() -> dict[str, DatabaseBackend]:
      return _REGISTRY


  BackendRegistryDep = Annotated[dict[str, DatabaseBackend], Depends(get_backend_registry)]
  ```

- [ ] **Step 5: Run tests**

  ```bash
  uv run pytest backend/tests/ -v --tb=short
  ```
  Fix any remaining import errors. The conftest overrides `get_analytics_db` directly, so API tests should still pass.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/services/analytics_db.py backend/services/connection_executor.py backend/backends/deps.py
  git commit -m "refactor: inject ProductDB and BackendRegistry into get_analytics_db via Depends()"
  ```

---

## Task 6: Replace `verify_api_key` with `get_current_user` + wire to routers

**Files:**
- Modify: `backend/core/auth.py`
- Modify: all analytics routers: `backend/api/trend.py`, `retention.py`, `events.py`, `paths.py`, `conversion.py`, `pivot.py`, `sessions.py`
- Modify: `backend/core/__init__.py`

- [ ] **Step 1: Write a failing test**

  Create `backend/tests/test_auth.py`:
  ```python
  import pytest
  from fastapi import FastAPI
  from starlette.testclient import TestClient
  from unittest.mock import patch

  from backend.core.auth import get_current_user
  from backend.product_db.deps import get_product_db


  def _make_app_with_auth():
      from fastapi import Depends
      app = FastAPI()

      @app.get("/protected")
      async def protected(user=Depends(get_current_user)):
          return {"ok": True}

      return app


  def test_auth_disabled_allows_all_requests(monkeypatch):
      from backend import config
      monkeypatch.setattr(config.settings, "auth_enabled", False)
      app = _make_app_with_auth()
      app.dependency_overrides[get_product_db] = lambda: None
      client = TestClient(app)
      resp = client.get("/protected")
      assert resp.status_code == 200


  def test_auth_enabled_rejects_missing_key(monkeypatch):
      from backend import config
      monkeypatch.setattr(config.settings, "auth_enabled", True)
      monkeypatch.setattr(config.settings, "api_key", "secret")
      app = _make_app_with_auth()
      app.dependency_overrides[get_product_db] = lambda: None
      client = TestClient(app)
      resp = client.get("/protected")
      assert resp.status_code == 401


  def test_auth_enabled_accepts_correct_key(monkeypatch):
      from backend import config
      monkeypatch.setattr(config.settings, "auth_enabled", True)
      monkeypatch.setattr(config.settings, "api_key", "secret")
      app = _make_app_with_auth()
      app.dependency_overrides[get_product_db] = lambda: None
      client = TestClient(app)
      resp = client.get("/protected", headers={"X-API-Key": "secret"})
      assert resp.status_code == 200
  ```

  Run:
  ```bash
  uv run pytest backend/tests/test_auth.py -v
  ```
  Expected: FAIL.

- [ ] **Step 2: Rewrite `backend/core/auth.py`**

  ```python
  """Auth dependency for stratif.io Analytics.

  OSS mode: optionally verify API key header.
  SaaS override: replace get_current_user via app.dependency_overrides with a JWT verifier.
  """
  from fastapi import HTTPException, Request, status

  from backend.config import settings
  from backend.product_db import ProductDBDep


  async def get_current_user(
      request: Request,
      product_db: ProductDBDep,  # unused in OSS path; available for SaaS JWT lookup via dependency_overrides
  ) -> None:
      """OSS: verify X-API-Key header when auth_enabled=True. No-op otherwise."""
      if not settings.auth_enabled:
          return
      api_key = request.headers.get("X-API-Key", "")
      if api_key != settings.api_key:
          raise HTTPException(
              status_code=status.HTTP_401_UNAUTHORIZED,
              detail="Invalid API key",
          )
  ```

- [ ] **Step 3: Run auth tests**

  ```bash
  uv run pytest backend/tests/test_auth.py -v
  ```
  Expected: PASS.

- [ ] **Step 4: Wire `get_current_user` to all analytics routers**

  For each file in `backend/api/`: `trend.py`, `retention.py`, `events.py`, `paths.py`, `conversion.py`, `pivot.py`, `sessions.py` — add `dependencies=[Depends(get_current_user)]` at router creation:

  ```python
  # Before:
  router = APIRouter(prefix="/api", tags=["trends"])
  # After:
  from fastapi import APIRouter, Depends
  from backend.core.auth import get_current_user
  router = APIRouter(prefix="/api", tags=["trends"], dependencies=[Depends(get_current_user)])
  ```

  Do NOT add to `connections_router` or `mission_control_router` — those are admin endpoints and their auth should be reviewed separately.

- [ ] **Step 5: Run full test suite**

  ```bash
  uv run pytest backend/tests/ -v --tb=short
  ```
  Since `auth_enabled` defaults to `False`, existing tests should pass without changes.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/core/auth.py backend/api/trend.py backend/api/retention.py backend/api/events.py backend/api/paths.py backend/api/conversion.py backend/api/pivot.py backend/api/sessions.py backend/tests/test_auth.py
  git commit -m "feat: replace verify_api_key with get_current_user, wire auth to analytics routers"
  ```

---

## Task 7: Add `RequestIdMiddleware` for per-request structlog context

**Files:**
- Create: `backend/core/middleware.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Write a failing test**

  Add to `backend/tests/test_auth.py` (or a new `test_middleware.py`):
  ```python
  def test_request_id_header_present_in_response():
      from backend.main import app
      from starlette.testclient import TestClient
      client = TestClient(app)
      resp = client.get("/api/health")
      assert "X-Request-ID" in resp.headers
  ```

  Run:
  ```bash
  uv run pytest backend/tests/test_auth.py::test_request_id_header_present_in_response -v
  ```
  Expected: FAIL.

- [ ] **Step 2: Create `backend/core/middleware.py`**

  ```python
  """Custom Starlette middleware for stratif.io Analytics."""
  from __future__ import annotations

  import uuid

  import structlog
  from starlette.middleware.base import BaseHTTPMiddleware
  from starlette.requests import Request
  from starlette.responses import Response

  log = structlog.get_logger(__name__)


  class RequestIdMiddleware(BaseHTTPMiddleware):
      """Bind a unique request_id to the structlog context for every request.

      Also adds X-Request-ID to the response headers for client-side tracing.
      Note: user_id is NOT bound here — auth has not run yet. It is bound
      inside get_current_user() after authentication.
      """

      async def dispatch(self, request: Request, call_next) -> Response:
          request_id = str(uuid.uuid4())
          structlog.contextvars.clear_contextvars()
          structlog.contextvars.bind_contextvars(request_id=request_id)
          response = await call_next(request)
          response.headers["X-Request-ID"] = request_id
          return response
  ```

- [ ] **Step 3: Register middleware in `main.py`**

  In `backend/main.py`, add the import and `add_middleware` call. The call order matters — last added = outermost = first to run:

  ```python
  from backend.core.middleware import RequestIdMiddleware

  # In main.py after app creation, in this exact order:
  app.add_middleware(APITrailingSlashMiddleware)   # innermost
  app.add_middleware(RequestIdMiddleware)           # middle
  app.add_middleware(CORSMiddleware, ...)           # outermost — must be last so it runs first on requests
  ```

- [ ] **Step 4: Run tests**

  ```bash
  uv run pytest backend/tests/ -v --tb=short
  ```
  Expected: all pass including the new X-Request-ID test.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/core/middleware.py backend/main.py backend/tests/test_auth.py
  git commit -m "feat: add RequestIdMiddleware for per-request structlog context and X-Request-ID header"
  ```

---

## Task 8: Update `migrations.py` to use injected DB + final wiring check

**Files:**
- Modify: `backend/product_db/migrations.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Check `init_product_db` in migrations.py**

  Open `backend/product_db/migrations.py`. It likely calls the old `get_product_db()`. Update it to accept an optional `db` parameter:

  ```python
  def init_product_db(db=None) -> None:
      if db is None:
          from backend.product_db.deps import get_product_db
          db = get_product_db()
      # rest unchanged
  ```

  The lifespan in `main.py` calls `init_product_db()` — this keeps working.

- [ ] **Step 2: Run full test suite**

  ```bash
  uv run pytest backend/tests/ -v --tb=short
  ```
  Expected: all tests pass. Fix any remaining import errors.

- [ ] **Step 3: Run linter**

  ```bash
  uv run ruff check backend/ --select F
  ```
  Expected: zero unused import warnings.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/product_db/migrations.py
  git commit -m "refactor: wire init_product_db to injectable deps, clean up imports"
  ```

---

## Task 9: Final cleanup and integration marker registration

**Files:**
- Modify: `pyproject.toml`

- [ ] **Step 1: Register the `integration` pytest marker**

  In `pyproject.toml`, add:
  ```toml
  [tool.pytest.ini_options]
  markers = [
      "integration: marks tests that require a real external database connection (deselect with '-m not integration')",
  ]
  ```

- [ ] **Step 2: Run full test suite one final time**

  ```bash
  uv run pytest backend/tests/ -v
  ```
  Expected: all tests pass, no warnings about unknown markers.

- [ ] **Step 3: Commit**

  ```bash
  git add pyproject.toml
  git commit -m "chore: register integration pytest marker"
  ```

---

## Task 10: Write `docs/architecture.md`

**Files:**
- Create: `docs/architecture.md`

- [ ] **Step 1: Write the architecture document**

  Create `docs/architecture.md` covering:

  1. **Layer map** — `api/` → `services/` → `backends/` → `product_db/` with one-sentence description of each layer's responsibility and what crosses its boundary
  2. **Backend Protocol** — what `DatabaseBackend` is, how to add a new backend (create `backends/<name>/`, implement all Protocol methods, register in `backends/__init__.py`)
  3. **Connection lifecycle** — credentials encrypted at rest (Fernet via `services/crypto.py`), decrypted on-demand, passed to `backend.open()`, used for query execution, connection pooled if `backend.use_pool` is `True`
  4. **SQL building pipeline** — request params → `sql_builder.py` builds dialect-agnostic SQL fragments → backend dialect methods (`date_trunc`, `json_extract_string`, etc.) produce dialect-specific SQL → `AnalyticsDatabase.execute()` runs it
  5. **Auth model** — `get_current_user` dependency on all analytics routers; `auth_enabled=False` by default for dev; SaaS JWT override via `dependency_overrides`
  6. **DI/injection map** — which dependencies are injectable and how to override them in tests or a SaaS wrapper

- [ ] **Step 2: Commit**

  ```bash
  git add docs/architecture.md
  git commit -m "docs: add architecture.md covering layers, backend Protocol, DI map"
  ```
