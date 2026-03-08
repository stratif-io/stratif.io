# OpenFlow Analytics

Open source, self-hostable product analytics dashboard. Connect your own database, no auth required.

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/your-org/openflow.git
cd openflow

# Configure environment
cp .env.example .env
# Edit .env: set OPENFLOW_ENCRYPTION_KEY (required) and optionally OPENFLOW_DB_URL

# Start
docker compose up
```

Open http://localhost:8000, go to **Connections**, and add your analytics database.

## Quick Start (Local)

```bash
# Install dependencies
npm install
uv sync

# Copy and configure env
cp .env.example .env
# Set OPENFLOW_ENCRYPTION_KEY in .env

# Seed sample data (optional)
uv run seed-duckdb

# Start backend + frontend
uv run serve       # http://localhost:8000
npm run dev        # http://localhost:5173
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `OPENFLOW_ENCRYPTION_KEY` | _(required)_ | Key for encrypting stored credentials. Generate: `openssl rand -base64 32` |
| `OPENFLOW_PRODUCT_DB_PATH` | `./openflow_product.sqlite` | SQLite file storing connection configs |
| `OPENFLOW_API_KEY` | _(empty)_ | Optional API key for the dashboard (leave empty for local dev) |
| `OPENFLOW_CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `OPENFLOW_DEBUG` | `false` | Enable `/docs` and `/redoc` endpoints |
| `OPENFLOW_LOG_LEVEL` | `INFO` | Log level |

## Supported Databases

- **DuckDB** — local file or S3-backed
- **SQLite** — local file
- **PostgreSQL** — connection string
- **Databricks** — SQL warehouse via HTTP path

## Development

```bash
npm run test:run          # Frontend unit tests
uv run pytest backend/    # Backend tests
npm run build             # TypeScript + Vite production build
npm run lint              # ESLint
```

## Embedding (SaaS use case)

### Frontend (`@openflow/core`)

```tsx
import { OpenFlowDashboard } from '@openflow/core'

<OpenFlowDashboard />
```

### Backend (`openflow-core`)

```python
from backend import create_router

# Mount analytics routes inside your authenticated app
app.mount("/analytics", create_router(db_url=get_db_for_current_user()))
```
