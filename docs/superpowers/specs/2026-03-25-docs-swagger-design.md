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

- `/openapi.json` is made always-available (debug gate removed).
- FastAPI's built-in Swagger UI (`/docs`) and Redoc (`/redoc`) remain debug-only (or are dropped entirely — they are superseded by Scalar).
- Scalar is integrated via the `scalar-fastapi` package and mounted at `/api/reference`.
- Scalar is configured with stratif.io brand colors and logo.

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

### Endpoint summary

| Path | Availability | Purpose |
|---|---|---|
| `/openapi.json` | Always | Machine-readable OpenAPI spec |
| `/api/reference` | Always | Scalar interactive API reference |
| `/docs` | Debug only | Legacy Swagger UI (kept for dev convenience) |
| `/redoc` | Debug only | Legacy Redoc (kept for dev convenience) |

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
├── api-reference.md       # Links/embeds to /api/reference
├── architecture.md        # Two-tier stack overview (based on docs/architecture.md)
└── contributing.md        # Local dev, PR workflow, conventions
```

### Theming

- VitePress default theme
- Brand colors from the existing design system (pulled from `design/` or `apps/web/frontend/`)
- Dark mode enabled by default
- Logo from `docs/logo.svg`

---

## 4. GitHub Pages Deployment

### Workflow: `.github/workflows/docs.yml`

- **Trigger:** push to `main`, path filter on `apps/docs/**` and `backend/**`
- **Steps:**
  1. Checkout
  2. Setup Node (version from `.nvmrc` or `package.json#engines`)
  3. `npm ci`
  4. `npm run docs:build`
  5. Deploy `apps/docs/.vitepress/dist` to `gh-pages` branch via `actions/deploy-pages`

- **Output URL:** `https://stratifio.github.io/stratifio-oss/` (custom domain `docs.stratif.io` configurable in GitHub settings — outside repo scope)

### OpenAPI spec

- The docs "API Reference" page links to the live Scalar endpoint — no static spec bundling required.
- No automated spec sync job needed.

---

## 5. Out of Scope

- Custom domain DNS configuration
- Versioned docs
- Full-text search beyond VitePress built-in local search
- Embedding the Scalar UI directly in the VitePress page (iframe linking is sufficient)

---

## 6. Dependencies

| Package | Where | Purpose |
|---|---|---|
| `scalar-fastapi` | Python (backend) | Scalar integration for FastAPI |
| `vitepress` | Node dev dep | Docs site framework |

No new runtime frontend dependencies.
