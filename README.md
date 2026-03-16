# OpenFlow Analytics

**Open-source, self-hostable product analytics. Connect your own database — no vendor lock-in, no auth required.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

![OpenFlow Analytics Demo](docs/demo.gif)

▶ [Watch full demo (MP4)](https://github.com/your-org/openflow/releases/latest/download/openflow.mp4)

---

## Features

- **Self-hostable** — runs entirely on your infrastructure, one `docker compose up`
- **Bring your own database** — connect DuckDB, SQLite, PostgreSQL, or Databricks
- **No auth required** — ship it internally without building a login system
- **Full analytics suite** — trends, retention, funnels, paths, pivot tables, and sessions
- **Embeddable** — drop the frontend and backend into your own SaaS product
- **Open source** — MIT licensed, no telemetry

---

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/your-org/openflow.git
cd openflow

# Generate a required encryption key
echo "OPENFLOW_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env

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

| Database       | Notes                       |
| -------------- | --------------------------- |
| **DuckDB**     | Local file or S3-backed     |
| **SQLite**     | Local file                  |
| **PostgreSQL** | Connection string           |
| **Databricks** | SQL warehouse via HTTP path |

---

## Configuration

| Variable                   | Default                     | Description                                                      |
| -------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `OPENFLOW_ENCRYPTION_KEY`  | _(required)_                | Encrypts stored credentials. Generate: `openssl rand -base64 32` |
| `OPENFLOW_PRODUCT_DB_PATH` | `./openflow_product.sqlite` | SQLite file storing connection configs                           |
| `OPENFLOW_API_KEY`         | _(empty)_                   | Optional API key for the dashboard (leave empty for local dev)   |
| `OPENFLOW_CORS_ORIGINS`    | `http://localhost:8000`     | Allowed CORS origins                                             |
| `OPENFLOW_DEBUG`           | `false`                     | Enable `/docs` and `/redoc` endpoints                            |
| `OPENFLOW_LOG_LEVEL`       | `INFO`                      | Log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`)                  |

---

## Local Development

```bash
npm install
uv sync

cp .env.example .env
# Set OPENFLOW_ENCRYPTION_KEY in .env

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

OpenFlow is designed to be embedded inside a larger product. The frontend and backend are independently mountable.

### Frontend (`@openflow/core`)

```tsx
import { OpenFlowDashboard } from '@openflow/core'
;<OpenFlowDashboard />
```

### Backend (`openflow-core`)

```python
from backend import create_router

# Mount analytics routes inside your authenticated app
app.mount("/analytics", create_router())
```

---

## License

MIT © OpenFlow Contributors
