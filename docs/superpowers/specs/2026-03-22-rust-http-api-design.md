# Rust HTTP API Server — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Context

The project is `stratif.io` Analytics. The Rust code lives in `backend-rs/` inside the monorepo. The existing connector system (`SqlDialect` trait, `DatabaseBackend` trait, `AnyBackend`, `BackendRegistry`, 6 drivers: DuckDB, SQLite, PostgreSQL, Snowflake, ClickHouse, Databricks) is already implemented in `backend-rs/src/connectors/`.

The Python backend at `stratifio/` has ~20 endpoints (all prefixed `/api/`): trend, retention, events (4), sessions (2), paths (3), conversion, pivot (5), mission-control (2). This spec covers a Rust server that provides full parity with those endpoints.

---

## Module Structure

Extend `backend-rs/src/` with:

```
backend-rs/src/
├── api/                        # Axum route handlers (one file per domain)
│   ├── mod.rs
│   ├── trend.rs
│   ├── retention.rs
│   ├── events.rs
│   ├── sessions.rs
│   ├── paths.rs
│   ├── conversion.rs
│   ├── pivot.rs
│   └── mission_control.rs
├── query/                      # Pure SQL builder functions (one file per domain)
│   ├── mod.rs
│   ├── trend.rs
│   ├── retention.rs
│   ├── events.rs
│   ├── sessions.rs
│   ├── paths.rs
│   ├── conversion.rs
│   ├── pivot.rs
│   └── mission_control.rs
├── main.rs                     # Axum server entry point, AppState, router setup
└── lib.rs                      # already exists — add `pub mod api; pub mod query;`
```

---

## AppState

```rust
#[derive(Clone)]
pub struct AppState {
    pub registry: Arc<BackendRegistry>,
    pub product_db: Arc<tokio::sync::Mutex<SqliteHandle>>,  // SqliteHandle from existing SQLite actor
}
```

At startup, open the product DB from the `STRATIFIO_PRODUCT_DB_PATH` env var (defaults to `stratifio_product.db`) using `SqliteBackend::open()` — the same backend already implemented. The product DB stores the `connections` table with encrypted credentials.

---

## Connection Flow Per Request

Every analytics endpoint receives `connection_id: String` as a query parameter. Handler steps:

1. Lock product DB, query `SELECT credentials, driver FROM connections WHERE id = ?`
2. Decrypt credentials using Fernet (`fernet` crate)
3. Call `registry.open(driver, credentials_json)` → `BackendConnection`
4. Run query, close connection

No connection pooling for analytics connections. A fresh connection is opened per request.

---

## HTTP Server

- **Framework:** Axum 0.7
- **Port:** `STRATIFIO_PORT` env var, default `8001` (avoids clash with Python on `8000`)
- **Route prefix:** all routes under `/api/`
- **JSON responses:** same envelope as Python — `{"data": [...]}` or `{"data": {...}}`
- **Errors:** `{"error": "message"}` with appropriate HTTP status code
- **CORS:** `tower-http` `CorsLayer`, allow all origins for now (dev mode)

---

## Query Builders Pattern

All SQL generation lives in `query/` as pure functions. No I/O. Unit-testable without a database.

```rust
// query/trend.rs
pub fn build_trend_query(
    dialect: &dyn SqlDialect,
    event_name: &str,
    granularity: &str,
    start_date: &str,
    end_date: &str,
    filters: &[Filter],
) -> String { ... }
```

Handlers call the builder to get a SQL string, then execute it via `BackendConnection`.

---

## Filters

The `filters` query param is a JSON-encoded array:

```json
[{"property": "country", "operator": "equals", "value": "US"}]
```

Deserialize with `serde`. Build WHERE clause fragments in SQL builders using `SqlDialect` for identifier quoting.

---

## Endpoints Inventory

All endpoints are prefixed with `/api/`.

### Trend

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/trend` | `event_name`, `granularity` (day/week/month/hour), `start_date`, `end_date`, `filters` (JSON array), `connection_id` | `{total_unique_users: int, data: [{date: str, count: int, unique_users: int}]}` |

### Events

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/events` | `connection_id`, `start_date`, `end_date` | `{data: [str]}` |
| GET | `/api/events/top` | `connection_id`, `start_date`, `end_date`, `limit` (default 10) | `{data: [{event_name: str, count: int}]}` |
| GET | `/api/raw/events` | `connection_id`, `start_date`, `end_date`, `event_name` (opt), `user_id` (opt), `limit`, `offset` | `{data: [{...event fields}], total: int, limit: int, offset: int}` |
| GET | `/api/events/user` | `connection_id`, `user_id`, `limit`, `offset` | `{data: [{...}], total: int}` |

### Sessions

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/raw/sessions` | `connection_id`, `start_date`, `end_date`, `limit`, `offset` | `{data: [{session_id, user_id, start_time, end_time, event_count, duration_sec}], total: int}` |
| GET | `/api/sessions/summary` | `connection_id`, `start_date`, `end_date` | `{data: {total_sessions, avg_duration_sec, avg_events_per_session, ...}}` |

### Retention

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/retention` | `connection_id`, `start_date`, `end_date`, `granularity`, `event_name` (opt) | `{data: [{cohort_date, cohort_size, milestones: [{period, retained}]}]}` |

### Paths

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/paths` | `connection_id`, `start_date`, `end_date`, `start_event` (opt), `end_event` (opt), `limit` | `{data: [{path: [str], count: int}]}` |
| GET | `/api/path-analysis` | `connection_id`, `start_date`, `end_date`, `event_name` | `{data: {before: [{event, count}], after: [{event, count}]}}` |
| GET | `/api/path-funnel` | `connection_id`, `steps` (JSON array of str), `start_date`, `end_date` | `{data: [{step, count, pct_of_prev}]}` |

### Conversion

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/conversion` | `connection_id`, `entry_event`, `goal_event`, `start_date`, `end_date` | `{data: {entry_count, converted_count, conversion_rate}}` |

### Pivot

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/pivot/options` | `connection_id` | `{data: {dimensions: [str], metrics: [str]}}` |
| GET | `/api/pivot` | `connection_id`, `rows` (JSON arr), `cols` (JSON arr), `values` (JSON arr), `agg_func`, `start_date`, `end_date` | `{data: [{...}]}` |
| GET | `/api/pivot/grid` | same as `/api/pivot` | `{data: {columns: [...], rows: [...]}}` |
| GET | `/api/pivot/grid/filter-values` | `connection_id`, `field`, `start_date`, `end_date` | `{data: [str]}` |
| POST | `/api/pivot/grid/rows` | Body JSON: `{connection_id, rows, cols, values, agg_func, start_date, end_date, limit, offset, sort_by, sort_dir}` | `{data: [{...}], total: int}` |

### Mission Control

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/api/mission-control` | `connection_id`, `start_date`, `end_date` | `{data: {current: {total_events, unique_users, total_sessions, avg_session_duration_sec, avg_events_per_session, new_users, returning_users, dau_mau_ratio}, previous: {...same keys}}}` |
| GET | `/api/mission-control/trend` | `connection_id`, `metric`, `start_date`, `end_date` | `{data: [{date: str, value: float}]}` |

---

## Testing Strategy

- **Unit tests** for all query builders: spin up an in-memory DuckDB, run the built SQL, assert results. No mocking.
- **Integration tests** for HTTP handlers: use `axum::Router` in test mode (no network), inject a pre-opened DuckDB in-memory connection via a test `AppState`.
- No E2E tests (that is the frontend's responsibility).

---

## Cargo.toml Additions

```toml
axum = "0.7"
tokio = { version = "1", features = ["full"] }  # already present
tower-http = { version = "0.5", features = ["cors"] }
serde = { version = "1", features = ["derive"] }  # already present
serde_json = "1"  # already present
fernet = "0.2"
```
