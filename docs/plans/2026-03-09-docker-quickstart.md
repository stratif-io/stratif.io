# Docker Quickstart Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give OSS users a single `docker compose up` that builds the image, auto-seeds sample DuckDB data on first run, and starts the dashboard ready to explore.

**Architecture:** A bash entrypoint script checks for `/data/sample.duckdb` on startup; if absent it runs `seed-duckdb` with a small dataset before launching uvicorn. Both the SQLite product DB and the DuckDB sample file live in a named Docker volume at `/data`. The compose file wires all required env vars and adds a health check.

**Tech Stack:** Docker multi-stage build (node:20-slim + python:3.12-slim), docker compose v2, bash entrypoint, uv, uvicorn

---

### Task 1: Write the entrypoint script

**Files:**
- Create: `entrypoint.sh`

**Step 1: Create the file**

```bash
#!/usr/bin/env bash
set -euo pipefail

SAMPLE_DB="/data/sample.duckdb"

if [ ! -f "$SAMPLE_DB" ]; then
  echo "[openflow] Seeding sample analytics data (first run)…"
  DB_PATH_PREFIX=/data/sample \
  SEED_USERS=5000 \
  SEED_DAYS=90 \
  seed-duckdb
  echo "[openflow] Seeding complete → $SAMPLE_DB"
fi

exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Step 2: Make it executable**

```bash
chmod +x entrypoint.sh
git add entrypoint.sh
git commit -m "feat(docker): add entrypoint with first-run DuckDB seeding"
```

---

### Task 2: Update the Dockerfile

**Files:**
- Modify: `Dockerfile`

**Step 1: Read the current file** (already done — see above)

**Step 2: Apply changes**

Replace the contents of `Dockerfile` with:

```dockerfile
# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js ./
COPY frontend ./frontend
RUN npm run build

# ── Stage 2: Install Python dependencies ──────────────────────────────────────
FROM python:3.12-slim AS python-deps
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# ── Stage 3: Final image ──────────────────────────────────────────────────────
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app

# Copy virtualenv from deps stage
COPY --from=python-deps /app/.venv ./.venv

# Copy built frontend
COPY --from=frontend /app/dist ./dist

# Copy application code
COPY backend ./backend
COPY seeders ./seeders
COPY pyproject.toml uv.lock ./
COPY entrypoint.sh ./entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
```

Key changes:
- Frontend stage now copies only needed files (not `COPY . .`) — avoids pulling in unrelated files
- `entrypoint.sh` is copied into the image
- `CMD` replaced with `ENTRYPOINT`

**Step 3: Verify the build compiles**

```bash
docker build -t openflow:test .
```

Expected: build succeeds, no errors.

**Step 4: Commit**

```bash
git add Dockerfile
git commit -m "feat(docker): targeted COPY and entrypoint for first-run seeding"
```

---

### Task 3: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Replace contents with**

```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - analytics_data:/data
    environment:
      # Required: generate with `openssl rand -base64 32`
      OPENFLOW_ENCRYPTION_KEY: ${OPENFLOW_ENCRYPTION_KEY}
      OPENFLOW_PRODUCT_DB_PATH: /data/openflow_product.sqlite
      # Optional API key — leave empty for local exploration
      OPENFLOW_API_KEY: ${OPENFLOW_API_KEY:-}
      # CORS: keep as localhost:8000 for single-container local use
      OPENFLOW_CORS_ORIGINS: ${OPENFLOW_CORS_ORIGINS:-http://localhost:8000}
      OPENFLOW_DEBUG: ${OPENFLOW_DEBUG:-false}
      OPENFLOW_LOG_LEVEL: ${OPENFLOW_LOG_LEVEL:-INFO}
      OPENFLOW_LOG_FORMAT: ${OPENFLOW_LOG_FORMAT:-json}
      OPENFLOW_LOG_SQL: ${OPENFLOW_LOG_SQL:-false}
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/api/events')\""]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 60s
    restart: unless-stopped

volumes:
  analytics_data:
```

Notes:
- Health check uses stdlib `urllib` (no `curl` in slim image) hitting `/api/events`
- `start_period: 60s` gives seeding time to finish on first run before health checks begin
- All vars have `${VAR:-default}` so only `OPENFLOW_ENCRYPTION_KEY` is strictly required

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): health check, log vars, and correct CORS default"
```

---

### Task 4: Update .env.example

**Files:**
- Modify: `.env.example`

**Step 1: Replace contents with**

```bash
# ── OpenFlow Analytics — Environment Configuration ────────────────────────────
#
# Quick start:
#   1. Copy this file:  cp .env.example .env
#   2. Set OPENFLOW_ENCRYPTION_KEY (required — see below)
#   3. Run:  docker compose up
#
# ── Connection Credentials Encryption ────────────────────────────────────────
# Required. Encrypts stored database credentials.
# Generate with:  openssl rand -base64 32
OPENFLOW_ENCRYPTION_KEY=<your-secret-key>

# ── Product Database (stores connections & configs) ───────────────────────────
# Docker: set to /data/openflow_product.sqlite (mapped to named volume)
# Local dev: leave as default
OPENFLOW_PRODUCT_DB_PATH=./openflow_product.sqlite

# ── API Key (optional — leave empty for local dev, set in production) ─────────
OPENFLOW_API_KEY=

# ── CORS ──────────────────────────────────────────────────────────────────────
# Docker single-container: http://localhost:8000
# Local dev (split frontend/backend): http://localhost:5173
OPENFLOW_CORS_ORIGINS=http://localhost:8000

# ── Logging ───────────────────────────────────────────────────────────────────
OPENFLOW_LOG_LEVEL=INFO
OPENFLOW_LOG_SQL=false
OPENFLOW_LOG_FORMAT=json

# ── Debug (enables /docs, /redoc — disable in production) ────────────────────
OPENFLOW_DEBUG=false
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: clarify .env.example for Docker vs local dev"
```

---

### Task 5: Update README Docker quickstart

**Files:**
- Modify: `README.md`

**Step 1: Update the Docker Quick Start section**

Find the "Quick Start (Docker)" section and replace with:

```markdown
## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/your-org/openflow.git
cd openflow

# Generate a required encryption key and configure
echo "OPENFLOW_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env

# Build and start (first run seeds ~5k sample events automatically)
docker compose up
```

Open **http://localhost:8000**.

On first run, sample analytics data is seeded automatically into `/data/sample.duckdb` inside the container volume. To explore it:

1. Go to **Connections** in the sidebar
2. Add a new connection → choose **DuckDB** → path: `/data/sample.duckdb`
3. Navigate to any analytics page

> To reseed from scratch: `docker compose down -v && docker compose up`
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update Docker quickstart with seeding note and connection instructions"
```

---

### Task 6: Smoke test end-to-end

**Step 1: Build and run**

```bash
docker compose up --build
```

Expected: image builds, seeding log lines appear (`[openflow] Seeding sample analytics data…`, `[openflow] Seeding complete`), then uvicorn starts.

**Step 2: Check health**

```bash
docker compose ps
```

Expected: `app` service shows `healthy` after ~60–90 seconds.

**Step 3: Verify the app**

Open http://localhost:8000 — dashboard loads.
Go to Connections → add DuckDB at `/data/sample.duckdb` → confirm events appear on the Trend page.

**Step 4: Verify idempotency (seeding skipped on restart)**

```bash
docker compose restart
docker compose logs app | grep "Seeding"
```

Expected: no seeding log lines — `/data/sample.duckdb` already exists.

**Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix(docker): smoke test fixups"
```
