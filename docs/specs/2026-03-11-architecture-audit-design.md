# Architecture Audit — stratif.io OSS + SaaS

**Date**: 2026-03-11
**Scope**: `stratifio/` (OSS) and `stratifio-saas/` (SaaS)
**Approach**: Triage + phased fix — security first, then structural, then quality

---

## Executive Summary

Both projects are well-structured at a high level: feature-based frontend, TanStack Query for server state, Zustand for client state, Fernet encryption for credentials, JWT in HTTP-only cookies. The OSS analytics engine is solid and multi-dialect-aware.

The critical gap is that the analytics API is completely unauthenticated in production SaaS — any caller with a connection UUID can read customer data. Several structural issues create maintenance risk, and the code has quality problems that will slow future development.

---

## Phase 1 — Security (fix first, blocks production)

### 🔴 CRITICAL — All analytics endpoints unauthenticated in SaaS

**Location**: `stratifio-saas/app/main.py`

```python
analytics_app = create_analytics_router()
app.mount("/", analytics_app)
```

The SaaS connections router covers CRUD for `/api/connections`, but the entire analytics surface passes through the mounted sub-app with no JWT check:

- `/api/trend`, `/api/retention`, `/api/sessions`, `/api/events`
- `/api/paths`, `/api/conversion`, `/api/pivot`, `/ws`

Additionally these OSS connection sub-endpoints bypass SaaS auth:

- `GET /api/connections/{id}/schema`
- `GET /api/connections/{id}/filters`
- `GET /api/connections/{id}/filter-options`
- `POST /api/connections/{id}/test`
- `GET /api/connections/{id}/schema/detect`
- `GET /api/connections/{id}/browse`
- `GET /api/connections/{id}/credentials`

Any caller who knows (or guesses) a connection UUID can query real customer analytics data without authentication.

**Fix**: add `get_current_auth_user` as a dependency to `get_analytics_db()` in `backend/services/connection_executor.py`. One change gates all analytics routes simultaneously. The OSS connection sub-endpoints need the same or must be replaced by the SaaS connections router.

---

### 🟡 MEDIUM — Email verification not enforced at login

**Location**: `stratifio-saas/app/services/auth_service.py` → `authenticate_user()`

The function validates the password but does not check `email_verified`. Users can log in immediately after registering without verifying their email address.

**Fix**: check `email_verified` in `authenticate_user()`. Return a distinct sentinel (e.g. `"unverified"`) so the auth router can respond with `403` and a clear message prompting the user to check their inbox.

---

### 🟡 MEDIUM — `users.api_key_hash` is a fake value

**Location**: `stratifio-saas/app/services/auth_service.py` → `_create_users_row()`

```python
api_key_hash = hashlib.sha256(user_id.encode()).hexdigest()
```

The `users` table (an OSS concept) requires a `NOT NULL` `api_key_hash`. SaaS populates it with a deterministic hash of the user UUID — which is derivable from the JWT. If API key auth is ever connected to any route, it would be trivially bypassable. The real fix is removing the OSS `users` table dependency from SaaS (see Phase 2).

---

### 🔵 LOW — `backend/core/auth.py` is dead code but dangerous

**Location**: `stratifio/backend/core/auth.py`

`verify_api_key` is defined but wired to no router. If someone adds `Depends(verify_api_key)` believing it provides SaaS-level protection, it does not — it reads `STRATIFIO_API_KEY` which is empty by default.

**Fix**: remove the file or add a prominent warning comment that it is OSS-only and not connected to SaaS auth.

---

## Phase 2 — Structural

### 🔴 HIGH — `create_router()` returns a `FastAPI` app, not a router

**Location**: `stratifio/backend/main.py`

```python
def create_router() -> FastAPI:
    router_app = FastAPI(title="stratif.io Analytics")
    ...
    return router_app
```

The name says "router" but returns a full sub-application. This means the SaaS layer cannot add middleware (e.g. an auth check) to the analytics sub-app without monkey-patching. Analytics routes also appear twice in the OSS app (once in `app`, once in the sub-app created for SaaS embedding).

**Fix**: rename to `create_analytics_app()` for honesty, or expose the routers as a list so the SaaS can compose them into its own app directly with full middleware control.

---

### 🟡 MEDIUM — SaaS connections CRUD duplicates OSS instead of extending it

**Location**: `stratifio-saas/app/api/connections.py`

All 6 CRUD endpoints are re-implemented with `user_id` scoping. If the OSS connections API evolves, SaaS won't inherit the changes. Sub-endpoints (`/test`, `/schema/detect`, `/browse`, `/credentials`) remain in the OSS router with no auth, creating a split where some endpoints are SaaS-controlled and others are not.

**Fix**: after Phase 1 gates all OSS routes, replace the OSS connections router entirely with the SaaS one. The SaaS connections router becomes the single implementation for all connection endpoints.

---

### 🟡 MEDIUM — Two diverging schema definitions for the same SQLite file

**Locations**: `stratifio/backend/product_db/migrations.py` and `stratifio-saas/app/product_db/migrations.py`

OSS schema has `connections` without `user_id`. SaaS schema has a superset with `user_id`, `auth_users`, `users`. In practice only the SaaS `init_product_db()` runs at SaaS startup — it works — but if someone runs the OSS standalone against the same DB file the schemas conflict.

**Fix**: make the OSS schema the minimal common base (no `user_id` on connections, no auth tables). SaaS migrations add those columns. The divergence becomes explicit and version-controlled.

---

### 🟡 MEDIUM — SaaS duplicates OSS layout components

**Location**: `stratifio-saas/frontend/components/layout/`

`DashboardLayout.tsx` and `Header.tsx` exist in SaaS alongside OSS equivalents in `stratifio/frontend/components/layout/`. The SaaS should import and extend OSS components via the `@stratifio/core` alias, not maintain parallel copies. They will silently diverge.

**Fix**: remove SaaS-local layout components and import from `@stratifio/core/components/layout/`. Customizations should extend rather than copy.

---

### 🔵 LOW — `PathAnalysisTable.tsx` at root of `frontend/`

**Location**: `stratifio/frontend/PathAnalysisTable.tsx`

The only file at the root of `frontend/` that is not an entry point. Should live in `frontend/features/analytics/paths/components/`.

---

### 🔵 LOW — `ErrorBoundary` class component inline in SaaS `App.tsx`

**Location**: `stratifio-saas/frontend/App.tsx`

Mixing a class component into an otherwise functional file. The OSS already has `frontend/components/ErrorBoundary.tsx` — SaaS should import it via `@stratifio/core/components/ErrorBoundary` rather than define its own.

---

## Phase 3 — Code Quality

### 🟡 MEDIUM — `backend/api/connections.py` is 717 lines with 5 responsibilities

Contains: Pydantic models, CRUD endpoints, schema detection (4 dialect-specific implementations ~100 lines each), catalog browsing, and credential masking.

**Fix**: split into a `connections/` subpackage:
- `connections/models.py` — Pydantic models
- `connections/crud.py` — CRUD endpoints
- `connections/schema_detect.py` — per-dialect schema detection
- `connections/browse.py` — catalog/schema/table browsing

---

### 🟡 MEDIUM — `backend/services/connection_executor.py` is 488 lines with mixed concerns

Pool management, CTE building, dialect routing, schema remapping, `AnalyticsDatabase` class, and the FastAPI dependency all in one file.

**Fix**: extract:
- `analytics_db.py` — `AnalyticsDatabase` class + `open_analytics_db()`
- `pool.py` — connection pool (Databricks + PostgreSQL)
- `connection_executor.py` or `dependencies.py` — `get_analytics_db` FastAPI dependency only

---

### 🟡 MEDIUM — Migration system is fragile

**Location**: `stratifio-saas/app/product_db/migrations.py`

Migrations use `suppress(sqlite3.OperationalError)` to detect already-applied statements. Real errors (typos, constraint violations) are silently swallowed. No version table means no way to audit which migrations have run.

**Fix**: add a `schema_migrations` table with a content hash or sequential index per applied statement. Cheap to implement, eliminates silent failure risk.

---

### 🔵 LOW — `_now()` duplicated in 3 files

Defined identically in `backend/api/connections.py`, `app/api/connections.py`, and `app/services/auth_service.py`.

**Fix**: move to `backend/utils.py`, import everywhere.

---

### 🔵 LOW — No tests in SaaS

Auth flows, email sending, connection scoping, JWT cookie handling, and token consumption have no automated coverage. The OSS has a solid test suite.

**Fix**: add pytest tests for at minimum: register → verify → login → access protected route → logout, and connection CRUD with user scoping.

---

### 🔵 LOW — `dist/` still tracked in git (SaaS)

Added to `.gitignore` but `git rm --cached -r dist/` was never run. The directory appears in git status.

**Fix**: `git rm --cached -r stratifio-saas/dist/` and commit.

---

## Priority Stack

| Priority | Phase | Issue |
|---|---|---|
| 🔴 Fix now | 1 | Analytics + OSS connection sub-endpoints unauthenticated |
| 🔴 Fix now | 2 | `create_router()` naming / API mismatch |
| 🟡 Phase 2 | 1 | Email verification not enforced at login |
| 🟡 Phase 2 | 1 | `users.api_key_hash` fake value |
| 🟡 Phase 2 | 2 | SaaS connections duplication / split auth coverage |
| 🟡 Phase 2 | 2 | Schema definition divergence (OSS vs SaaS product DB) |
| 🟡 Phase 2 | 2 | SaaS layout component duplication |
| 🟡 Phase 2 | 3 | `connections.py` 717-line split |
| 🟡 Phase 2 | 3 | `connection_executor.py` 488-line split |
| 🟡 Phase 2 | 3 | Fragile migration system |
| 🔵 Phase 3 | 2 | `PathAnalysisTable.tsx` location |
| 🔵 Phase 3 | 2 | `ErrorBoundary` duplication in SaaS |
| 🔵 Phase 3 | 3 | `_now()` duplication |
| 🔵 Phase 3 | 3 | No SaaS tests |
| 🔵 Phase 3 | 3 | `dist/` still in git |

---

## What is Modern and Working Well

- Feature-based frontend structure with co-located hooks
- TanStack Query for server state, Zustand for client state
- Fernet (AES-128-CBC + HMAC-SHA256) for credential encryption
- JWT in HTTP-only, Secure, SameSite=Lax cookie
- bcrypt + SHA-256 pre-hash for passwords
- Rate limiting on login and registration (slowapi)
- Multi-dialect SQL via `sql_builder.py` helpers
- `resolve.dedupe` in Vite to prevent dual React instance
- SPA fallback via HTTP middleware (correct pattern with mounted sub-app)
- pydantic-settings with `STRATIFIO_` prefix and `extra="ignore"`
- Structured logging via structlog
- `.dockerignore` whitelist pattern keeping build context under 1MB
