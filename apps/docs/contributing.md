# Contributing

## Prerequisites

- Node 22+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (`pip install uv`)
- Docker (for integration tests)

## Local Development

### Backend

```bash
uv run serve
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Docs Site

```bash
npm run docs:dev
```

Docs run at `http://localhost:5173/stratifio-oss/`.

## Running Tests

```bash
npm run test:run       # Frontend unit tests
npm run test:e2e       # E2E tests (Playwright)
uv run pytest         # Backend tests
```

## Branch and PR Workflow

1. Create a branch from `main`
2. Make your changes
3. Run `npm run lint && npm run build` before committing
4. Open a PR — CI runs tests automatically

Never commit directly to `main`.

## Code Conventions

- **Frontend imports:** Use `@/` path alias for `apps/web/frontend/`
- **Styling:** Tailwind CSS v4 + `cn()` from `apps/web/frontend/lib/utils.ts`
- **Server state:** TanStack Query hooks — never raw `fetch` in components
- **Backend config:** Environment variables prefixed with `STRATIFIO_`
- **Dialect-specific SQL:** In `backend/backends/<dialect>/` — never `if dialect ==` in shared code
