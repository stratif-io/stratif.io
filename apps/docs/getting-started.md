# Getting Started

## Quick Start (Docker)

```bash
curl -fsSL https://stratif.io/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/stratifio/stratifio-oss.git
cd stratifio-oss
echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
docker compose up
```

Open **http://localhost:9999** when the container is ready.

## First Connection

Sample analytics data (~5,000 events) is seeded automatically into `/data/sample.duckdb`.

1. Go to **Connections → Add**
2. Select **DuckDB**
3. Enter path `/data/sample.duckdb`
4. Click **Connect**

You're ready to explore. Head to **Trends** to start.

## Reseed Sample Data

```bash
docker compose down -v && docker compose up
```

> **Warning:** `-v` removes the `analytics_data` volume — this deletes all stored connections and credentials, not just the sample data.

## Local Development

See the [Contributing](./contributing) guide for running the frontend and backend separately.
