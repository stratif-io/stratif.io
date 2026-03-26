# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
      npm install --no-save \
        @rollup/rollup-linux-arm64-gnu \
        lightningcss-linux-arm64-gnu \
        "@tailwindcss/oxide-linux-arm64-gnu"; \
    else \
      npm install --no-save \
        @rollup/rollup-linux-x64-gnu \
        lightningcss-linux-x64-gnu \
        "@tailwindcss/oxide-linux-x64-gnu"; \
    fi
COPY apps/web/index.html apps/web/tsconfig.json apps/web/tsconfig.node.json \
     apps/web/vite.config.ts apps/web/postcss.config.js ./apps/web/
COPY apps/web/public ./apps/web/public
COPY apps/web/frontend ./apps/web/frontend
RUN npm run build

# ── Stage 2: Build docs ────────────────────────────────────────────────────────
FROM node:20-slim AS docs
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/docs/package.json ./apps/docs/package.json
RUN npm ci
COPY apps/docs ./apps/docs
# Build with /docs/ base so assets resolve correctly when served at /docs/
RUN VITEPRESS_BASE=/docs/ npm run docs:build

# ── Stage 3: Install Python dependencies ──────────────────────────────────────
FROM python:3.12-slim AS python-deps
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev

# ── Stage 4: Final image ──────────────────────────────────────────────────────
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app

# Copy virtualenv from deps stage
COPY --from=python-deps /app/.venv ./.venv

# Copy built frontend
COPY --from=frontend /app/apps/web/dist ./dist

# Copy built docs
COPY --from=docs /app/apps/docs/.vitepress/dist ./docs-dist

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
