# OpenFlow Analytics POC

A "Bare Metal" Product Analytics POC built with FastAPI + DuckDB + React + Tremor.

## Why This Stack?

1. **IP Ownership**: We own the entire query engine. No middleware, no black boxes.
2. **Zero Cost**: Runs on a $5 DigitalOcean droplet. No licensing fees.
3. **Flexibility**: Swap DuckDB for Snowflake/ClickHouse by changing one connection string.
4. **Code is Configuration**: Metrics defined in pure SQL.
5. **Modular**: Clean architecture with separate layers (API, DB, Services, Core)

## Project Structure

```
openflow/
├── __init__.py           # Package exports
├── main.py               # FastAPI app entry point
├── config.py             # Settings management
├── core/
│   └── auth.py           # Authentication
├── db/
│   ├── connection.py     # Database connection
│   ├── views.py          # SQL view definitions
│   └── seeder.py         # Test data generation
├── services/
│   └── transpiler.py     # SQL transpilation (sqlglot)
└── api/
    ├── events.py         # Events endpoints
    ├── trend.py          # Trend endpoints
    ├── retention.py      # Retention endpoints
    ├── sessions.py       # Sessions endpoints
    ├── paths.py          # Paths endpoints
    └── conversion.py     # Conversion endpoints
```

## Quick Start

### Backend (with uv)

```bash
# Install uv if you haven't already
# curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
uv pip install -e .

# Run the server (auto-seeds database on first run)
uv run serve
# or
uv run python -m openflow.main
```

The API will be available at `http://localhost:8000`

### Authentication

All API endpoints require an API key. Set it via environment variable:

```bash
export OPENFLOW_API_KEY=your-secret-key
```

Include the key in requests:
```bash
curl -H "X-Api-Key: your-secret-key" http://localhost:8000/api/events
```

### Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENFLOW_API_KEY` | API authentication key | `dev-key-change-in-production` |
| `OPENFLOW_DB_PATH` | Path to DuckDB file | `openflow.duckdb` |
| `OPENFLOW_CORS_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,http://localhost:3000` |
| `OPENFLOW_SEED_USERS` | Number of users to generate | `100` |
| `OPENFLOW_SEED_DAYS` | Days of data to generate | `60` |

## API Endpoints

- `GET /` - API info
- `GET /api/trend` - Event trends (day/week granularity)
- `GET /api/retention` - N-day retention cohorts
- `GET /api/events` - List distinct event names
- `GET /api/raw/events` - Raw events with pagination
- `GET /api/raw/sessions` - Session data
- `GET /api/sessions/summary` - Session statistics
- `GET /api/paths` - User path analysis
- `GET /api/conversion` - Conversion funnel

## Architecture

```
┌─────────────┐     HTTP      ┌──────────────┐     SQL      ┌─────────────┐
│   React     │ ◄────────────► │   FastAPI    │ ◄───────────► │   DuckDB    │
│  + Tremor   │                │   + Python   │               │  (embedded) │
└─────────────┘                └──────────────┘               └─────────────┘
```

## Extending

To add new metrics:
1. Add SQL view to `openflow/db/views.py`
2. Add API endpoint to `openflow/api/`
3. Add visualization to React frontend

That's it. No middleware. No configuration files. Just code.
