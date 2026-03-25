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
