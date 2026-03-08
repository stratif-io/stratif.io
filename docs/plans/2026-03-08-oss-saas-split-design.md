# OSS / SaaS Split Design

**Date**: 2026-03-08
**Status**: Approved

## Overview

Split OpenFlow into two projects:

- **`openflow`** (public OSS repo) — self-hostable analytics dashboard, single-tenant, Docker Compose
- **`openflow-saas`** (private SaaS repo) — auth + multi-tenancy wrapper that embeds the OSS dashboard

The current repo becomes the OSS repo.

## Repository Structure

### OSS repo (`openflow` — public)

```
openflow/
  frontend/            ← React app → published as @openflow/core on npm
  backend/             ← Python package → published as openflow-core on PyPI
  docker-compose.yml   ← self-hostable deployment
  Dockerfile
```

### SaaS repo (`openflow-saas` — private)

```
openflow-saas/
  frontend/            ← React app: installs @openflow/core, adds auth pages
  backend/             ← FastAPI app: installs openflow-core, adds auth + multi-tenancy
  docker-compose.yml
```

## Boundary Rule

> If it requires knowing *who the user is*, it belongs in SaaS.
> If it's just *analytics on a DB*, it belongs in OSS.

### OSS includes

- All analytics features: dashboard, trends, retention, paths, funnel, pivot, events
- Single-connection config via env vars
- DuckDB + all analytics API routes
- Simple API key auth via `OPENFLOW_API_KEY` env var (for self-hosters)

### SaaS only

- Auth system (JWT, bcrypt, sessions, rate limiting)
- Frontend auth pages (login, register, forgot password, verify email)
- `AuthContext`, `ProtectedRoute`
- Multi-tenant credential encryption + per-user DB isolation
- Connections UI (multi-tenant)
- Landing page
- Product DB (SQLite, multi-tenant)

## Package API

### `@openflow/core` (npm)

Single root component the SaaS mounts inside its authenticated route:

```tsx
import { OpenFlowDashboard } from '@openflow/core'

<OpenFlowDashboard apiBaseUrl="https://api.myapp.com" />
```

The component owns its own router, sidebar, and all analytics pages.

### `openflow-core` (PyPI)

Router factory the SaaS mounts with per-user DB injection:

```python
from openflow_core import create_router

app.include_router(
    create_router(db_url=get_db_for_current_user()),
    prefix="/api"
)
```

## Connection Config (OSS)

Self-hosters configure their analytics DB via env vars — no UI:

```
OPENFLOW_DB_URL=duckdb:///./analytics.db
OPENFLOW_DB_TYPE=duckdb
OPENFLOW_API_KEY=your-secret-key
```

## Local Development

### OSS repo (self-contained)

```bash
cd frontend && npm install && npm run dev
cd backend && uv run serve
```

### SaaS repo (link OSS packages locally)

```bash
# Frontend
cd openflow/frontend && npm link
cd openflow-saas/frontend && npm link @openflow/core

# Backend
cd openflow/backend && pip install -e .
cd openflow-saas/backend && pip install -e ../openflow/backend
```

## CI/CD

- **OSS**: on git tag → publish `@openflow/core` to npm + `openflow-core` to PyPI + push Docker image
- **SaaS**: on merge to main → deploy, pinned to specific OSS versions

## Migration Steps (current repo → OSS repo)

1. Rename `src/` → `frontend/`, `openflow/` → `backend/`
2. Remove auth code: `features/auth/`, `AuthContext`, `ProtectedRoute`, `auth.py`, `product_db/`, `core/` (JWT/password)
3. Replace auth with simple env-var API key (`OPENFLOW_API_KEY`)
4. Replace multi-tenant connection UI with env-var single connection config
5. Export `<OpenFlowDashboard>` root component from `frontend/`
6. Export `create_router()` factory from `backend/`
7. Add `docker-compose.yml` for self-hosting
8. Create `openflow-saas` repo with current auth code + SaaS wrapper
