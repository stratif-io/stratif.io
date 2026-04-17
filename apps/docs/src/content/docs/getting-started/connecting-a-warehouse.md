---
title: Connecting a Warehouse
description: Connect stratif.io to DuckDB, PostgreSQL, ClickHouse, Snowflake, or Databricks
---

Warehouse credentials are encrypted at rest using your `STRATIFIO_ENCRYPTION_KEY`. Connections are managed in the app under **Connections → New Connection**.

## Schema requirements

Regardless of warehouse, stratif.io expects an events table with these columns:

| Column       | Type           | Required |
| ------------ | -------------- | -------- |
| `user_id`    | string         | ✅       |
| `event_name` | string         | ✅       |
| `timestamp`  | timestamp      | ✅       |
| `properties` | JSON or string | optional |
| `traits`     | JSON or string | optional |

Configure which columns map to which fields in the **Schema** tab of the connection.

---

## DuckDB

No extra infrastructure required — DuckDB runs in-process.

**Required fields:**

- **File path** — absolute path to your `.duckdb` file (e.g. `/data/analytics.duckdb`)

The sample data installed by default uses a DuckDB file at `data/dbs/sample.duckdb`.

---

## PostgreSQL

**Required fields:**

- Host
- Port (default: `5432`)
- Database name
- Username
- Password

**Note:** the database user needs `SELECT` access on your events table.

---

## ClickHouse

**Required fields:**

- Host
- Port (default: `8123` — HTTP interface)
- Database
- Username
- Password

**Note:** stratif.io uses the HTTP interface (port 8123), not the native TCP port (9000).

---

## Snowflake

**Required fields:**

- Account identifier (e.g. `xy12345.us-east-1`)
- Warehouse name
- Database
- Schema
- Username
- Password

**Finding your account identifier:** in Snowflake, go to **Admin → Accounts** and copy the account locator.

---

## Databricks

**Required fields:**

- Server hostname (e.g. `adb-1234567890.12.azuredatabricks.net`)
- HTTP path (e.g. `/sql/1.0/warehouses/abc123`)
- Personal access token

**Finding the HTTP path:** in Databricks, go to **SQL Warehouses → your warehouse → Connection Details**.
