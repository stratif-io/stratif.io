# Feature Spec: Multi-Tenant Multi-Database Connections

**Product:** Product Analytics Tool  
**Status:** Draft  
**Audience:** Claude Code / Engineering

---

## Overview

Users need to connect multiple event databases to the analytics tool. Each database has a different schema, so users must configure field mappings and filterable properties per connection. All configuration is persisted in the product's own secure internal database.

---

## Goals

- Allow a user to register and manage multiple database connections (DuckDB, Databricks, PostgreSQL, SQLite).
- Let users define the event schema mapping for each connection (user ID, timestamp, event name, custom properties).
- Let users select which fields are available as global filters in the settings page, per connection.
- Store all connection configs and schema mappings securely in the product database, scoped to the authenticated user.

---

## User Stories

### Connection Management

**US-01** — As a user, I can add a new database connection by specifying the connection type and credentials, so that I can start querying my event data.

**US-02** — As a user, I can view, edit, and delete my existing connections, so that I can keep my configuration up to date.

**US-03** — As a user, I can have multiple connections of different database types active simultaneously, so that I can analyze data across environments.

### Schema Mapping

**US-04** — As a user, for each connection I can specify which column represents the `user_id`, so that user-level analysis works correctly.

**US-05** — As a user, for each connection I can specify which column represents the `timestamp`, so that time-series queries are accurate.

**US-06** — As a user, for each connection I can specify which column represents the `event_name`, so that event filtering and funnels work correctly.

**US-07** — As a user, I can define custom properties that map to either flat columns or nested struct paths (e.g., `context.campaign.source`, `properties.page.url`), so that I can work with any event schema.

**US-08** — As a user, I can mark any custom property as "flattened", so that nested struct values are promoted to top-level fields in query results and the UI.

### Global Filter Configuration

**US-09** — As a user, in the connection settings page I can select which fields (from the mapped columns and custom properties) are available as global filters, so that I can control which dimensions are surfaced in the analytics UI.

---

## Data Model

### `connections` table (product DB)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique connection ID |
| `user_id` | UUID (FK → users) | Owner of the connection |
| `name` | TEXT | Human-readable label |
| `db_type` | ENUM | `duckdb`, `databricks`, `postgresql`, `sqlite` |
| `credentials` | JSONB (encrypted) | Connection-specific credentials (see below) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

**`credentials` shape by `db_type`:**

```jsonc
// postgresql
{ "host": "...", "port": 5432, "database": "...", "user": "...", "password": "..." }

// databricks
{ "host": "...", "http_path": "...", "token": "..." }

// duckdb
{ "file_path": "/path/to/db.duckdb" }  // or { "s3_path": "s3://..." }

// sqlite
{ "file_path": "/path/to/db.sqlite" }
```

> **Security note:** `credentials` must be encrypted at rest using the product's secrets management solution (e.g., envelope encryption with a KMS key, never stored in plaintext).

---

### `connection_schema_configs` table (product DB)

One row per connection. Stores the field mapping configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `connection_id` | UUID (FK → connections) | |
| `user_id_field` | TEXT | Column name for user ID (e.g., `user_id`) |
| `timestamp_field` | TEXT | Column name for timestamp (e.g., `event_timestamp`) |
| `event_name_field` | TEXT | Column name for event name (e.g., `event_type`) |
| `custom_properties` | JSONB | Array of custom property definitions (see below) |
| `updated_at` | TIMESTAMPTZ | |

**`custom_properties` JSONB shape:**

```jsonc
[
  {
    "name": "campaign_source",        // Display name / alias
    "path": "context.campaign.source", // Dot-notation path to nested field, or flat column name
    "type": "string",                  // "string" | "number" | "boolean" | "timestamp"
    "flatten": true                    // If true, expose as top-level field in queries/UI
  },
  {
    "name": "revenue",
    "path": "properties.revenue",
    "type": "number",
    "flatten": false
  }
]
```

**Path resolution rules:**
- A path with no dots (e.g., `user_id`) refers to a top-level column.
- A dotted path (e.g., `context.campaign.source`) is resolved as a struct accessor using the database's native syntax:
  - PostgreSQL / DuckDB: `column->>'key'` or `column.key` depending on type
  - Databricks: `column.key`
  - SQLite: `json_extract(column, '$.key.subkey')`
- Flattened properties are aliased at query time so they appear as top-level columns to the UI layer.

---

### `connection_filter_configs` table (product DB)

Stores which fields are enabled as global and local filters, per connection.
Dimensions are **never hardcoded** — every filter dimension is defined here, driven by the schema mapping.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | |
| `connection_id` | UUID (FK → connections) | |
| `user_id` | UUID (FK → users) | |
| `filter_fields` | JSONB | Ordered list of enabled filter field descriptors |
| `updated_at` | TIMESTAMPTZ | |

**`filter_fields` JSONB shape — each entry is an object:**

```jsonc
[
  {
    "field": "country",   // Must match a custom_property.name in connection_schema_configs
    "label": "Country",   // Human-readable label shown in the UI
    "icon": "Globe"       // UI icon key (Globe | Chrome | Monitor | Building | Tag | Layers)
  },
  {
    "field": "browser",
    "label": "Browser",
    "icon": "Chrome"
  }
]
```

The `field` key references a `custom_property.name` from `connection_schema_configs`. The backend
resolves the display column expression at query time via the `path` of that custom property.
**There are no hardcoded dimension names** (e.g., `country`, `browser`) anywhere in the backend —
all filter semantics come entirely from the connection configuration.

---

## API Endpoints

All endpoints require authentication. Resources are scoped to the authenticated user — users cannot access other users' connections.

### Connections

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/connections` | List all connections for the current user |
| `POST` | `/api/connections` | Create a new connection |
| `GET` | `/api/connections/:id` | Get a single connection (no credentials in response) |
| `PATCH` | `/api/connections/:id` | Update connection name or credentials |
| `DELETE` | `/api/connections/:id` | Delete a connection and all its config |
| `POST` | `/api/connections/:id/test` | Test connectivity to the database |

### Schema Config

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/connections/:id/schema` | Get field mapping config |
| `PUT` | `/api/connections/:id/schema` | Create or replace field mapping config |

### Filter Config

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/connections/:id/filters` | Get filter field configuration |
| `PUT` | `/api/connections/:id/filters` | Update filter field configuration |
| `GET` | `/api/filter-options` | Get distinct values for all enabled filter fields of the active connection |

**`GET /api/filter-options?connection_id=:id` response:**

```jsonc
{
  "country": ["US", "UK", "France"],
  "browser": ["Chrome", "Safari", "Firefox"]
}
```

**Generic `filters` query parameter (used by all analytics endpoints):**

Instead of per-dimension query params (e.g. `?country=US&browser=Chrome`), all analytics endpoints
accept a single JSON-encoded `filters` parameter:

```
GET /api/trend?filters={"country":"US","browser":"Chrome"}&start_date=2024-01-01
```

The backend resolves each filter key against the connection's `filter_fields` config, looks up the
matching `custom_property.path` from the schema config, and builds the appropriate SQL expression
(direct column or `json_extract_string`). Unknown filter keys are silently ignored.

---

## Settings UI — Connection Detail Page

The connection detail page has two tabs:

**Tab 1: Schema Mapping**

- Fields to configure: `user_id_field`, `timestamp_field`, `event_name_field` (text inputs with column-name autocomplete from the live schema).
- A "Custom Properties" table where the user can add/edit/remove rows with: `name`, `path`, `type`, `flatten` (toggle).
- A "Detect from schema" button that introspects the connected DB and suggests mappings (best-effort, user must confirm).
- Save button calls `PUT /api/connections/:id/schema`.

**Tab 2: Global Filters**

- Displays all available filter candidates: the three core fields + all defined custom properties.
- User selects (via checkbox or drag-and-drop multi-select) which fields are enabled as global filters.
- Save button calls `PUT /api/connections/:id/filters`.

---

## Query Execution Layer

When the analytics tool runs a query against a connection, it must:

1. Load `connection_schema_configs` for the connection.
2. Build a normalized `events` view that selects:
   - `user_id_field AS user_id`
   - `timestamp_field AS timestamp`
   - `event_name_field AS event_name`
   - All remaining source columns (via `* EXCLUDE`)
3. Load `connection_filter_configs` and for each enabled `filter_field`:
   - Look up the matching `custom_property` by `field` name
   - Resolve its `path` to a SQL expression (flat column or `json_extract_string`)
   - Build a `field → sql_expr` mapping stored on the analytics DB object
4. When a `filters` query parameter arrives (JSON dict of `{field: value}`):
   - For each entry, look up the pre-built SQL expression and append `expr = ?` to WHERE
5. Resolve dotted paths to the database-native struct accessor syntax:
   - No dots → `"column_name"`
   - `col.key` → `json_extract_string("col", 'key')`
   - `col.key.sub` → `json_extract_string("col", '$.key.sub')`

A query builder module per `db_type` should encapsulate the syntax differences. The interface contract is:

```typescript
interface QueryBuilder {
  buildEventQuery(params: {
    schemaConfig: SchemaConfig;
    filters: FilterCondition[];
    dateRange: DateRange;
  }): string; // Returns a SQL string safe to execute on the target DB
}
```

---

## Security Requirements

- Credentials are encrypted before storage using envelope encryption; the plaintext never leaves the application server.
- All API routes enforce row-level ownership: a user can only read/write their own connections.
- Connection test endpoint must run in a sandboxed, read-only context (no DDL/DML allowed).
- Credentials are never returned in API responses; only metadata (name, db_type, created_at) is exposed.
- Input validation: `path` values in custom properties must match the pattern `^[a-zA-Z_][a-zA-Z0-9_.]*$` to prevent injection via struct path resolution.

---

## Out of Scope (v1)

- Sharing connections between users or teams.
- Connection pooling / persistent connection lifecycle management.
- Schema versioning or migration tracking.
- Real-time schema sync / change detection.
- Support for database types beyond the four listed (DuckDB, Databricks, PostgreSQL, SQLite).