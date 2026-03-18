# Architecture Audit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all security, structural, and code quality issues identified in the 2026-03-11 architecture audit.

**Architecture:** Three phased passes — Phase 1 patches the critical security gap (unauthenticated analytics routes) via a FastAPI dependency override; Phase 2 removes structural duplication and schema divergence; Phase 3 improves maintainability (file splits, migrations, tests).

**Tech Stack:** FastAPI, Python 3.12, React 18, TypeScript, SQLite (product DB), DuckDB/PostgreSQL/Databricks (analytics DBs), pytest, Vitest

**Spec:** `docs/superpowers/specs/2026-03-11-architecture-audit-design.md`

---

## Prerequisite: Configure pytest for SaaS

**Files:**
- Modify: `stratifio-saas/pyproject.toml`

- [ ] **Step 1: Add pytest config**

In `stratifio-saas/pyproject.toml`, add after the `[tool.uv.sources]` section:

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

This ensures `from app.main import app` resolves when pytest is run from `stratifio-saas/`.

- [ ] **Step 2: Create `tests/` directory with empty `__init__.py`**

```bash
mkdir -p /Users/carlo/my_work/stratifio-saas/tests
touch /Users/carlo/my_work/stratifio-saas/tests/__init__.py
```

- [ ] **Step 3: Verify pytest can be invoked**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest --collect-only 2>&1 | tail -5
```

Expected: no `ModuleNotFoundError`, just "no tests collected" or similar.

- [ ] **Step 4: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add pyproject.toml tests/__init__.py
git commit -m "chore: configure pytest pythonpath and testpaths for SaaS"
```

---

## Chunk 1: Phase 1 — Security

### Task 1: Gate all analytics routes with JWT auth (dependency override)

**Files:**
- Create: `stratifio-saas/app/core/dependencies.py`
- Modify: `stratifio-saas/app/main.py`

**Context:** The OSS analytics sub-app is mounted at `/` with no auth. FastAPI supports `dependency_overrides` on sub-applications. We override `get_analytics_db` to require a valid JWT session and verify connection ownership.

- [ ] **Step 1: Write failing test**

Create `stratifio-saas/tests/test_analytics_auth.py`:

```python
"""Verify analytics endpoints require authentication."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

ANALYTICS_ROUTES = [
    "/api/trend?connection_id=00000000-0000-0000-0000-000000000000",
    "/api/retention?connection_id=00000000-0000-0000-0000-000000000000",
    "/api/events?connection_id=00000000-0000-0000-0000-000000000000",
    "/api/sessions/summary?connection_id=00000000-0000-0000-0000-000000000000",
    "/api/paths?connection_id=00000000-0000-0000-0000-000000000000",
    "/api/conversion?connection_id=00000000-0000-0000-0000-000000000000",
    "/api/pivot?connection_id=00000000-0000-0000-0000-000000000000",
]

@pytest.mark.parametrize("route", ANALYTICS_ROUTES)
def test_analytics_requires_auth(route):
    response = client.get(route)
    assert response.status_code == 401, f"{route} returned {response.status_code}, expected 401"
```

- [ ] **Step 2: Run test — verify it fails (all routes return 200 or 503, not 401)**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_analytics_auth.py -v
```

Expected: FAIL — routes return something other than 401 (likely 503 "no connection configured").

- [ ] **Step 3: Create `app/core/dependencies.py`**

```python
"""SaaS-specific FastAPI dependencies."""
from fastapi import Depends, HTTPException, Query

from app.core.jwt_auth import AuthUserRow, get_current_auth_user
from backend.product_db import get_product_db
from backend.services.connection_executor import open_analytics_db


async def get_authenticated_analytics_db(
    connection_id: str | None = Query(None, description="Active connection ID"),
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    """Analytics DB dependency that requires JWT auth and verifies connection ownership."""
    product_db = get_product_db()

    resolved_id = connection_id
    if not resolved_id:
        row = product_db.fetchone(
            "SELECT id FROM connections WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
            (current_user.id,),
        )
        if row:
            resolved_id = row["id"]

    if not resolved_id:
        raise HTTPException(status_code=503, detail="No analytics connection configured.")

    # Verify ownership
    row = product_db.fetchone(
        "SELECT id FROM connections WHERE id = ? AND user_id = ?",
        (resolved_id, current_user.id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    db = open_analytics_db(resolved_id)
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 4: Update `app/main.py` to override the dependency**

In `app/main.py`, after creating `analytics_app` and before `app.mount`, add the override:

```python
# At top of file, add import:
from backend.services.connection_executor import get_analytics_db
from app.core.dependencies import get_authenticated_analytics_db

# After creating analytics_app, before app.mount:
analytics_app = create_analytics_router()
analytics_app.dependency_overrides[get_analytics_db] = get_authenticated_analytics_db
app.mount("/", analytics_app)
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_analytics_auth.py -v
```

Expected: PASS — all routes return 401 without a session cookie.

- [ ] **Step 6: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add app/core/dependencies.py app/main.py tests/test_analytics_auth.py
git commit -m "fix(security): gate all analytics routes with JWT auth via dependency override"
```

---

### Task 2: Add missing OSS connection sub-endpoints to SaaS router (with auth)

**Files:**
- Modify: `stratifio-saas/app/api/connections.py`

**Context:** Routes like `POST /api/connections/{id}/test`, `GET /api/connections/{id}/schema/detect`, `GET /api/connections/{id}/browse`, `GET /api/connections/{id}/credentials`, `GET /api/connections/{id}/schema`, `GET /api/connections/{id}/filters`, `GET /api/connections/{id}/filter-options` fall through to the OSS router (inside the mounted analytics app) which has no auth. Adding them to the SaaS router causes FastAPI to match them before the mounted sub-app.

- [ ] **Step 1: Write failing tests**

Add to `stratifio-saas/tests/test_analytics_auth.py`:

```python
CONNECTION_SUB_ROUTES = [
    ("POST", "/api/connections/00000000-0000-0000-0000-000000000000/test"),
    ("GET", "/api/connections/00000000-0000-0000-0000-000000000000/schema/detect"),
    ("GET", "/api/connections/00000000-0000-0000-0000-000000000000/browse"),
    ("GET", "/api/connections/00000000-0000-0000-0000-000000000000/credentials"),
    ("GET", "/api/connections/00000000-0000-0000-0000-000000000000/schema"),
    ("GET", "/api/connections/00000000-0000-0000-0000-000000000000/filters"),
    ("GET", "/api/connections/00000000-0000-0000-0000-000000000000/filter-options"),
]

@pytest.mark.parametrize("method,route", CONNECTION_SUB_ROUTES)
def test_connection_sub_endpoints_require_auth(method, route):
    response = client.request(method, route)
    assert response.status_code == 401, f"{method} {route} returned {response.status_code}, expected 401"
```

- [ ] **Step 2: Run — verify fails**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_analytics_auth.py::test_connection_sub_endpoints_require_auth -v
```

Expected: FAIL — sub-endpoints return something other than 401.

- [ ] **Step 3: Add sub-endpoints to SaaS connections router**

In `stratifio-saas/app/api/connections.py`, add at the bottom:

```python
from backend.api.connections import (
    detect_schema as _oss_detect_schema,
    browse_connection as _oss_browse,
)
from backend.services.connection_executor import open_analytics_db as _open_db
import json as _json


@router.post("/{conn_id}/test")
async def test_connection(
    conn_id: str,
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    _get_connection_or_404(conn_id, current_user.id)
    try:
        db = _open_db(conn_id)
        db.execute("SELECT 1")
        db.close()
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@router.get("/{conn_id}/schema/detect")
def detect_schema(
    conn_id: str,
    events_table: str | None = None,
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    _get_connection_or_404(conn_id, current_user.id)
    return _oss_detect_schema(conn_id, events_table)


@router.get("/{conn_id}/browse")
async def browse_connection(
    conn_id: str,
    catalog: str | None = None,
    schema: str | None = None,
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    _get_connection_or_404(conn_id, current_user.id)
    return await _oss_browse(conn_id, catalog, schema)


@router.get("/{conn_id}/credentials")
async def get_connection_credentials(
    conn_id: str,
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    from backend.services.crypto import decrypt_credentials
    row = _get_connection_or_404(conn_id, current_user.id)
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
        return {
            "fields": {
                k: ("*" * 8 if any(s in k.lower() for s in ("password", "token", "secret")) else v)
                for k, v in creds.items()
            }
        }
    except ValueError:
        raise HTTPException(500, "Failed to decrypt credentials")


@router.get("/{conn_id}/schema", response_model=SchemaConfigResponse | None)
async def get_schema_config(
    conn_id: str,
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    _get_connection_or_404(conn_id, current_user.id)
    row = get_product_db().fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        return None
    result = dict(row)
    result["custom_properties"] = _json.loads(result["custom_properties"])
    return result


@router.get("/{conn_id}/filters", response_model=FilterConfigResponse | None)
async def get_filter_config(
    conn_id: str,
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    _get_connection_or_404(conn_id, current_user.id)
    row = get_product_db().fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (conn_id,)
    )
    if not row:
        return None
    result = dict(row)
    result["filter_fields"] = _json.loads(result["filter_fields"])
    return result


@router.get("/{conn_id}/filter-options")
async def get_filter_options(
    conn_id: str,
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    _get_connection_or_404(conn_id, current_user.id)
    db = _open_db(conn_id)
    try:
        return db.get_filter_options()
    finally:
        db.close()
```

- [ ] **Step 4: Run tests — verify pass**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_analytics_auth.py -v
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add app/api/connections.py tests/test_analytics_auth.py
git commit -m "fix(security): add auth-gated connection sub-endpoints to SaaS router"
```

---

### Task 3: Enforce email verification at login

**Files:**
- Modify: `stratifio-saas/app/services/auth_service.py`
- Modify: `stratifio-saas/app/api/auth.py`

- [ ] **Step 1: Write failing test**

Create `stratifio-saas/tests/test_auth_service.py`:

```python
"""Unit tests for auth_service."""
import pytest
from unittest.mock import patch, MagicMock


def _make_row(**kwargs):
    """Create a mock sqlite3.Row-like object."""
    defaults = {
        "id": "user-1",
        "email": "test@example.com",
        "password_hash": None,
        "email_verified": 0,
        "display_name": "Test",
        "avatar_url": None,
        "created_at": "2026-01-01T00:00:00Z",
        "last_login_at": None,
    }
    defaults.update(kwargs)
    row = MagicMock()
    row.__getitem__ = lambda self, k: defaults[k]
    row.get = lambda k, d=None: defaults.get(k, d)
    return row


def test_authenticate_user_unverified_returns_unverified(tmp_path, monkeypatch):
    """Login with valid credentials but unverified email returns 'unverified'."""
    from app.services import auth_service
    from app.core.password import hash_password

    pw_hash = hash_password("correct-password")
    mock_row = _make_row(password_hash=pw_hash, email_verified=0)

    mock_db = MagicMock()
    mock_db.fetchone.return_value = mock_row
    monkeypatch.setattr(auth_service, "get_product_db", lambda: mock_db)

    result = auth_service.authenticate_user("test@example.com", "correct-password")
    assert result == "unverified"


def test_authenticate_user_verified_returns_row(monkeypatch):
    """Login with valid credentials and verified email returns the user row."""
    from app.services import auth_service
    from app.core.password import hash_password

    pw_hash = hash_password("correct-password")
    mock_row = _make_row(password_hash=pw_hash, email_verified=1)

    mock_db = MagicMock()
    mock_db.fetchone.return_value = mock_row
    monkeypatch.setattr(auth_service, "get_product_db", lambda: mock_db)

    result = auth_service.authenticate_user("test@example.com", "correct-password")
    assert result is mock_row
```

- [ ] **Step 2: Run — verify fails**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_auth_service.py -v
```

Expected: FAIL — `authenticate_user` returns the row regardless of `email_verified`.

- [ ] **Step 3: Update `authenticate_user()` in `auth_service.py`**

In `app/services/auth_service.py`, find `authenticate_user()`. After the password check and before updating `last_login_at`, add:

```python
    # Require email verification
    if not row["email_verified"]:
        return "unverified"
```

The function now returns: `None` (bad credentials), `"unverified"` (valid but email not verified), or a `sqlite3.Row` (success).

- [ ] **Step 4: Update login endpoint in `auth.py`**

In `app/api/auth.py`, in the `login` function, update:

```python
@router.post("/login", response_model=AuthUserResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginBody, response: Response):
    row = authenticate_user(email=body.email, password=body.password)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if row == "unverified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in",
        )
    _set_session_cookie(response, row["id"], row["email"])
    return _row_to_response(row)
```

- [ ] **Step 5: Run tests — verify pass**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_auth_service.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add app/services/auth_service.py app/api/auth.py tests/test_auth_service.py
git commit -m "fix(security): enforce email verification before login"
```

---

### Task 4: Document `users.api_key_hash` risk and guard against misuse

**Files:**
- Modify: `stratifio-saas/app/services/auth_service.py`

**Context:** `_create_users_row()` stores a deterministic hash of the user UUID as `api_key_hash` to satisfy the OSS `users` table NOT NULL constraint. This is not a real API key. If API key auth is ever connected to any route, this value is derivable from the JWT (which encodes `user_id`). The full fix (removing the `users` table) requires a schema migration and is out of scope here. The immediate fix is a comment and a non-derivable value.

- [ ] **Step 1: Replace the deterministic hash with a random value and add a comment**

In `app/services/auth_service.py`, update `_create_users_row()`:

```python
def _create_users_row(user_id: str) -> None:
    """Create a row in the legacy OSS `users` table required by the FK on `connections`.

    The `api_key_hash` column is an OSS concept (API key auth). In SaaS we use JWT.
    We store a random value to satisfy the NOT NULL constraint. This value MUST NOT
    be used for authentication. The `users` table is a candidate for removal once
    the FK constraint on `connections` is dropped (future schema migration).
    """
    import secrets
    product_db = get_product_db()
    existing = product_db.fetchone("SELECT id FROM users WHERE id = ?", (user_id,))
    if not existing:
        # Random hash — NOT a real API key. Do not wire to any auth route.
        api_key_hash = secrets.token_hex(32)
        product_db.execute(
            "INSERT INTO users (id, api_key_hash) VALUES (?, ?)",
            (user_id, api_key_hash),
        )
```

- [ ] **Step 2: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add app/services/auth_service.py
git commit -m "fix(security): replace deterministic api_key_hash with random value, add warning"
```

---

### Task 5: Mark `backend/core/auth.py` as OSS-only dead code

**Files:**
- Modify: `stratifio/backend/core/auth.py`

- [ ] **Step 1: Add warning comment**

Replace the contents of `stratifio/backend/core/auth.py`:

```python
# backend/core/auth.py
# OSS-only API key auth — NOT connected to SaaS JWT auth.
# This dependency is wired to NO router in the current codebase.
# Do NOT add Depends(verify_api_key) to any router expecting SaaS-level protection.
# SaaS authentication is handled by app/core/jwt_auth.py in stratifio-saas.
from fastapi import Header, HTTPException, status
from backend.config import settings


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Verify the API key header. Skip check if no key is configured (dev mode).

    OSS standalone auth only. Not used in SaaS — see stratifio-saas/app/core/jwt_auth.py.
    """
    if not settings.api_key:
        return
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
```

- [ ] **Step 2: Commit**

```bash
cd /Users/carlo/my_work/stratifio
git add backend/core/auth.py
git commit -m "docs(security): mark backend/core/auth.py as OSS-only, not wired to SaaS"
```

---

## Chunk 2: Phase 2 — Structural

### Task 6: Rename `create_router()` to `create_analytics_app()`

**Files:**
- Modify: `stratifio/backend/main.py`
- Modify: `stratifio-saas/app/main.py`

- [ ] **Step 1: Rename in OSS**

In `stratifio/backend/main.py`, rename `create_router` → `create_analytics_app` and update the docstring:

```python
def create_analytics_app() -> FastAPI:
    """Create an stratif.io analytics FastAPI sub-application for embedding in a SaaS wrapper."""
    app = FastAPI(title="stratif.io Analytics")
    app.include_router(trend_router)
    app.include_router(retention_router)
    app.include_router(events_router)
    app.include_router(paths_router)
    app.include_router(conversion_router)
    app.include_router(pivot_router)
    app.include_router(sessions_router)
    app.include_router(connections_router)
    app.include_router(ws_router)
    return app
```

- [ ] **Step 2: Update SaaS import**

In `stratifio-saas/app/main.py`, update:

```python
from backend.main import create_analytics_app

# ...
analytics_app = create_analytics_app()
analytics_app.dependency_overrides[get_analytics_db] = get_authenticated_analytics_db
app.mount("/", analytics_app)
```

- [ ] **Step 3: Verify app still starts**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run python -c "from app.main import app; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Run auth tests to confirm nothing broke**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_analytics_auth.py -v
```

Expected: all PASS.

- [ ] **Step 5: Commit both repos**

```bash
cd /Users/carlo/my_work/stratifio
git add backend/main.py
git commit -m "refactor: rename create_router() to create_analytics_app() for clarity"

cd /Users/carlo/my_work/stratifio-saas
git add app/main.py
git commit -m "refactor: update import to use renamed create_analytics_app()"
```

---

### Task 7: Remove SaaS duplicate layout components

**Files:**
- Delete: `stratifio-saas/frontend/components/layout/DashboardLayout.tsx`
- Delete: `stratifio-saas/frontend/components/layout/Header.tsx`
- Modify: `stratifio-saas/frontend/App.tsx`
- Modify: `stratifio-saas/frontend/components/auth/ProtectedRoute.tsx` (if it imports local layout)

**Context:** The SaaS `DashboardLayout` and `Header` duplicate OSS equivalents. The OSS versions are already available via the `@stratifio/core` alias (set in `vite.config.ts`).

- [ ] **Step 1: Read SaaS layout files to check for differences**

```bash
diff /Users/carlo/my_work/stratifio/frontend/components/layout/DashboardLayout.tsx \
     /Users/carlo/my_work/stratifio-saas/frontend/components/layout/DashboardLayout.tsx || true
diff /Users/carlo/my_work/stratifio/frontend/components/layout/Header.tsx \
     /Users/carlo/my_work/stratifio-saas/frontend/components/layout/Header.tsx || true
```

(`|| true` prevents non-zero exit code from diff when files differ.) If meaningful differences exist, merge them into the OSS component first before deleting the SaaS copies.

- [ ] **Step 2: Update SaaS `App.tsx` to import from `@stratifio/core`**

In `stratifio-saas/frontend/App.tsx`, change:

```typescript
// Before:
import { DashboardLayout } from '@/components/layout/DashboardLayout'

// After:
import { DashboardLayout } from '@stratifio/core/components/layout'
```

- [ ] **Step 3: Check and update any other SaaS files importing local layout**

```bash
grep -r "components/layout/DashboardLayout\|components/layout/Header" \
  /Users/carlo/my_work/stratifio-saas/frontend/ --include="*.tsx" --include="*.ts"
```

Update any found imports to use `@stratifio/core/components/layout`.

- [ ] **Step 4: Remove the duplicate files**

```bash
rm /Users/carlo/my_work/stratifio-saas/frontend/components/layout/DashboardLayout.tsx
rm /Users/carlo/my_work/stratifio-saas/frontend/components/layout/Header.tsx
```

- [ ] **Step 5: Verify frontend builds**

```bash
cd /Users/carlo/my_work/stratifio-saas
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add -A
git commit -m "refactor: remove duplicate layout components, import from @stratifio/core"
```

---

### Task 8: Replace SaaS `ErrorBoundary` with OSS one

**Files:**
- Modify: `stratifio-saas/frontend/App.tsx`

- [ ] **Step 1: Update import in `App.tsx`**

In `stratifio-saas/frontend/App.tsx`:

1. Remove the inline `ErrorBoundary` class definition (the class component with `state = { error: null }`).
2. Add import at the top:

```typescript
import { ErrorBoundary } from '@stratifio/core/components/ErrorBoundary'
```

Note: `@stratifio/core` resolves to `/Users/carlo/my_work/stratifio/frontend` via the Vite alias. This is a direct path import bypassing the barrel file (`index.ts`) — that is intentional. The `ErrorBoundary` component is not exported from the OSS barrel but the direct path import works correctly with Vite alias resolution.

- [ ] **Step 2: Verify frontend builds**

```bash
cd /Users/carlo/my_work/stratifio-saas
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add frontend/App.tsx
git commit -m "refactor: replace inline ErrorBoundary with shared OSS component"
```

---

### Task 9: Move `PathAnalysisTable.tsx` into feature folder

**Files:**
- Move: `stratifio/frontend/PathAnalysisTable.tsx` → `stratifio/frontend/features/analytics/paths/components/PathAnalysisTable.tsx`
- Update any imports

- [ ] **Step 1: Find all imports of the file**

```bash
grep -r "PathAnalysisTable" /Users/carlo/my_work/stratifio/frontend/ \
  --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Ensure target directory exists and move the file**

```bash
mkdir -p /Users/carlo/my_work/stratifio/frontend/features/analytics/paths/components
mv /Users/carlo/my_work/stratifio/frontend/PathAnalysisTable.tsx \
   /Users/carlo/my_work/stratifio/frontend/features/analytics/paths/components/PathAnalysisTable.tsx
```

- [ ] **Step 3: Update imports in files found in step 1**

Change any `import ... from '.../PathAnalysisTable'` to the new path.

- [ ] **Step 4: Verify frontend builds**

```bash
cd /Users/carlo/my_work/stratifio
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/carlo/my_work/stratifio
git add -A
git commit -m "refactor: move PathAnalysisTable into features/analytics/paths/components/"
```

---

### Task 10: Remove `dist/` from SaaS git if still tracked

- [ ] **Step 1: Check if tracked**

```bash
git -C /Users/carlo/my_work/stratifio-saas ls-files dist/ | head -5
```

- [ ] **Step 2: If output is non-empty, untrack and commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git rm -r --cached dist/
git commit -m "chore: untrack dist/ build output from git"
```

If output is empty, skip — already clean.

---

## Chunk 3: Phase 3 — Code Quality

### Task 11: Split `backend/api/connections.py` into a subpackage

**Files:**
- Create: `stratifio/backend/api/connections/__init__.py`
- Create: `stratifio/backend/api/connections/models.py`
- Create: `stratifio/backend/api/connections/crud.py`
- Create: `stratifio/backend/api/connections/schema_detect.py`
- Create: `stratifio/backend/api/connections/browse.py`
- Delete: `stratifio/backend/api/connections.py` (flat file)
- Modify: `stratifio/backend/api/__init__.py`

**Context:** The 717-line `connections.py` does five unrelated jobs. Split into a subpackage with one file per responsibility. The public interface (`connections_router`) stays the same so nothing else needs changing.

- [ ] **Step 1: Run existing backend tests to establish baseline**

```bash
cd /Users/carlo/my_work/stratifio
uv run pytest backend/tests/ -v --tb=short 2>&1 | tail -30
```

Note how many pass. This is the baseline to beat.

- [ ] **Step 2: Create `backend/api/connections/` subpackage**

```bash
mkdir /Users/carlo/my_work/stratifio/backend/api/connections_pkg
```

(We use a temp name to avoid collision with the existing file; we'll rename after.)

- [ ] **Step 3: Create `models.py`**

Create `stratifio/backend/api/connections_pkg/models.py`. Copy these classes verbatim from `connections.py`:
- `CustomProperty` (with `validate_path` validator and `model_config`)
- `ConnectionCreate`, `ConnectionUpdate`, `ConnectionResponse`
- `SchemaConfigBody`, `SchemaConfigResponse`
- `FilterField`, `FilterConfigBody`, `FilterConfigResponse`
- Also copy `DbType` and `_PATH_RE` which are used by the models.

Required imports for this file: `re`, `typing.Any`, `typing.Literal`, `pydantic.BaseModel`, `pydantic.field_validator`.

- [ ] **Step 4: Create `schema_detect.py`**

Create `stratifio/backend/api/connections_pkg/schema_detect.py`. Copy these functions verbatim from `connections.py`:
- `_suggest_fields(columns)`
- `_pick_events_table(tables, hint)`
- `_infer_type(sql_type)`
- `_parse_struct_fields(sql_type, prefix)` and `_parse_struct_field(field_def, prefix, results)`
- `detect_schema(conn_id, events_table)` FastAPI endpoint
- `_detect_schema_duckdb(file_path, hint)`
- `_detect_schema_sqlite(file_path, hint)`
- `_detect_schema_postgresql(creds, hint)`
- `_detect_schema_databricks(creds, hint)`

Create a `router = APIRouter()` (no prefix — prefix is set in `__init__.py`) and decorate `detect_schema` with `@router.get("/{conn_id}/schema/detect")`.

Required imports: `fastapi.APIRouter`, `fastapi.HTTPException`, `backend.api.connections_pkg.models` (for any shared models), `backend.services.crypto.decrypt_credentials`.

- [ ] **Step 5: Create `browse.py`**

Create `stratifio/backend/api/connections_pkg/browse.py`. Copy verbatim from `connections.py`:
- `browse_connection(conn_id, catalog, schema)` FastAPI endpoint

Create a `router = APIRouter()` (no prefix) and decorate with `@router.get("/{conn_id}/browse")`.

- [ ] **Step 6: Create `crud.py`**

Create `stratifio/backend/api/connections_pkg/crud.py` with:
- `_now()`
- `_get_connection_or_404()`
- All CRUD endpoints: `list_connections`, `create_connection`, `get_connection`, `update_connection`, `delete_connection`, `test_connection`
- `get_schema_config`, `upsert_schema_config`
- `get_filter_config`, `upsert_filter_config`
- `get_filter_options`
- `get_connection_credentials`

This references models from `models.py` and functions from `schema_detect.py` and `browse.py`.

- [ ] **Step 7: Create `__init__.py` that assembles the router**

Create `stratifio/backend/api/connections_pkg/__init__.py`:

```python
"""Connections API — manage database connections and their schema/filter configs."""
from fastapi import APIRouter

from .crud import router as _crud_router
from .schema_detect import router as _detect_router
from .browse import router as _browse_router

# Re-export models for SaaS to import
from .models import (
    ConnectionCreate,
    ConnectionResponse,
    ConnectionUpdate,
    CustomProperty,
    FilterConfigBody,
    FilterConfigResponse,
    FilterField,
    SchemaConfigBody,
    SchemaConfigResponse,
)

# Single assembled router — same interface as before
connections_router = APIRouter(prefix="/api/connections", tags=["connections"])
connections_router.include_router(_crud_router)
connections_router.include_router(_detect_router)
connections_router.include_router(_browse_router)

__all__ = [
    "connections_router",
    "ConnectionCreate", "ConnectionResponse", "ConnectionUpdate",
    "CustomProperty",
    "FilterConfigBody", "FilterConfigResponse", "FilterField",
    "SchemaConfigBody", "SchemaConfigResponse",
]
```

Note: each sub-router (`_crud_router`, `_detect_router`, `_browse_router`) should NOT set a prefix — the prefix is set on `connections_router` above.

- [ ] **Step 8: Swap the old file for the subpackage**

```bash
mv /Users/carlo/my_work/stratifio/backend/api/connections.py \
   /Users/carlo/my_work/stratifio/backend/api/connections_old.py
mv /Users/carlo/my_work/stratifio/backend/api/connections_pkg \
   /Users/carlo/my_work/stratifio/backend/api/connections
```

- [ ] **Step 9: Update `backend/api/__init__.py`** if it imports directly from `connections.py`

```bash
cat /Users/carlo/my_work/stratifio/backend/api/__init__.py
```

Ensure `connections_router` is imported from the new package. The import path stays the same: `from backend.api.connections import connections_router`.

- [ ] **Step 10: Run tests — verify baseline still holds**

```bash
cd /Users/carlo/my_work/stratifio
uv run pytest backend/tests/ -v --tb=short 2>&1 | tail -30
```

Expected: same number of tests pass as baseline.

- [ ] **Step 11: Remove old file**

```bash
rm /Users/carlo/my_work/stratifio/backend/api/connections_old.py
```

- [ ] **Step 12: Commit**

```bash
cd /Users/carlo/my_work/stratifio
git add -A
git commit -m "refactor: split connections.py (717 lines) into connections/ subpackage"
```

---

### Task 12: Extract `_now()` to a shared utility

**Files:**
- Create: `stratifio/backend/utils.py`
- Modify: `stratifio/backend/api/connections/crud.py`
- Modify: `stratifio-saas/app/api/connections.py`
- Modify: `stratifio-saas/app/services/auth_service.py`

- [ ] **Step 1: Create `stratifio/backend/utils.py`**

```python
"""Shared utility helpers for the stratif.io backend."""
from datetime import UTC, datetime


def utcnow_str() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def utcnow_plus_str(hours: int) -> str:
    """Return UTC time `hours` from now as an ISO 8601 string."""
    from datetime import timedelta
    return (datetime.now(UTC) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
```

- [ ] **Step 2: Replace `_now()` in each file**

In each file that defines `_now()`:
1. Remove the local definition.
2. Add `from backend.utils import utcnow_str as _now` at the top.

For `auth_service.py` which also uses `_now_plus()`:
- Add `from backend.utils import utcnow_plus_str as _now_plus`.

- [ ] **Step 3: Run tests**

```bash
cd /Users/carlo/my_work/stratifio
uv run pytest backend/tests/ -v --tb=short 2>&1 | tail -10

cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/ -v --tb=short 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit both repos**

```bash
cd /Users/carlo/my_work/stratifio
git add backend/utils.py backend/api/connections/crud.py
git commit -m "refactor: extract _now() to backend/utils.py"

cd /Users/carlo/my_work/stratifio-saas
git add app/api/connections.py app/services/auth_service.py
git commit -m "refactor: use shared utcnow_str() from backend/utils.py"
```

---

### Task 13: Fix fragile migration system with version tracking

**Files:**
- Modify: `stratifio-saas/app/product_db/migrations.py`

**Context:** Migrations currently use `suppress(sqlite3.OperationalError)` which swallows real errors. Replace with a `schema_migrations` table that tracks applied migrations by index.

- [ ] **Step 1: Write failing test**

Add to `stratifio-saas/tests/test_migrations.py`:

```python
"""Test that migrations are tracked and errors are not silently swallowed."""
import sqlite3
import pytest


def test_migration_tracking(tmp_path):
    """Applied migrations are recorded in schema_migrations table."""
    import sys
    sys.path.insert(0, str(tmp_path))

    db_path = str(tmp_path / "test.db")

    # Patch settings to use tmp db
    from unittest.mock import patch, MagicMock
    mock_db = MagicMock()
    mock_db.db_path = db_path

    with patch("app.product_db.migrations.get_product_db", return_value=mock_db):
        from app.product_db.migrations import init_product_db, run_migrations
        init_product_db()
        run_migrations()
        run_migrations()  # Safe to run twice

    conn = sqlite3.connect(db_path)
    rows = conn.execute("SELECT idx FROM schema_migrations ORDER BY idx").fetchall()
    conn.close()

    from app.product_db.migrations import _MIGRATIONS
    assert len(rows) == len(_MIGRATIONS), "All migrations should be recorded"
    assert rows == [(i,) for i in range(len(_MIGRATIONS))]


def test_migration_not_reapplied(tmp_path):
    """Migrations already in schema_migrations are skipped."""
    db_path = str(tmp_path / "test.db")
    from unittest.mock import patch, MagicMock
    mock_db = MagicMock()
    mock_db.db_path = db_path

    with patch("app.product_db.migrations.get_product_db", return_value=mock_db):
        from importlib import reload
        import app.product_db.migrations as mig_module
        reload(mig_module)
        mig_module.init_product_db()
        mig_module.run_migrations()
        mig_module.run_migrations()  # Must not raise
```

- [ ] **Step 2: Run — verify fails**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_migrations.py -v
```

Expected: FAIL — no `schema_migrations` table exists.

- [ ] **Step 3: Update `run_migrations()` in `app/product_db/migrations.py`**

```python
def run_migrations() -> None:
    """Apply incremental schema migrations. Each migration is tracked by index
    in the schema_migrations table and skipped if already applied."""
    import sqlite3

    db = get_product_db()
    conn = sqlite3.connect(db.db_path)
    try:
        # Bootstrap the migration tracker
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                idx     INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            )
        """)
        conn.commit()

        applied = {row[0] for row in conn.execute("SELECT idx FROM schema_migrations").fetchall()}

        for i, sql in enumerate(_MIGRATIONS):
            if i in applied:
                continue
            conn.execute(sql)
            conn.execute("INSERT INTO schema_migrations (idx) VALUES (?)", (i,))
            conn.commit()
    finally:
        conn.close()
```

- [ ] **Step 4: Run tests — verify pass**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_migrations.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add app/product_db/migrations.py tests/test_migrations.py
git commit -m "fix: replace fragile migration error suppression with schema_migrations tracking"
```

---

### Task 14: Add SaaS integration tests for auth flow

**Files:**
- Create: `stratifio-saas/tests/conftest.py`
- Create: `stratifio-saas/tests/test_auth_flow.py`

**Context:** The SaaS has no automated tests for the core auth flow. Cover the happy path and key error cases.

- [ ] **Step 1: Add `_reset_product_db()` to OSS `database.py`**

In `stratifio/backend/product_db/database.py`, add after `get_product_db()`:

```python
def _reset_product_db() -> None:
    """Reset the product DB singleton — for use in tests only.

    Both OSS and SaaS share this singleton because SaaS migrations import
    `get_product_db` from `backend.product_db`. A single reset covers both.
    """
    global _product_db
    _product_db = None
```

Commit this change:

```bash
cd /Users/carlo/my_work/stratifio
git add backend/product_db/database.py
git commit -m "test: add _reset_product_db() helper for test isolation"
```

Verify it is importable from the SaaS virtualenv before continuing:

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run python -c "from backend.product_db.database import _reset_product_db; print('OK')"
```

Expected: `OK`. If this fails, the editable install has not picked up the change — run `uv sync` to refresh.

- [ ] **Step 2: Create `conftest.py`**

Create `stratifio-saas/tests/conftest.py`:

```python
"""Shared test fixtures for stratifio-saas."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def use_tmp_db(tmp_path, monkeypatch):
    """Point product DB at a temp file and reset singletons for each test."""
    db_file = str(tmp_path / "test_product.db")
    monkeypatch.setenv("STRATIFIO_PRODUCT_DB_PATH", db_file)
    monkeypatch.setenv("STRATIFIO_JWT_SECRET", "test-secret-at-least-32-chars-long")
    monkeypatch.setenv("STRATIFIO_ENCRYPTION_KEY", "test-encrypt-key-32-chars-padded==")
    monkeypatch.setenv("STRATIFIO_CORS_ORIGINS", "http://localhost:5174")
    monkeypatch.setenv("STRATIFIO_ALLOW_REGISTRATION", "true")
    monkeypatch.setenv("STRATIFIO_DEBUG", "true")

    # Reset cached settings and DB singleton so they pick up the new env vars
    from app.config import get_settings
    get_settings.cache_clear()

    from backend.product_db.database import _reset_product_db
    _reset_product_db()

    # Initialize schema in the fresh temp DB
    from app.product_db.migrations import init_product_db, run_migrations
    init_product_db()
    run_migrations()

    yield

    get_settings.cache_clear()
    _reset_product_db()


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app, raise_server_exceptions=False)
```

Note: `backend/product_db/database.py` may need a `_reset_product_db()` helper to reset the singleton — check if one exists, add if not.

- [ ] **Step 2: Create `test_auth_flow.py`**

Create `stratifio-saas/tests/test_auth_flow.py`:

```python
"""Integration tests for the auth flow."""


def test_register_returns_201(client):
    resp = client.post("/api/auth/register", json={
        "email": "alice@example.com",
        "password": "strongpassword1",
        "display_name": "Alice",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "alice@example.com"
    assert "id" in data


def test_duplicate_register_returns_409(client):
    body = {"email": "alice@example.com", "password": "pw12345678", "display_name": "Alice"}
    client.post("/api/auth/register", json=body)
    resp = client.post("/api/auth/register", json=body)
    assert resp.status_code == 409


def test_login_without_verification_returns_403(client):
    client.post("/api/auth/register", json={
        "email": "bob@example.com",
        "password": "pw12345678",
        "display_name": "Bob",
    })
    resp = client.post("/api/auth/login", json={
        "email": "bob@example.com",
        "password": "pw12345678",
    })
    assert resp.status_code == 403
    assert "verify" in resp.json()["detail"].lower()


def test_login_wrong_password_returns_401(client):
    client.post("/api/auth/register", json={
        "email": "carol@example.com",
        "password": "correct-horse",
        "display_name": "Carol",
    })
    resp = client.post("/api/auth/login", json={
        "email": "carol@example.com",
        "password": "wrong-password",
    })
    assert resp.status_code == 401


def test_me_without_session_returns_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_logout_clears_session(client):
    # Register + manually mark verified
    client.post("/api/auth/register", json={
        "email": "dave@example.com",
        "password": "pw12345678",
        "display_name": "Dave",
    })
    # Mark verified directly in DB
    from backend.product_db import get_product_db
    get_product_db().execute(
        "UPDATE auth_users SET email_verified = 1 WHERE email = ?",
        ("dave@example.com",)
    )
    login = client.post("/api/auth/login", json={
        "email": "dave@example.com",
        "password": "pw12345678",
    })
    assert login.status_code == 200

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200

    me = client.get("/api/auth/me")
    assert me.status_code == 401
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_auth_flow.py -v
```

Expected: all PASS (adjust conftest if product DB singleton needs reset helper).

- [ ] **Step 4: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add tests/conftest.py tests/test_auth_flow.py
git commit -m "test: add SaaS integration tests for auth flow"
```

---

### Task 15: Add connection scoping tests for SaaS

**Files:**
- Create: `stratifio-saas/tests/test_connection_scoping.py`

**Context:** Verify that a user cannot access another user's connections.

- [ ] **Step 1: Create test file**

```python
"""Verify connections are scoped to the owning user."""
import pytest


def _register_and_verify(client, email, password="pw12345678"):
    """Register a user and mark email as verified."""
    client.post("/api/auth/register", json={
        "email": email, "password": password, "display_name": email,
    })
    from backend.product_db import get_product_db
    get_product_db().execute(
        "UPDATE auth_users SET email_verified = 1 WHERE email = ?", (email,)
    )
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.cookies


def test_user_cannot_see_other_users_connections(client):
    """Alice's connections are not visible to Bob."""
    alice_cookies = _register_and_verify(client, "alice@example.com")
    bob_cookies = _register_and_verify(client, "bob@example.com")

    # Alice creates a connection
    resp = client.post(
        "/api/connections",
        json={"name": "Alice DB", "db_type": "duckdb", "credentials": {"file_path": ":memory:"}},
        cookies=alice_cookies,
    )
    assert resp.status_code == 201
    conn_id = resp.json()["id"]

    # Bob lists connections — should not see Alice's
    resp = client.get("/api/connections", cookies=bob_cookies)
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert conn_id not in ids


def test_user_cannot_access_other_users_connection_by_id(client):
    """Bob cannot GET Alice's connection directly."""
    alice_cookies = _register_and_verify(client, "alice2@example.com")
    bob_cookies = _register_and_verify(client, "bob2@example.com")

    resp = client.post(
        "/api/connections",
        json={"name": "Alice DB", "db_type": "duckdb", "credentials": {"file_path": ":memory:"}},
        cookies=alice_cookies,
    )
    conn_id = resp.json()["id"]

    resp = client.get(f"/api/connections/{conn_id}", cookies=bob_cookies)
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/carlo/my_work/stratifio-saas
uv run pytest tests/test_connection_scoping.py -v
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/carlo/my_work/stratifio-saas
git add tests/test_connection_scoping.py
git commit -m "test: add connection scoping tests verifying user isolation"
```

---

### Task 16: Split `backend/services/connection_executor.py`

**Files:**
- Create: `stratifio/backend/services/analytics_db.py`
- Create: `stratifio/backend/services/pool.py`
- Modify: `stratifio/backend/services/connection_executor.py` (keep only `get_analytics_db` dependency)

**Context:** The 488-line file mixes pool management, CTE building, dialect routing, and the `AnalyticsDatabase` class. Split into focused files. `get_analytics_db` stays in `connection_executor.py` since SaaS overrides it by name.

- [ ] **Step 1: Run backend tests to establish baseline**

```bash
cd /Users/carlo/my_work/stratifio
uv run pytest backend/tests/ -v --tb=short 2>&1 | tail -10
```

- [ ] **Step 2: Create `pool.py`**

Create `stratifio/backend/services/pool.py`. Move from `connection_executor.py`:
- `_POOL_TTL` constant
- `_pool` dict and `_pool_lock`
- `_pool_get(key, factory)` function
- `_is_connection_error(exc, dialect)` function

- [ ] **Step 3: Create `analytics_db.py`**

Create `stratifio/backend/services/analytics_db.py`. Move from `connection_executor.py`:
- All private helper functions: `_resolve_path_to_sql`, `_EVENTS_REF_RE`, `_to_named_params`, `_get_table_columns`, `_remap_exprs_for_available_cols`, `_prepend_events_cte`
- The `AnalyticsDatabase` class (all methods)
- `open_analytics_db(connection_id)` function
- `_open_pg(creds)` and `_open_databricks(creds)` helpers

Import `_pool_get` and `_is_connection_error` from `pool.py`.

- [ ] **Step 4: Slim down `connection_executor.py`**

`connection_executor.py` keeps only:
```python
"""FastAPI dependency for the analytics database."""
from backend.services.analytics_db import open_analytics_db, AnalyticsDatabase  # noqa: F401
from fastapi import HTTPException, Query


async def get_analytics_db(
    connection_id: str | None = Query(None, description="Active connection ID"),
):
    """FastAPI dependency: yields the analytics DB for the active connection."""
    from backend.product_db import get_product_db
    resolved_id = connection_id
    if not resolved_id:
        product_db = get_product_db()
        row = product_db.fetchone("SELECT id FROM connections ORDER BY created_at ASC LIMIT 1")
        if row:
            resolved_id = row["id"]
    if not resolved_id:
        raise HTTPException(status_code=503, detail="No analytics connection configured.")
    db = open_analytics_db(resolved_id)
    try:
        yield db
    finally:
        db.close()
```

The re-exports (`AnalyticsDatabase`, `open_analytics_db`) preserve backward compatibility for any code importing from `connection_executor`.

- [ ] **Step 5: Run tests — verify baseline holds**

```bash
cd /Users/carlo/my_work/stratifio
uv run pytest backend/tests/ -v --tb=short 2>&1 | tail -10
```

Expected: same pass count as Step 1.

- [ ] **Step 6: Commit**

```bash
cd /Users/carlo/my_work/stratifio
git add -A
git commit -m "refactor: split connection_executor.py into analytics_db.py and pool.py"
```

---

> **Deferred items (out of scope for this plan):**
>
> - **OSS/SaaS schema divergence**: The OSS `connections` table (no `user_id`) vs SaaS (with `user_id`) requires a coordinated schema migration. Deferred to a dedicated schema migration plan.
> - **SaaS connections CRUD duplication**: Full elimination of the OSS connections router from the analytics sub-app requires the schema migration above first (to ensure a single authoritative `connections` table). Deferred.

---

## Summary

| Task | Phase | Repo | Status |
|---|---|---|---|
| 1 — Gate analytics with JWT | Security | saas | - [ ] |
| 2 — Auth-gate connection sub-endpoints | Security | saas | - [ ] |
| 3 — Enforce email verification | Security | saas | - [ ] |
| 4 — Randomize api_key_hash | Security | saas | - [ ] |
| 5 — Mark auth.py as OSS-only | Security | oss | - [ ] |
| 6 — Rename create_analytics_app() | Structural | both | - [ ] |
| 7 — Remove duplicate layout components | Structural | saas | - [ ] |
| 8 — Replace inline ErrorBoundary | Structural | saas | - [ ] |
| 9 — Move PathAnalysisTable.tsx | Structural | oss | - [ ] |
| 10 — Untrack dist/ | Structural | saas | - [ ] |
| 11 — Split connections.py | Quality | oss | - [ ] |
| 12 — Extract _now() to utils | Quality | both | - [ ] |
| 13 — Fix migration tracking | Quality | saas | - [ ] |
| 14 — Auth flow tests | Quality | saas | - [ ] |
| 15 — Connection scoping tests | Quality | saas | - [ ] |
| 16 — Split connection_executor.py | Quality | oss | - [ ] |
