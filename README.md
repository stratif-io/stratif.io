# OpenFlow Analytics

Open source, self-hostable product analytics dashboard. Connect your own database, no auth required.

## Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/your-org/openflow.git
cd openflow

# Generate a required encryption key and configure
echo "OPENFLOW_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
# (Skip if you already have a .env — this would overwrite it)

# Build and start (first run seeds ~5 000 sample events automatically)
docker compose up
```

Open **http://localhost:8000**.

On first run, sample analytics data is seeded automatically into `/data/sample.duckdb` inside the container volume. To explore it:

1. Go to **Connections** in the sidebar
2. Add a new connection → choose **DuckDB** → path: `/data/sample.duckdb`
3. Navigate to any analytics page

> To reseed from scratch: `docker compose down -v && docker compose up`

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

| Variable                   | Default                     | Description                                                                |
| -------------------------- | --------------------------- | -------------------------------------------------------------------------- |
| `OPENFLOW_ENCRYPTION_KEY`  | _(required)_                | Key for encrypting stored credentials. Generate: `openssl rand -base64 32` |
| `OPENFLOW_PRODUCT_DB_PATH` | `./openflow_product.sqlite` | SQLite file storing connection configs                                     |
| `OPENFLOW_API_KEY`         | _(empty)_                   | Optional API key for the dashboard (leave empty for local dev)             |
| `OPENFLOW_CORS_ORIGINS`    | `http://localhost:8000`     | Allowed CORS origins                                                       |
| `OPENFLOW_DEBUG`           | `false`                     | Enable `/docs` and `/redoc` endpoints                                      |
| `OPENFLOW_LOG_LEVEL`       | `INFO`                      | Log level                                                                  |

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

;<OpenFlowDashboard />
```

### Backend (`openflow-core`)

```python
from backend import create_router

# Mount analytics routes inside your authenticated app
app.mount("/analytics", create_router())
```
