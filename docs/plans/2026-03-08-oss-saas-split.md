# OSS / SaaS Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the current monolithic OpenFlow repo into a public OSS repo (self-hostable analytics dashboard) and a private SaaS repo (auth + multi-tenancy wrapper).

**Architecture:** The current repo becomes the OSS repo. Auth code is stripped out and replaced with a simple API key. The frontend is restructured to export `<OpenFlowDashboard>` as an npm package (`@openflow/core`). The backend is restructured to export `create_router()` as a PyPI package (`openflow-core`). A separate `openflow-saas` repo will be created manually after this plan completes.

**Tech Stack:** React 18, Vite, FastAPI, DuckDB, Docker Compose, npm, PyPI (via uv/hatch)

---

## Overview of changes to this repo

1. Rename `src/` → `frontend/`, `openflow/` → `backend/`
2. Remove all auth code (frontend + backend)
3. Replace multi-tenant DB connection system with single env-var config
4. Add `<OpenFlowDashboard>` root component export
5. Add `create_router()` factory export to backend
6. Update build tooling (Vite, pyproject.toml) for new structure
7. Add `docker-compose.yml` for self-hosting
8. Update tests to match new structure

---

## Task 1: Rename directories — `src/` → `frontend/`, `openflow/` → `backend/`

**Files:**
- Rename: `src/` → `frontend/`
- Rename: `openflow/` → `backend/`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `tsconfig.node.json`
- Modify: `package.json`
- Modify: `pyproject.toml`
- Modify: `index.html`
- Modify: `vitest.config.ts`
- Modify: `playwright.config.ts`
- Modify: `eslint.config.js`

**Step 1: Rename the directories**

```bash
mv src frontend
mv openflow backend
```

**Step 2: Update `vite.config.ts`**

Change the path alias from `./src` to `./frontend`:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
})
```

**Step 3: Update `tsconfig.json`**

Change `paths` and `include`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./frontend/*"]
    }
  },
  "include": ["frontend"]
}
```

**Step 4: Update `index.html`**

Change script src from `/src/main.tsx` to `/frontend/main.tsx`:

```html
<script type="module" src="/frontend/main.tsx"></script>
```

**Step 5: Update `pyproject.toml`**

Change all `openflow.*` references to `backend.*`:

```toml
[project.scripts]
serve = "backend.main:main"
seed-duckdb = "seeders.seeder_duckdb:main"
seed-sqlite = "seeders.seeder_sqlite:main"
```

Also update any package discovery config to use `backend` instead of `openflow`.

**Step 6: Update `vitest.config.ts`**

Change include patterns from `src/` to `frontend/`:

```ts
test: {
  include: ['frontend/**/*.test.{ts,tsx}'],
  setupFiles: ['frontend/test/setup.ts'],
}
```

**Step 7: Update `playwright.config.ts`**

Update any references to `src/` → `frontend/`.

**Step 8: Update `eslint.config.js`**

Update any `src/` references to `frontend/`.

**Step 9: Verify build still works**

```bash
npm run build
```

Expected: TypeScript compiles without errors.

**Step 10: Verify backend still imports correctly**

```bash
uv run python -c "import backend; print('ok')"
```

Expected: `ok`

**Step 11: Commit**

```bash
git add -A
git commit -m "refactor: rename src/ → frontend/, openflow/ → backend/"
```

---

## Task 2: Remove auth code from backend

**Files:**
- Delete: `backend/core/password.py`
- Delete: `backend/core/jwt_auth.py`
- Delete: `backend/core/jwt_utils.py`
- Delete: `backend/core/rate_limit.py`
- Delete: `backend/api/auth.py`
- Delete: `backend/services/auth_service.py`
- Delete: `backend/services/crypto.py`
- Delete: `backend/services/email_service.py`
- Delete: `backend/product_db/` (entire directory)
- Modify: `backend/core/__init__.py`
- Modify: `backend/core/auth.py` → replace with API key check
- Modify: `backend/config.py`
- Modify: `backend/main.py`
- Delete: `backend/tests/test_auth_security.py`

**Step 1: Delete auth-specific files**

```bash
rm backend/core/password.py
rm backend/core/jwt_auth.py
rm backend/core/jwt_utils.py
rm backend/core/rate_limit.py
rm backend/api/auth.py
rm backend/services/auth_service.py
rm backend/services/crypto.py
rm backend/services/email_service.py
rm -rf backend/product_db
rm backend/tests/test_auth_security.py
```

**Step 2: Rewrite `backend/core/auth.py` as simple API key check**

```python
# backend/core/auth.py
from fastapi import Header, HTTPException, status
from backend.config import settings


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Verify the API key header. Skip check if no key is configured (dev mode)."""
    if not settings.api_key:
        return
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
```

**Step 3: Rewrite `backend/config.py`**

Remove all auth/JWT/OAuth/SMTP settings. Keep only analytics-relevant config:

```python
# backend/config.py
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = {"env_prefix": "OPENFLOW_", "extra": "ignore"}

    # Analytics DB (single connection)
    db_url: str = "duckdb:///./analytics.duckdb"
    db_type: str = "duckdb"  # duckdb | sqlite | postgres | databricks

    # API key auth (optional for dev, required for production)
    api_key: str = ""

    # Server
    cors_origins: str = "http://localhost:5173"
    debug: bool = False
    log_level: str = "INFO"
    log_sql: bool = False
    log_format: str = "json"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
```

**Step 4: Rewrite `backend/main.py`**

Remove auth router, product DB lifespan, rate limiting. Keep analytics routers:

```python
# backend/main.py
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.core.logging import setup_logging
from backend.db import init_db
from backend.api import trend, retention, events, paths, conversion, pivot, sessions, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level, settings.log_format)
    await init_db()
    yield


app = FastAPI(
    title="OpenFlow Analytics",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trend.router, prefix="/api")
app.include_router(retention.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(paths.router, prefix="/api")
app.include_router(conversion.router, prefix="/api")
app.include_router(pivot.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# SPA fallback (production)
dist_path = Path(__file__).parent.parent / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(dist_path / "index.html")


def main():
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
```

**Step 5: Fix `backend/core/__init__.py`**

Remove any imports of deleted modules.

**Step 6: Run backend tests**

```bash
uv run pytest backend/tests/ -v --ignore=backend/tests/test_auth_security.py
```

Expected: Tests pass (some may fail if they reference auth — fix as needed).

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove auth from backend, replace with optional API key"
```

---

## Task 3: Update backend DB connection for single-tenant env-var config

**Files:**
- Modify: `backend/db/__init__.py`
- Modify: `backend/services/connection_executor.py`
- Modify: `backend/api/connections.py` → simplify to read-only single connection info

**Step 1: Rewrite `backend/db/__init__.py`**

Remove multi-tenant logic. Connect to the single DB from config:

```python
# backend/db/__init__.py
import duckdb
from backend.config import settings

_conn: duckdb.DuckDBPyConnection | None = None


async def init_db() -> None:
    global _conn
    if settings.db_type == "duckdb":
        _conn = duckdb.connect(settings.db_url.replace("duckdb:///", ""))
    # Add other dialects as needed


def get_db():
    if _conn is None:
        raise RuntimeError("Database not initialized")
    return _conn


def get_dialect() -> str:
    return settings.db_type
```

**Step 2: Update `backend/services/connection_executor.py`**

Remove per-user connection resolution. Use `get_db()` directly:

```python
# Replace get_analytics_db dependency (which required auth user) with:
from backend.db import get_db, get_dialect

def get_analytics_db():
    return get_db()
```

**Step 3: Simplify `backend/api/connections.py`**

Replace multi-tenant CRUD with a single read-only endpoint showing current connection:

```python
# backend/api/connections.py
from fastapi import APIRouter
from backend.config import settings

router = APIRouter(tags=["connections"])


@router.get("/api/connection")
async def get_connection():
    """Return the current connection config (read-only, no credentials)."""
    return {
        "db_type": settings.db_type,
        "db_url": settings.db_url,
        "connected": True,
    }
```

**Step 4: Run backend tests**

```bash
uv run pytest backend/tests/ -v
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: replace multi-tenant connections with single env-var DB config"
```

---

## Task 4: Remove auth code from frontend

**Files:**
- Delete: `frontend/features/auth/` (entire directory)
- Delete: `frontend/contexts/AuthContext.tsx`
- Delete: `frontend/components/auth/ProtectedRoute.tsx`
- Delete: `frontend/components/layout/EmailVerificationBanner.tsx`
- Delete: `frontend/lib/schemas/auth-schemas.ts`
- Delete: `frontend/lib/schemas/form-schemas.ts`
- Delete: `frontend/pages/LandingPage.tsx`
- Modify: `frontend/lib/api/client.ts` — remove auth headers/cookie logic
- Modify: `frontend/lib/api/queries.ts` — remove auth-related queries
- Modify: `frontend/lib/schemas/index.ts`
- Modify: `frontend/App.tsx` — remove auth routes and ProtectedRoute

**Step 1: Delete auth frontend files**

```bash
rm -rf frontend/features/auth
rm frontend/contexts/AuthContext.tsx
rm frontend/components/auth/ProtectedRoute.tsx
rm frontend/components/layout/EmailVerificationBanner.tsx
rm frontend/lib/schemas/auth-schemas.ts
rm frontend/lib/schemas/form-schemas.ts
rm frontend/pages/LandingPage.tsx
```

**Step 2: Rewrite `frontend/App.tsx`**

Remove auth routes, ProtectedRoute, and AuthContext. Dashboard routes are always accessible:

```tsx
// frontend/App.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageLoader } from '@/components/ui/loading-state'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const TrendsPage = lazy(() => import('@/features/analytics/trends/TrendsPage'))
const RetentionPage = lazy(() => import('@/features/analytics/retention/RetentionPage'))
const PathsPage = lazy(() => import('@/features/analytics/paths/PathsPage'))
const FunnelDetailPage = lazy(() => import('@/features/analytics/paths/FunnelDetailPage'))
const PathsExplorerPage = lazy(() => import('@/features/analytics/paths/PathsExplorerPage'))
const NewPivotPage = lazy(() => import('@/features/analytics/pivot/NewPivotPage'))
const EventsPage = lazy(() => import('@/features/events/EventsPage'))
const SessionsPage = lazy(() => import('@/pages/SessionsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/retention" element={<RetentionPage />} />
            <Route path="/paths" element={<PathsPage />} />
            <Route path="/paths/explorer" element={<PathsExplorerPage />} />
            <Route path="/funnel/:id" element={<FunnelDetailPage />} />
            <Route path="/pivot" element={<NewPivotPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

**Step 3: Rewrite `frontend/lib/api/client.ts`**

Remove cookie credentials and auth headers. Add optional API key from env:

```ts
// frontend/lib/api/client.ts
const API_BASE = import.meta.env.VITE_API_URL ?? ''
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

export async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    ...(options?.headers as Record<string, string>),
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Request failed')
  }
  return res.json()
}
```

**Step 4: Remove auth queries from `frontend/lib/api/queries.ts`**

Delete any functions related to login, register, logout, user profile.

**Step 5: Update `frontend/lib/schemas/index.ts`**

Remove exports of deleted schema files.

**Step 6: Update `frontend/components/layout/DashboardLayout.tsx`**

Remove `EmailVerificationBanner` import and usage. Remove any auth-related UI (user menu with logout, etc.) or replace with a simple static header.

**Step 7: Update `frontend/components/layout/Header.tsx`**

Remove user avatar / logout button. Keep theme toggle and other non-auth UI.

**Step 8: Fix any remaining TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: remove auth from frontend, dashboard is always accessible"
```

---

## Task 5: Export `<OpenFlowDashboard>` root component

**Files:**
- Modify: `frontend/main.tsx` — keep as app entry point (unchanged for self-hosting)
- Create: `frontend/index.ts` — package entry point for npm consumers
- Modify: `package.json` — add `exports` field

**Step 1: Create `frontend/index.ts`**

```ts
// frontend/index.ts
// Package entry point for @openflow/core consumers
export { default as OpenFlowDashboard } from './App'
```

**Step 2: Update `package.json`**

Add `exports` and `main` fields so the package is consumable:

```json
{
  "name": "@openflow/core",
  "version": "0.1.0",
  "description": "OpenFlow Analytics — open source analytics dashboard",
  "main": "./frontend/index.ts",
  "exports": {
    ".": "./frontend/index.ts"
  },
  "files": ["frontend", "dist"],
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

**Step 3: Verify the export resolves**

```bash
npm run build
```

Expected: Build succeeds. The `dist/` contains the compiled output.

**Step 4: Commit**

```bash
git add frontend/index.ts package.json
git commit -m "feat: export OpenFlowDashboard component as @openflow/core package"
```

---

## Task 6: Export `create_router()` factory from backend

**Files:**
- Create: `backend/__init__.py` — expose public API
- Modify: `backend/main.py` — extract router factory

**Step 1: Add `create_router()` to `backend/main.py`**

```python
# Add to backend/main.py

from fastapi import FastAPI


def create_router(db_url: str | None = None, db_type: str | None = None) -> FastAPI:
    """
    Create an OpenFlow analytics FastAPI app.

    Args:
        db_url: Override the DB URL (e.g. for multi-tenant use cases).
        db_type: Override the DB type ('duckdb', 'sqlite', 'postgres', 'databricks').

    Returns:
        A configured FastAPI app with all analytics routes mounted.
    """
    if db_url:
        settings.db_url = db_url
    if db_type:
        settings.db_type = db_type

    from backend.api import trend, retention, events, paths, conversion, pivot, sessions, ws

    router_app = FastAPI(title="OpenFlow Analytics")
    router_app.include_router(trend.router, prefix="/api")
    router_app.include_router(retention.router, prefix="/api")
    router_app.include_router(events.router, prefix="/api")
    router_app.include_router(paths.router, prefix="/api")
    router_app.include_router(conversion.router, prefix="/api")
    router_app.include_router(pivot.router, prefix="/api")
    router_app.include_router(sessions.router, prefix="/api")
    router_app.include_router(ws.router)

    return router_app
```

**Step 2: Update `backend/__init__.py`**

```python
# backend/__init__.py
from backend.main import create_router

__all__ = ["create_router"]
```

**Step 3: Verify the factory works**

```bash
uv run python -c "from backend import create_router; app = create_router(); print('routes:', len(app.routes))"
```

Expected: prints route count.

**Step 4: Commit**

```bash
git add backend/__init__.py backend/main.py
git commit -m "feat: export create_router() factory for SaaS embedding"
```

---

## Task 7: Update `pyproject.toml` for PyPI packaging

**Files:**
- Modify: `pyproject.toml`

**Step 1: Update `pyproject.toml`**

```toml
[project]
name = "openflow-core"
version = "0.1.0"
description = "OpenFlow Analytics — open source self-hostable analytics dashboard backend"
readme = "README.md"
requires-python = ">=3.12"
license = { text = "MIT" }

# Remove auth-only dependencies: python-jose, slowapi
# Remove email deps: (smtp was for auth)
# Keep all analytics deps

[project.scripts]
serve = "backend.main:main"
seed-duckdb = "seeders.seeder_duckdb:main"
seed-sqlite = "seeders.seeder_sqlite:main"

[tool.uv]
# dev dependencies remain unchanged
```

Remove from `[project.dependencies]`:
- `python-jose[cryptography]`
- `slowapi`
- Any email/SMTP dependencies

**Step 2: Verify install**

```bash
uv sync
uv run python -c "from backend import create_router; print('ok')"
```

Expected: `ok`

**Step 3: Commit**

```bash
git add pyproject.toml
git commit -m "chore: update pyproject.toml for openflow-core PyPI package"
```

---

## Task 8: Add `docker-compose.yml` for self-hosting

**Files:**
- Create: `docker-compose.yml`
- Modify: `Dockerfile` (if needed)

**Step 1: Create `docker-compose.yml`**

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - analytics_data:/data
    environment:
      OPENFLOW_DB_URL: duckdb:////data/analytics.duckdb
      OPENFLOW_DB_TYPE: duckdb
      OPENFLOW_API_KEY: ${OPENFLOW_API_KEY:-}
      OPENFLOW_CORS_ORIGINS: ${OPENFLOW_CORS_ORIGINS:-http://localhost:8000}
      OPENFLOW_DEBUG: "false"
    restart: unless-stopped

volumes:
  analytics_data:
```

**Step 2: Check the existing `Dockerfile`**

Read the existing Dockerfile and ensure it:
- Builds the frontend (`npm run build`)
- Installs Python deps
- Serves from `backend.main:app`
- Copies `dist/` for SPA serving

Fix any path references that changed from `src/` → `frontend/` or `openflow/` → `backend/`.

**Step 3: Test the Docker build**

```bash
docker compose build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add docker-compose.yml Dockerfile
git commit -m "feat: add docker-compose.yml for self-hosting"
```

---

## Task 9: Update README

**Files:**
- Modify: `README.md`

**Step 1: Update `README.md`**

Replace the current README with OSS-focused content:

```markdown
# OpenFlow Analytics

Open source, self-hostable product analytics dashboard.

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/your-org/openflow.git
cd openflow

# Copy env file and configure
cp .env.example .env
# Edit .env: set OPENFLOW_DB_URL to your analytics database

# Start
docker compose up
```

Open http://localhost:8000

## Configuration

| Variable | Default | Description |
|---|---|---|
| `OPENFLOW_DB_URL` | `duckdb:///./analytics.duckdb` | Analytics DB URL |
| `OPENFLOW_DB_TYPE` | `duckdb` | DB type: `duckdb`, `sqlite`, `postgres`, `databricks` |
| `OPENFLOW_API_KEY` | _(empty)_ | API key for the dashboard (leave empty for local dev) |
| `OPENFLOW_CORS_ORIGINS` | `http://localhost:5173` | Allowed origins |
| `OPENFLOW_DEBUG` | `false` | Enable debug mode (shows /docs) |

## Development

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
uv run serve
```

## Use as a package (SaaS embedding)

### Frontend

```bash
npm install @openflow/core
```

```tsx
import { OpenFlowDashboard } from '@openflow/core'

<OpenFlowDashboard apiBaseUrl="https://api.yourapp.com" />
```

### Backend

```bash
pip install openflow-core
```

```python
from openflow_core import create_router

app.include_router(
    create_router(db_url=get_db_for_current_user()),
    prefix="/api"
)
```
```

**Step 2: Create `.env.example`**

```bash
# .env.example
OPENFLOW_DB_URL=duckdb:///./analytics.duckdb
OPENFLOW_DB_TYPE=duckdb
OPENFLOW_API_KEY=
OPENFLOW_CORS_ORIGINS=http://localhost:5173
OPENFLOW_DEBUG=false
```

**Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: update README for OSS self-hosting"
```

---

## Task 10: Final verification

**Step 1: Run all frontend tests**

```bash
npm run test:run
```

Expected: All tests pass.

**Step 2: Run all backend tests**

```bash
uv run pytest backend/tests/ -v
```

Expected: All tests pass.

**Step 3: Full build check**

```bash
npm run build
npm run lint
```

Expected: No errors, no lint warnings.

**Step 4: Smoke test self-hosted mode**

```bash
# Terminal 1
uv run serve

# Terminal 2
npm run dev
```

Open http://localhost:5173 — dashboard should load without any login.

**Step 5: Tag and push**

```bash
git tag v0.1.0
git push origin main --tags
```

---

## After this plan: Create `openflow-saas` repo

Once the OSS repo is clean, create a new private `openflow-saas` repo containing:

1. **Frontend**: Install `@openflow/core`, add back `features/auth/`, `AuthContext`, `ProtectedRoute`, `LandingPage`
2. **Backend**: Install `openflow-core`, add back `core/` (JWT/bcrypt), `api/auth.py`, `services/auth_service.py`, `product_db/`, multi-tenant connection management
3. Mount `<OpenFlowDashboard>` inside the authenticated route
4. Mount `create_router(db_url=get_db_for_user())` inside the authenticated FastAPI app

This is a separate implementation plan to be created for the SaaS repo.
