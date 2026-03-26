# Docs Site + API Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Scalar-powered always-on API reference to the FastAPI backend, and a VitePress docs site deployed to GitHub Pages.

**Architecture:** Scalar replaces Swagger UI at `/api/reference` (always available); the OpenAPI JSON is ungated. VitePress lives at `apps/docs/` and is deployed to GitHub Pages via a new Actions workflow triggered on pushes to `main`.

**Tech Stack:** `scalar-fastapi` (Python), VitePress (Node), GitHub Actions `actions/upload-pages-artifact` + `actions/deploy-pages`

---

## Part A: Scalar API Reference

### Task 1: Install `scalar-fastapi`

**Files:**
- Modify: `pyproject.toml`

- [ ] **Step 1: Add dependency**

```bash
uv add scalar-fastapi
```

Expected: `pyproject.toml` updated, `uv.lock` updated.

- [ ] **Step 2: Verify install**

```bash
uv run python -c "from scalar_fastapi import get_scalar_api_reference; print('ok')"
```

Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add pyproject.toml uv.lock
git commit -m "chore: add scalar-fastapi dependency"
```

---

### Task 2: Mount Scalar and ungate OpenAPI JSON

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Read the current FastAPI constructor**

Open `backend/main.py`. Note lines:
```python
app = FastAPI(
    title="stratif.io Analytics",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)
```

- [ ] **Step 2: Ungate `openapi_url`, keep `/docs` and `/redoc` debug-only**

Replace the `FastAPI(...)` constructor with:

```python
app = FastAPI(
    title="stratif.io Analytics",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json",  # always available — OSS product, spec is public
    lifespan=lifespan,
)
```

- [ ] **Step 3: Add Scalar import and route**

At the top of `backend/main.py`, add import after existing imports:
```python
from scalar_fastapi import get_scalar_api_reference
```

After the `app.include_router(mission_control_router)` line, add:
```python
@app.get("/api/reference", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url="/openapi.json",
        title="stratif.io API Reference",
    )
```

- [ ] **Step 4: Start the server and verify**

```bash
uv run serve
```

Open `http://localhost:8000/api/reference` — should show Scalar UI with all API routes listed.
Open `http://localhost:8000/openapi.json` — should return JSON spec.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py
git commit -m "feat: add Scalar API reference at /api/reference, ungate openapi.json"
```

---

## Part B: VitePress Docs Site

### Task 3: Scaffold VitePress in `apps/docs/`

**Files:**
- Create: `apps/docs/package.json`
- Create: `apps/docs/.vitepress/config.ts`
- Create: `apps/docs/index.md`
- Modify: `.gitignore`
- Modify: root `package.json`

- [ ] **Step 1: Create `apps/docs/package.json`**

```json
{
  "name": "stratifio-docs",
  "private": true,
  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview"
  },
  "devDependencies": {
    "vitepress": "^1.6.0"
  }
}
```

- [ ] **Step 2: Install VitePress**

```bash
cd apps/docs && npm install
```

- [ ] **Step 3: Create `.vitepress/config.ts`**

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'stratif.io',
  description: 'Self-hosted product analytics. Your database, your infrastructure, your rules.',
  base: '/stratifio-oss/',  // for GitHub Pages under repo name

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Configuration', link: '/configuration' },
      { text: 'API Reference', link: '/api-reference' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API Reference', link: '/api-reference' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/stratifio/stratifio-oss' },
    ],
    footer: {
      message: 'Released under the MIT License.',
    },
  },
})
```

- [ ] **Step 4: Copy logo asset**

```bash
mkdir -p apps/docs/public
cp docs/logo.svg apps/docs/public/logo.svg
```

- [ ] **Step 5: Create `apps/docs/index.md` (home page)**

```markdown
---
layout: home

hero:
  name: "stratif.io"
  text: "Self-hosted product analytics"
  tagline: Your database, your infrastructure, your rules. No vendor lock-in. No surprise invoices.
  image:
    src: /logo.svg
    alt: stratif.io
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/stratifio/stratifio-oss

features:
  - icon: 📈
    title: Trends
    details: Event counts over time with customizable granularity.
  - icon: 🔁
    title: Retention
    details: Cohort-based retention tables.
  - icon: 🚦
    title: Funnels
    details: Step-by-step conversion analysis.
  - icon: 🗺️
    title: Paths
    details: User journey flows with Sankey diagrams.
  - icon: 🔀
    title: Pivot Tables
    details: Drag-and-drop data exploration.
  - icon: 🔌
    title: Multi-database
    details: DuckDB, PostgreSQL, Snowflake, ClickHouse, BigQuery, Redshift, and more.
---
```

- [ ] **Step 6: Update `.gitignore`**

Add to `.gitignore`:
```
apps/docs/.vitepress/dist
apps/docs/.vitepress/cache
apps/docs/node_modules
```

- [ ] **Step 7: Add scripts to root `package.json`**

In the root `package.json` `scripts` section, add:
```json
"docs:dev": "vitepress dev apps/docs",
"docs:build": "vitepress build apps/docs",
"docs:preview": "vitepress preview apps/docs"
```

- [ ] **Step 8: Run dev server and verify**

```bash
npm run docs:dev
```

Open `http://localhost:5173/stratifio-oss/` — should show the home page with logo, hero text, and feature cards.

- [ ] **Step 9: Commit**

```bash
git add apps/docs/ .gitignore package.json
git commit -m "feat: scaffold VitePress docs site at apps/docs/"
```

---

### Task 4: Add content pages

**Files:**
- Create: `apps/docs/getting-started.md`
- Create: `apps/docs/configuration.md`
- Create: `apps/docs/api-reference.md`
- Create: `apps/docs/architecture.md`
- Create: `apps/docs/contributing.md`

- [ ] **Step 1: Create `getting-started.md`**

```markdown
# Getting Started

## Quick Start (Docker)

```bash
curl -fsSL https://stratif.io/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/stratifio/stratifio-oss.git
cd stratifio-oss
echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
docker compose up
```

Open **http://localhost:8000** when the container is ready.

## First Connection

Sample analytics data (~5,000 events) is seeded automatically into `/data/sample.duckdb`.

1. Go to **Connections → Add**
2. Select **DuckDB**
3. Enter path `/data/sample.duckdb`
4. Click **Connect**

You're ready to explore. Head to **Trends** to start.

## Reseed Sample Data

```bash
docker compose down -v && docker compose up
```

## Local Development

See the [Contributing](./contributing) guide for running the frontend and backend separately.
```

- [ ] **Step 2: Create `configuration.md`**

```markdown
# Configuration

All configuration is via environment variables prefixed with `STRATIFIO_`.

Set them in a `.env` file at the project root, or pass directly to Docker.

## Required

| Variable | Description |
|---|---|
| `STRATIFIO_ENCRYPTION_KEY` | 32+ character key for encrypting database credentials. Generate with `openssl rand -base64 32`. |

## Server

| Variable | Default | Description |
|---|---|---|
| `STRATIFIO_DEBUG` | `false` | Enables `/docs`, `/redoc`, verbose error responses. Never use in production. |
| `STRATIFIO_CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed frontend origins. |
| `STRATIFIO_LOG_LEVEL` | `INFO` | Log level: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `STRATIFIO_LOG_FORMAT` | `json` | Log format: `json` or `console`. |
| `STRATIFIO_LOG_SQL` | `false` | Log all SQL queries (verbose, debug only). |

## Auth

| Variable | Default | Description |
|---|---|---|
| `STRATIFIO_AUTH_ENABLED` | `false` | Set `true` in production to enforce API key auth. |
| `STRATIFIO_API_KEY` | `""` | API key for auth when `AUTH_ENABLED=true`. |
| `STRATIFIO_ALLOW_REGISTRATION` | `false` | Allow new user registration. |

## Database

| Variable | Default | Description |
|---|---|---|
| `STRATIFIO_PRODUCT_DB_PATH` | `./stratifio_product.sqlite` | Path for the SQLite product database (connections, credentials). |
| `STRATIFIO_PRODUCT_DB_URL` | `""` | Full DB URL override (e.g. `postgresql://...`). Takes precedence over `PRODUCT_DB_PATH`. |

## Security Notes

- Never commit your `.env` file or the SQLite product database to git.
- Never use `STRATIFIO_DEBUG=true` in production.
- Set `STRATIFIO_CORS_ORIGINS` to your exact frontend domain — never `*` in production.
```

- [ ] **Step 3: Create `api-reference.md`**

```markdown
# API Reference

The API reference is served interactively by your running stratif.io instance.

## Accessing the Reference

Once stratif.io is running, open:

```
http://<your-instance>/api/reference
```

For local development:

```
http://localhost:8000/api/reference
```

The reference is powered by [Scalar](https://scalar.com/) and includes all endpoints with request/response schemas and a built-in HTTP client.

## OpenAPI Spec

The raw OpenAPI JSON spec is available at:

```
http://<your-instance>/openapi.json
```

You can use this to generate client SDKs or import into tools like Postman or Insomnia.

## Endpoints

| Prefix | Description |
|---|---|
| `GET /api/trend` | Event counts over time |
| `GET /api/retention` | Cohort retention table |
| `GET /api/events` | Event list and top events |
| `GET /api/paths` | User journey paths |
| `GET /api/conversion` | Funnel conversion steps |
| `GET /api/pivot` | Pivot table data |
| `GET /api/sessions` | Session summaries |
| `GET/POST /api/connections` | Connection management |
| `GET /api/health` | Health check |
```

- [ ] **Step 4: Create `architecture.md`**

Base content on `docs/architecture.md`. Copy and adapt for public audience:

```markdown
# Architecture

stratif.io is a two-tier application: a React frontend and a Python/FastAPI backend.

## Stack

**Frontend** (`apps/web/frontend/`): React 18, Vite 6, Tailwind CSS v4, shadcn/ui, React Router v6, TanStack Query v5, Zustand.

**Backend** (`backend/`): FastAPI, SQLGlot for SQL dialect transpilation, pydantic-settings for config, structlog for structured logging.

## Backend Layers

```
backend/
├── api/          HTTP boundary — FastAPI routers
├── services/     Business logic
├── backends/     Database-specific adapters (DuckDB, Postgres, Snowflake, etc.)
├── product_db/   Product database: connections, credentials, config
└── core/         Auth, middleware, logging
```

### Routers

Each analytics feature has its own router: `trend`, `retention`, `events`, `paths`, `conversion`, `pivot`, `sessions`. The `connections` router manages database connection CRUD. The `mission_control` router exposes platform health metrics.

### Database Backends

Each supported analytics database has a backend class under `backend/backends/<dialect>/`. Dialect-specific SQL lives in the backend class — never in shared service code.

### SQL Transpilation

[SQLGlot](https://github.com/tobymao/sqlglot) translates queries across dialects (DuckDB → BigQuery → Snowflake, etc.), letting the same analytics logic run against any supported warehouse.

## Security

Credentials for analytics databases are encrypted with Fernet (AES-128-CBC + HMAC-SHA256) before being stored in the product database. The encryption key is never stored — it is provided at runtime via `STRATIFIO_ENCRYPTION_KEY`.

See [Configuration](./configuration) for production security settings.
```

- [ ] **Step 5: Create `contributing.md`**

```markdown
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
```

- [ ] **Step 6: Run build and verify no errors**

```bash
npm run docs:build
```

Expected: no errors, `apps/docs/.vitepress/dist/` created.

- [ ] **Step 7: Commit**

```bash
git add apps/docs/
git commit -m "docs: add VitePress content pages (getting-started, config, architecture, contributing, api-reference)"
```

---

### Task 5: GitHub Actions deployment workflow

**Files:**
- Create: `.github/workflows/docs.yml`

- [ ] **Step 1: Create `.github/workflows/` directory and workflow**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/docs.yml`:

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - 'apps/docs/**'
      - 'backend/**'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npm run docs:build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/.vitepress/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Enable GitHub Pages in repository settings**

In the GitHub repository:
1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**

> This must be done manually — it cannot be configured from the repo.

- [ ] **Step 3: Commit and push to trigger deploy**

```bash
git add .github/workflows/docs.yml
git commit -m "ci: add GitHub Actions workflow to deploy VitePress docs to GitHub Pages"
git push
```

- [ ] **Step 4: Verify deployment**

Watch the **Actions** tab in GitHub. The `Deploy Docs` workflow should run.
On success, docs will be live at `https://stratifio.github.io/stratifio-oss/`.

---

## Summary

| What | Where |
|---|---|
| Scalar API reference | `http://<instance>/api/reference` |
| OpenAPI JSON spec | `http://<instance>/openapi.json` |
| VitePress docs (local) | `http://localhost:5173/stratifio-oss/` via `npm run docs:dev` |
| VitePress docs (production) | `https://stratifio.github.io/stratifio-oss/` |
