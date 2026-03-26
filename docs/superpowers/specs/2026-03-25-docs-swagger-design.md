# Design Spec: Documentation Site + API Reference

**Date:** 2026-03-25
**Status:** Approved
**Scope:** VitePress docs site (GitHub Pages) + Scalar API reference (always-on, served by FastAPI)

---

## 1. Overview

stratif.io needs two documentation surfaces:

1. **Product docs site** — a VitePress static site deployed to GitHub Pages, covering getting started, configuration, architecture, and contributing. Audience: external developers, OSS contributors, and the internal team.
2. **API reference** — a Scalar-powered interactive API reference, always available at `/api/reference` on the running app (dev and production).

---

## 2. API Reference (Scalar)

### What changes

- `/openapi.json` is made always-available (debug gate removed). See security note below.
- FastAPI's built-in Swagger UI (`/docs`) and Redoc (`/redoc`) remain debug-only (superseded by Scalar for all other purposes).
- Scalar is integrated via the `scalar-fastapi` package and mounted at `/api/reference`.
- Scalar is configured with stratif.io brand colors and logo.

### Security note on `/openapi.json`

The current `CLAUDE.md` lists hiding `/openapi.json` in production as a security measure. This spec deliberately removes that gate because stratif.io is an OSS product and a public API reference is a feature, not a risk. The spec itself contains no credentials or secrets — only endpoint shapes. The actual security posture (auth, encryption keys, rate limiting) is unchanged. Self-hosters who want to hide the spec can still do so with a reverse proxy rule.

### Integration

```python
# backend/main.py
from scalar_fastapi import get_scalar_api_reference

@app.get("/api/reference", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url="/openapi.json",
        title="stratif.io API Reference",
    )
```

The `openapi_url` and `openapi_json` debug gates in the `FastAPI(...)` constructor are removed (set to their default non-None values).

### Endpoint summary

| Path | Availability | Purpose |
|---|---|---|
| `/openapi.json` | Always | Machine-readable OpenAPI spec |
| `/api/reference` | Always | Scalar interactive API reference |
| `/docs` | Debug only | Legacy Swagger UI (dev convenience) |
| `/redoc` | Debug only | Legacy Redoc (dev convenience) |

---

## 3. VitePress Docs Site

### Location

`apps/docs/` — a new VitePress project inside the existing monorepo.

### Scripts (added to root `package.json`)

```json
"docs:dev":     "vitepress dev apps/docs",
"docs:build":   "vitepress build apps/docs",
"docs:preview": "vitepress preview apps/docs"
```

### Site structure

```
apps/docs/
├── .vitepress/
│   └── config.ts          # Site config, nav, sidebar, theme
├── index.md               # Home page (hero, features, CTA)
├── getting-started.md     # Quick start: Docker, manual, first connection
├── configuration.md       # All STRATIFIO_* env vars
├── api-reference.md       # Note: links to /api/reference on a self-hosted instance
├── architecture.md        # Two-tier stack overview (based on docs/architecture.md)
└── contributing.md        # Local dev, PR workflow, conventions
```

### API Reference page note

The `api-reference.md` page cannot link to a canonical hosted Scalar endpoint (stratif.io is self-hosted — there is no central production URL). Instead, it:
- Explains that the API reference is served by the running app at `/api/reference`
- Shows the URL pattern: `http://<your-instance>/api/reference`
- Links to the OpenAPI spec download: `http://<your-instance>/openapi.json`
- Embeds or documents key endpoint schemas statically as a convenience

### Theming

- VitePress default theme
- Brand colors from the existing design system (pulled from `design/` or `apps/web/frontend/`)
- Dark mode enabled by default
- Logo: `docs/logo.svg` (confirmed to exist)

### `.gitignore`

Add `apps/docs/.vitepress/dist` to `.gitignore` (the existing `dist/` entry does not cover this path).

---

## 4. GitHub Pages Deployment

### Workflow: `.github/workflows/docs.yml`

- **Trigger:** push to `main`, path filter on `apps/docs/**` and `backend/**`
- **Permissions:** `pages: write`, `id-token: write`, `contents: read`
- **Node version:** hardcoded to `22` (LTS; no `.nvmrc` or `engines` field in the repo)
- **Steps:**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: 22`
  3. `npm ci`
  4. `npm run docs:build`
  5. `actions/upload-pages-artifact@v3` with `path: apps/docs/.vitepress/dist`
  6. `actions/deploy-pages@v4`

- **Output URL:** `https://stratifio.github.io/stratifio-oss/` (custom domain `docs.stratif.io` configurable in GitHub repository settings — outside repo scope)

### OpenAPI spec

- The docs "API Reference" page documents the self-hosted URL pattern — no static spec bundling or sync job required.

---

## 5. Out of Scope

- Custom domain DNS configuration
- Versioned docs
- Full-text search beyond VitePress built-in local search
- Embedding Scalar UI in an iframe within VitePress

---

## 6. Dependencies

| Package | Where | Purpose |
|---|---|---|
| `scalar-fastapi` | Python (backend) | Scalar integration for FastAPI |
| `vitepress` | Node dev dep (`apps/docs`) | Docs site framework |

No new runtime frontend dependencies.
