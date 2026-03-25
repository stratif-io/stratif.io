# Testing Real Database Connections

Integration tests verify the full connection stack against real databases.
They are skipped by default and activated by setting environment variables.

## Running Integration Tests

```bash
# Run all integration tests (skips any without credentials)
uv run pytest -m integration -v

# Run for a specific backend
uv run pytest -m integration -k postgres -v
```

## Backend Credentials

Set these env vars before running. You can add them to a `.env.test` file
(never commit credentials).

### PostgreSQL
```bash
export TEST_POSTGRES_URL="postgresql://user:pass@host:5432/dbname"
```

### ClickHouse
```bash
export TEST_CLICKHOUSE_URL="clickhouse://user:pass@host:8123/dbname"
# For TLS: use clickhouses://...
```

### Snowflake
```bash
export TEST_SNOWFLAKE_ACCOUNT="xy12345.us-east-1"
export TEST_SNOWFLAKE_USER="MYUSER"
export TEST_SNOWFLAKE_PASSWORD="..."
export TEST_SNOWFLAKE_DATABASE="ANALYTICS"
```

### Databricks
```bash
export TEST_DATABRICKS_HOST="adb-1234567890.12.azuredatabricks.net"
export TEST_DATABRICKS_TOKEN="dapi..."
export TEST_DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/abc123"
```

### SQLite (file-based only)
```bash
export TEST_SQLITE_PATH="/absolute/path/to/your.sqlite"
# NOTE: :memory: is excluded — use unit tests for in-memory SQLite
```

## What Each Test Verifies

Each integration test:
1. Parses credentials from env vars
2. Opens a real connection via `backend.open()`
3. Runs `backend.get_tables()` — verifies the connection can query metadata
4. Runs `backend.execute("SELECT 1", None)` — verifies query execution
5. Closes the connection

This covers the full path: credentials → driver → network → database → result.

## Test Location

Integration tests live in `backend/tests/integration/`. They are marked with
`@pytest.mark.integration` and will be skipped automatically in CI unless
credentials are explicitly provided.
