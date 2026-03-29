# ── Stage 1: Install JS dependencies (shared) ─────────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/docs/package.json ./apps/docs/package.json
RUN bun install

# ── Stage 2: Build frontend ───────────────────────────────────────────────────
FROM deps AS frontend
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
      bun add --no-save \
        @rollup/rollup-linux-arm64-gnu \
        lightningcss-linux-arm64-gnu \
        "@tailwindcss/oxide-linux-arm64-gnu"; \
    else \
      bun add --no-save \
        @rollup/rollup-linux-x64-gnu \
        lightningcss-linux-x64-gnu \
        "@tailwindcss/oxide-linux-x64-gnu"; \
    fi
COPY apps/web/index.html apps/web/tsconfig.json apps/web/tsconfig.node.json \
     apps/web/vite.config.ts apps/web/postcss.config.js ./apps/web/
COPY apps/web/public ./apps/web/public
COPY apps/web/frontend ./apps/web/frontend
RUN bun run build

# ── Stage 3: Build docs ────────────────────────────────────────────────────────
FROM deps AS docs
COPY apps/docs ./apps/docs
# Build with /docs/ base so assets resolve correctly when served at /docs/
RUN VITEPRESS_BASE=/docs/ bun run docs:build

# ── Stage 4: Install Python dependencies ──────────────────────────────────────
FROM python:3.12-slim AS python-deps
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev

# ── Stage 5: Final image ──────────────────────────────────────────────────────
FROM python:3.12-slim AS app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app

# Copy virtualenv from deps stage
COPY --from=python-deps /app/.venv ./.venv

# Copy built frontend
COPY --from=frontend /app/apps/web/dist ./dist

# Copy application code
COPY backend ./backend
COPY seeders ./seeders
COPY pyproject.toml uv.lock ./
COPY entrypoint.sh ./entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]

# ── Stage 6: Caddy (serves docs directly, proxies everything else) ────────────
FROM caddy:2-alpine AS caddy-server
COPY --from=docs /app/apps/docs/.vitepress/dist /srv/docs
COPY Caddyfile /etc/caddy/Caddyfile
