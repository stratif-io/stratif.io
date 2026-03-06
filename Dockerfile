# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
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
COPY openflow ./openflow
COPY pyproject.toml uv.lock ./

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "openflow.main:app", "--host", "0.0.0.0", "--port", "8000"]
