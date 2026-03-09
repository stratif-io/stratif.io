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
