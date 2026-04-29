---
title: Connect stratif.io to Your Data Warehouse
description: Point stratif.io at DuckDB, Snowflake, ClickHouse, Databricks, PostgreSQL, or SQLite. One row per event, a timestamp, a user ID — stratif.io does the rest.
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

Configure which columns map to which fields in the **Dimension Mapping** step of the connection wizard.

---

## DuckDB

No extra infrastructure required — DuckDB runs in-process.

**Required fields:**

- **File path** — absolute path to your `.duckdb` file (e.g. `/data/analytics.duckdb`)

The sample data installed by default uses a DuckDB file at `~/.stratifio/data/sample.duckdb`.

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

---

## Dimension Mapping

After selecting your events table, the **Dimension Mapping** step tells stratif.io which columns in your table correspond to which concepts. Click **Detect from schema** to auto-populate suggestions based on column names — stratif.io uses fuzzy matching against a set of known aliases and will surface likely candidates for you to accept or reject.

### Required fields

These three must be mapped before you can save the connection:

| Field          | What to map                                              | Common column names                           |
| -------------- | -------------------------------------------------------- | --------------------------------------------- |
| **User ID**    | The column that uniquely identifies a user across events | `user_id`, `uid`, `account_id`, `customer_id` |
| **Event Name** | The column containing the action or event type           | `event_name`, `event`, `action`, `event_type` |
| **Timestamp**  | When the event occurred                                  | `timestamp`, `ts`, `created_at`, `event_time` |

### User identity fields

Optional columns that enrich the [People](/analytics/people/) view with a human-readable profile for each user:

| Field             | Description               |
| ----------------- | ------------------------- |
| **Email**         | User's email address      |
| **First Name**    | Given name                |
| **Last Name**     | Family name               |
| **Date of Birth** | Used for age calculations |
| **Phone**         | Phone or mobile number    |

None of these affect analytics queries — they only appear in user profile cards.

### Event properties

Map additional columns as named properties that can be used as filter dimensions across the entire dashboard. Each property has:

- **Name** — the label shown in filter dropdowns and chart tooltips
- **Column** — the source column in your events table
- **Type** — `string`, `number`, `boolean`, or `timestamp`
- **Category** — groups properties in filter menus (Time, User, Geography, Device, Marketing, Event, Metrics)

stratif.io auto-assigns a category based on the column name using pattern matching — for example, columns starting with `utm_` are tagged Marketing, columns matching `country`/`city`/`region` are tagged Geography. You can override any category manually.

Once a property is mapped, toggle the **filter icon** on its row to make it available as a global filter in the filter bar.

---

## Advanced Options

The **Advanced Options** step controls session computation and query execution behaviour. These settings apply per connection.

| Setting                    | Default | Description                                                                                                                                                                        |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Session Timeout**        | 30 min  | Gap between events from the same user that splits them into separate sessions. Increase for long-running or desktop applications; decrease for high-frequency mobile apps.         |
| **Resurrection Window**    | 30 days | A user inactive for longer than this window is considered churned. If they return, they are counted as **Resurrected** rather than **Returning**.                                  |
| **Power User Threshold**   | 4 days  | Users active on at least this many distinct days per period are flagged as [Power Users](/analytics/mission-control/#engagement) in Mission Control.                                |
| **Query Timeout**          | 10 s    | Cancels any warehouse query that exceeds this duration. Increase for large datasets or complex SQL; decrease on shared warehouses where long queries block others. Range: 1–600 s. |
| **Max Concurrent Queries** | 5       | Limits how many queries stratif.io issues simultaneously. Lower this if your warehouse has strict concurrency limits or you share it with other workloads. Range: 1–50.            |
