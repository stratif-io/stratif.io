# stratif.io OSS

stratif.io is a full-stack product analytics dashboard with a React/TypeScript frontend and Python/FastAPI backend. It connects to any SQL analytics warehouse (DuckDB, BigQuery, Snowflake, Redshift, etc.) via SQLGlot for dialect transpilation.

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

**Backend** (`stratifio/`): FastAPI, pydantic-settings, SQLGlot for SQL transpilation. Product DB (users, connections, credentials) defaults to SQLite in local/dev but can be any SQL database in production.

### State management

- **Server state**: TanStack Query v5 — all API data goes through custom hooks (`apps/web/frontend/features/*/hooks/useXxxData.ts`). Never use raw `fetch` in components:
  ```typescript
  // CORRECT
  const { data, isLoading } = useTrendData({ dateRange, selectedEvent, granularity })
  // WRONG — never do this
  useEffect(() => {
    fetch('/api/trend')
      .then((r) => r.json())
      .then(setData)
  }, [])
  ```
- **Client state**: Zustand store (`apps/web/frontend/stores/app-store.ts`) — theme, dateRange, sidebarOpen, selectedEvent, selectedDevice. Persisted to localStorage.

### Feature structure

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

## Security

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

### Production config flags

- `STRATIFIO_DEBUG=false` (default) — hides `/docs` and `/redoc`
- `STRATIFIO_ALLOW_REGISTRATION=false` (default) — disables open registration
- `STRATIFIO_CORS_ORIGINS` — set to your exact frontend domain (not `*`)
- `STRATIFIO_ENCRYPTION_KEY` — must be 32+ chars; generate with `openssl rand -base64 32`

### Never do

- Never log credentials, tokens, or the encryption key
- Never commit `.env` files or the SQLite product DB
- Never use `STRATIFIO_DEBUG=true` in production

## Code conventions

- **Imports**: Use `@/` path alias for `apps/web/frontend/` imports
- **Styling**: Tailwind CSS v4 + `cn()` from `apps/web/frontend/lib/utils.ts`
- **Validation**: Zod schemas in `apps/web/frontend/lib/schemas/`
- **Types**: `apps/web/frontend/types/index.ts` or co-located with feature
- **API functions**: `apps/web/frontend/lib/api/queries.ts`
- **Charts**: Recharts wrappers in `apps/web/frontend/components/charts/`
- **Tests**: Co-located in `__tests__/`, `*.test.ts(x)` pattern
- **Formatting**: Prettier — single quotes, 2-space indent, 100 char width, trailing commas
- **Backend config**: Env vars prefixed `STRATIFIO_` via pydantic-settings in `stratifio/config.py`

## Adding a feature

1. Create `apps/web/frontend/features/<feature>/` with `components/` and `hooks/` subdirectories
2. Add fetch function in `apps/web/frontend/lib/api/queries.ts`
3. Create TanStack Query hook in `hooks/useXxxData.ts`
4. Create page component `<Feature>Page.tsx`
5. Add route in `apps/web/frontend/App.tsx` (lazy-loaded with Suspense)
6. Add nav item in `apps/web/frontend/components/layout/Sidebar.tsx`
7. Add types in `apps/web/frontend/types/index.ts` and Zod schema in `apps/web/frontend/lib/schemas/`

## Adding a chart

- Feature-specific: create in `apps/web/frontend/features/<feature>/components/`
- Shared/reusable: create in `apps/web/frontend/components/charts/` and export from its `index.ts`
- Use Recharts primitives; follow existing patterns for tooltips and styling

## Adding a SQL backend feature

Implement directly in each backend under `backend/backends/<dialect>/`. Never use `if dialect == 'xxx'` branching in shared/service code — dialect differences belong in the backend class, not in callers.
