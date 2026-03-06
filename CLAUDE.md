# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenFlow Analytics — a full-stack product analytics dashboard with a React/TypeScript frontend and Python/FastAPI backend using DuckDB (embedded).

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

**Frontend** (`src/`): React 18, Vite 6, Tailwind CSS v4, shadcn/ui, React Router v6

**Backend** (`openflow/`): FastAPI, DuckDB, pydantic-settings, SQLGlot for SQL transpilation

### Two-tier state management

- **Server state**: TanStack Query v5 — all API data goes through custom hooks (`src/features/*/hooks/useXxxData.ts`). Never use raw `fetch` in components:
  ```typescript
  // CORRECT
  const { data, isLoading } = useTrendData({ dateRange, selectedEvent, granularity })
  // WRONG — never do this
  useEffect(() => { fetch('/api/trend').then(r => r.json()).then(setData) }, [])
  ```
- **Client state**: Zustand store (`src/stores/app-store.ts`) — theme, dateRange, sidebarOpen, selectedEvent, selectedDevice. Persisted to localStorage.

### Feature-based structure

Each feature under `src/features/` is self-contained:
```
src/features/<feature>/
├── components/       # Feature-specific UI
├── hooks/            # TanStack Query data hooks
└── <Feature>Page.tsx # Page component
```

Shared components live in `src/components/` (ui/, layout/, charts/, data-table/).

### Backend layers

- `openflow/api/` — FastAPI routers (trend, retention, events, paths, conversion, pivot, sessions)
- `openflow/services/` — Business logic (path_analyzer, transpiler)
- `openflow/db/` — DuckDB connection management and seeding
- `openflow/core/` — Auth (API key verification)

### API endpoints

All prefixed with `/api/`: `trend`, `retention`, `events`, `events/top`, `raw/events`, `raw/sessions`, `sessions/summary`, `paths`, `conversion`, `pivot`. WebSocket at `/ws`.

## Security (CRITICAL — client database credentials are stored)

OpenFlow stores encrypted credentials for client analytics databases. Security is non-negotiable.

### Credential storage
- Credentials encrypted with Fernet (AES-128-CBC + HMAC-SHA256) via `openflow/services/crypto.py`
- Encryption key: 32+ char string → SHA-256 → Fernet key
- Key stored in `OPENFLOW_ENCRYPTION_KEY` env var (never in code or git)
- Product DB: SQLite at `OPENFLOW_PRODUCT_DB_PATH` (never expose this file)

### Auth
- Passwords: bcrypt + SHA-256 pre-hash (`openflow/core/password.py`)
- Sessions: JWT in HTTP-only, Secure, SameSite=Lax cookie (`of_session`)
- Rate limiting on login (10/min) and register (3/min) via slowapi

### Config flags for production
- `OPENFLOW_DEBUG=false` (default) — hides `/docs`, `/redoc`, `/openapi.json`
- `OPENFLOW_ALLOW_REGISTRATION=false` (default) — disables open registration
- `OPENFLOW_CORS_ORIGINS` — set to your exact frontend domain (not `*`)
- `OPENFLOW_ENCRYPTION_KEY` — must be 32+ chars; generate with `openssl rand -base64 32`

### Never do
- Never log credentials, tokens, or the encryption key
- Never commit `.env` files or the SQLite product DB
- Never use `OPENFLOW_DEBUG=true` in production

## Code Conventions

- **Imports**: Use `@/` path alias for `src/` imports
- **Styling**: Tailwind CSS v4 + `cn()` utility from `src/lib/utils.ts` for conditional classes
- **Validation**: Zod schemas in `src/lib/schemas/` for API responses
- **Types**: Defined in `src/types/index.ts` or co-located with feature
- **API functions**: Centralized in `src/lib/api/queries.ts`
- **Charts**: Recharts wrappers in `src/components/charts/`
- **Tests**: Co-located in `__tests__` directories, `*.test.ts(x)` pattern, using `@testing-library/react`
- **Formatting**: Prettier — single quotes, 2-space indent, 100 char width, trailing commas
- **Backend config**: Environment variables prefixed with `OPENFLOW_` (via pydantic-settings in `openflow/config.py`)

## Adding a Feature

1. Create `src/features/<feature>/` with `components/` and `hooks/` subdirectories
2. Add fetch function in `src/lib/api/queries.ts`
3. Create TanStack Query hook in `hooks/useXxxData.ts`
4. Create page component `<Feature>Page.tsx`
5. Add route in `src/App.tsx` (lazy-loaded with Suspense)
6. Add nav item in `src/components/layout/Sidebar.tsx`
7. Add types in `src/types/index.ts` and Zod schema in `src/lib/schemas/`

## Adding a Chart

- Feature-specific: create in `src/features/<feature>/components/`
- Shared/reusable: create in `src/components/charts/` and export from `src/components/charts/index.ts`
- Use Recharts primitives, follow existing patterns for tooltips and styling
