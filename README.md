# stratif.io Analytics

**Open-source, self-hostable product analytics. Connect your own database — no vendor lock-in, no auth required.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

![stratif.io Analytics Demo](docs/demo.gif)

▶ [Watch full demo (MP4)](https://github.com/your-org/stratifio/releases/latest/download/stratifio.mp4)

---

## Features

- **Self-hostable** — runs entirely on your infrastructure, one `docker compose up`
- **Bring your own database** — connect DuckDB, SQLite, PostgreSQL, or Databricks
- **No auth required** — ship it internally without building a login system
- **Full analytics suite** — trends, retention, funnels, paths, pivot tables, and sessions
- **Embeddable** — drop the frontend and backend into your own SaaS product
- **Open source** — MIT licensed, no telemetry

---

## Architecture

```
apps/
  web/           # React 18, Vite 6, Tailwind CSS v4, shadcn/ui
    frontend/    # source code
    tests/       # Playwright e2e
  video/         # Remotion demo video
backend/         # FastAPI, DuckDB, SQLGlot
seeders/         # sample data generators
```

---

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/your-org/stratifio.git
cd stratifio

# Generate a required encryption key
echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env

# Build and start — first run seeds ~5,000 sample events automatically
docker compose up
```

Open **http://localhost:8000**.

Sample analytics data is seeded automatically into `/data/sample.duckdb` on first run. To explore it:

1. Go to **Connections** in the sidebar
2. Add a new connection → choose **DuckDB** → path: `/data/sample.duckdb`
3. Navigate to any analytics page

> To reseed from scratch: `docker compose down -v && docker compose up`

---

## Supported Databases

| Database          | Notes                          |
| ----------------- | ------------------------------ |
| **DuckDB**        | Local file or S3-backed        |
| **SQLite**        | Local file                     |
| **PostgreSQL**    | Connection string              |
| **Databricks**    | SQL warehouse via HTTP path    |
| **Snowflake**     | Account identifier + warehouse |
| **ClickHouse**    | Host/port, optional TLS        |

---

## Configuration

| Variable                   | Default                     | Description                                                      |
| -------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `STRATIFIO_ENCRYPTION_KEY`  | _(required)_                | Encrypts stored credentials. Generate: `openssl rand -base64 32` |
| `STRATIFIO_PRODUCT_DB_PATH` | `./stratifio_product.sqlite` | SQLite file storing connection configs                           |
| `STRATIFIO_API_KEY`         | _(empty)_                   | Optional API key for the dashboard (leave empty for local dev)   |
| `STRATIFIO_CORS_ORIGINS`    | `http://localhost:8000`     | Allowed CORS origins                                             |
| `STRATIFIO_DEBUG`           | `false`                     | Enable `/docs` and `/redoc` endpoints                            |
| `STRATIFIO_LOG_LEVEL`       | `INFO`                      | Log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`)                  |

---

## Local Development

```bash
npm install
uv sync

cp .env.example .env
# Set STRATIFIO_ENCRYPTION_KEY in .env

uv run seed-duckdb   # optional — seed sample data

uv run serve         # backend  → http://localhost:8000
npm run dev          # frontend → http://localhost:5173
```

**Testing & quality:**

```bash
npm run test:run          # Frontend unit tests
uv run pytest backend/    # Backend tests
npm run build             # TypeScript + Vite production build
npm run lint              # ESLint (zero warnings)
```

---

## Embedding

stratif.io is designed to be embedded inside a larger product. The frontend and backend are independently mountable.

### Frontend (`@stratifio/core`)

```tsx
import { stratif.ioDashboard } from '@stratifio/core'
;<stratif.ioDashboard />
```

### Backend (`stratifio-core`)

```python
from backend import create_router

# Mount analytics routes inside your authenticated app
app.mount("/analytics", create_router())
```

---

## License

MIT © stratif.io Contributors
