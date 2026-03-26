# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

stratif.io Analytics — a full-stack product analytics dashboard with a React/TypeScript frontend and Python/FastAPI backend. Connects to any SQL analytics warehouse (DuckDB, BigQuery, Snowflake, Redshift, etc.) via SQLGlot for dialect transpilation.

## Commands

```bash
# Development
npm run dev              # Frontend dev server (port 5173)
uv run serve             # Backend server (port 8000)

# Testing
npm run test:run         # Unit tests once (Vitest)
npm run test             # Unit tests in watch mode
npm run test:coverage    # Unit tests with coverage
npm run test:e2e         # E2E tests (Playwright, multi-browser)
npm run test:e2e:ui      # E2E tests with interactive UI

# Quality checks (run before committing)
npm run lint             # ESLint (zero warnings allowed)
npm run format:check     # Prettier check
npm run build            # TypeScript type-check + production build
```

## Architecture

**Frontend** (`apps/web/frontend/`): React 18, Vite 6, Tailwind CSS v4, shadcn/ui, React Router v6

**Backend** (`stratifio/`): FastAPI, pydantic-settings, SQLGlot for SQL transpilation across analytics warehouses (DuckDB, BigQuery, Snowflake, Redshift, etc.). Product DB (users, connections, credentials) defaults to SQLite in local/dev but can be any SQL database in production.

### Two-tier state management

- **Server state**: TanStack Query v5 — all API data goes through custom hooks (`apps/web/frontend/features/*/hooks/useXxxData.ts`). Never use raw `fetch` in components:
  ```typescript
  // CORRECT
  const { data, isLoading } = useTrendData({ dateRange, selectedEvent, granularity })
  // WRONG — never do this
  useEffect(() => { fetch('/api/trend').then(r => r.json()).then(setData) }, [])
  ```
- **Client state**: Zustand store (`apps/web/frontend/stores/app-store.ts`) — theme, dateRange, sidebarOpen, selectedEvent, selectedDevice. Persisted to localStorage.

### Feature-based structure

Each feature under `apps/web/frontend/features/` is self-contained:
```
apps/web/frontend/features/<feature>/
├── components/       # Feature-specific UI
├── hooks/            # TanStack Query data hooks
└── <Feature>Page.tsx # Page component
```

Shared components live in `apps/web/frontend/components/` (ui/, layout/, charts/, data-table/).

### Backend layers

- `stratifio/api/` — FastAPI routers (trend, retention, events, paths, conversion, pivot, sessions)
- `stratifio/services/` — Business logic (path_analyzer, transpiler)
- `stratifio/db/` — DuckDB connection management and seeding
- `stratifio/core/` — Auth (API key verification)

### API endpoints

All prefixed with `/api/`: `trend`, `retention`, `events`, `events/top`, `raw/events`, `raw/sessions`, `sessions/summary`, `paths`, `conversion`, `pivot`. WebSocket at `/ws`.

## Security (CRITICAL — client database credentials are stored)

stratif.io stores encrypted credentials for client analytics databases. Security is non-negotiable.

### Credential storage
- Credentials encrypted with Fernet (AES-128-CBC + HMAC-SHA256) via `stratifio/services/crypto.py`
- Encryption key: 32+ char string → SHA-256 → Fernet key
- Key stored in `STRATIFIO_ENCRYPTION_KEY` env var (never in code or git)
- Product DB: SQLite at `STRATIFIO_PRODUCT_DB_PATH` (never expose this file)

### Auth
- Passwords: bcrypt + SHA-256 pre-hash (`stratifio/core/password.py`)
- Sessions: JWT in HTTP-only, Secure, SameSite=Lax cookie (`sio_session`)
- Rate limiting on login (10/min) and register (3/min) via slowapi

### Config flags for production
- `STRATIFIO_DEBUG=false` (default) — hides `/docs` and `/redoc` (note: `/openapi.json` and `/api/reference` are always available — stratif.io is OSS and the spec is public)
- `STRATIFIO_ALLOW_REGISTRATION=false` (default) — disables open registration
- `STRATIFIO_CORS_ORIGINS` — set to your exact frontend domain (not `*`)
- `STRATIFIO_ENCRYPTION_KEY` — must be 32+ chars; generate with `openssl rand -base64 32`

### Never do
- Never log credentials, tokens, or the encryption key
- Never commit `.env` files or the SQLite product DB
- Never use `STRATIFIO_DEBUG=true` in production

## Code Conventions

- **Imports**: Use `@/` path alias for `apps/web/frontend/` imports
- **Styling**: Tailwind CSS v4 + `cn()` utility from `apps/web/frontend/lib/utils.ts` for conditional classes
- **Validation**: Zod schemas in `apps/web/frontend/lib/schemas/` for API responses
- **Types**: Defined in `apps/web/frontend/types/index.ts` or co-located with feature
- **API functions**: Centralized in `apps/web/frontend/lib/api/queries.ts`
- **Charts**: Recharts wrappers in `apps/web/frontend/components/charts/`
- **Tests**: Co-located in `__tests__` directories, `*.test.ts(x)` pattern, using `@testing-library/react`
- **Formatting**: Prettier — single quotes, 2-space indent, 100 char width, trailing commas
- **Backend config**: Environment variables prefixed with `STRATIFIO_` (via pydantic-settings in `stratifio/config.py`)

## Git Worktrees

**Never commit directly to `main`.** All work — features, fixes, refactors, even single-line changes — must go through a branch and PR.

Feature work should be done in an isolated worktree, not directly on `main`. Use the `superpowers:using-git-worktrees` skill to set one up — it handles directory selection, `.gitignore` verification, dependency install, and baseline test check automatically. The `.worktrees/` directory is already in `.gitignore`.

After creating a worktree, symlink `.env`:
```bash
ln -s "$(git rev-parse --show-toplevel)/.env" "$WORKTREE_PATH/.env"
```

## Adding a Feature

1. Create `apps/web/frontend/features/<feature>/` with `components/` and `hooks/` subdirectories
2. Add fetch function in `apps/web/frontend/lib/api/queries.ts`
3. Create TanStack Query hook in `hooks/useXxxData.ts`
4. Create page component `<Feature>Page.tsx`
5. Add route in `apps/web/frontend/App.tsx` (lazy-loaded with Suspense)
6. Add nav item in `apps/web/frontend/components/layout/Sidebar.tsx`
7. Add types in `apps/web/frontend/types/index.ts` and Zod schema in `apps/web/frontend/lib/schemas/`

## After a Frontend Change

After any frontend UI change, update the design system to reflect new components, patterns, tokens, or conventions introduced. This keeps the design system in sync with the codebase.

## Adding a SQL Backend Feature

When adding a SQL capability (a new method, query pattern, or dialect-specific behavior), implement it directly in each backend under `backend/backends/<dialect>/`. Never use `if dialect == 'xxx'` branching in shared/service code — dialect differences belong in the backend class, not in callers.

## Adding a Chart

- Feature-specific: create in `apps/web/frontend/features/<feature>/components/`
- Shared/reusable: create in `apps/web/frontend/components/charts/` and export from `apps/web/frontend/components/charts/index.ts`
- Use Recharts primitives, follow existing patterns for tooltips and styling
