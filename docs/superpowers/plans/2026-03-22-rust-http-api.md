# Rust HTTP API Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Rust HTTP API server (Axum) providing ~20 analytics endpoints with full parity to the existing Python/FastAPI backend.

**Architecture:** Axum handlers in `src/api/` delegate SQL generation to pure functions in `src/query/`, which accept `&dyn AnyBackend` (providing dialect-specific SQL methods). Every request opens a fresh analytics connection via the BackendRegistry. The product DB (SQLite) is opened once at startup and stored in AppState.

**Tech Stack:** Rust 2021, Axum 0.7, Tokio, tower-http (CORS), fernet + sha2 (credential decryption), existing connector system (AnyBackend, BackendRegistry).

**Monorepo location:** `backend-rs/` inside the repo root.

---

## Existing Codebase Reference

All paths below are relative to `backend-rs/`.

### Connector layer (`src/connectors/`)

- **`mod.rs`**: Exports `AnyBackend`, `DatabaseBackend`, `SqlDialect`, `BackendConnection`, `BackendRegistry`. `BackendRegistry::default()` registers 6 drivers: `"duckdb"`, `"sqlite"`, `"postgresql"`, `"snowflake"`, `"clickhouse"`, `"databricks"`. Call `registry.get("duckdb")` to get `Result<&dyn AnyBackend>`.

- **`any_backend.rs`**: The `AnyBackend` trait. It has two categories of methods:
  1. **Dialect methods** (all `&self`, synchronous): `dialect_name`, `identifier_quote_char`, `date_trunc(unit, col)`, `date_diff_days(start, end)`, `epoch_diff_seconds(start, end)`, `interval_minutes_exceeded(earlier, later, minutes)`, `cast_to_text(expr)`, `json_extract_string(col, key)`, `extract_hour/day_of_week/year/month/week/quarter(col)`, `string_concat(parts)`, `build_events_cte(source_table, uid_field, ts_field, en_field, custom_props)`, `prepend_events_cte(cte_body, query)`.
  2. **Async I/O methods**: `open_any(Value) -> Result<BackendConnection>`, `execute_any(&mut BackendConnection, &str, Vec<SqlValue>) -> Result<Vec<Row>>`, `get_tables`, `table_exists`, `get_table_columns`, `get_columns_for_browse`, `detect_schema`, `browse`, `is_connection_error`.

- **`types.rs`**: `SqlValue` enum (`Int(i64)`, `Float(f64)`, `Text(String)`, `Bool(bool)`, `Null`), `Row = Vec<SqlValue>`, `ColumnInfo { name, sql_type }`, `SchemaInfo`, `CustomProperty { name, path, prop_type }`, `BrowseNode`.

- **`mod_types.rs`**: `BackendConnection` enum with variants `DuckDb(DuckDbHandle)`, `Sqlite(SqliteHandle)`, `Postgres(...)`, `Snowflake(...)`, `ClickHouse(...)`, `Databricks(...)`.

- **`dialect.rs`**: `SqlDialect` trait (the sync subset of `AnyBackend`). `DatabaseBackend: SqlDialect` adds the async I/O methods. The blanket impl in `any_backend.rs` bridges `DatabaseBackend` -> `AnyBackend`.

- **`drivers/duckdb.rs`**: `DuckDbBackend`, `DuckDbHandle { tx: mpsc::Sender<DuckDbRequest> }` (Clone), `DuckDbCredentials { file_path: Option<String>, s3_path: Option<String> }`. Opens in-memory with `json!({"file_path": ":memory:"})`.

- **`drivers/sqlite.rs`**: `SqliteBackend`, `SqliteHandle { tx: mpsc::Sender<SqliteRequest> }` (Clone), `SqliteCredentials { file_path: String }`. Opens in-memory with `json!({"file_path": ":memory:"})`. **Not re-exported from `connectors/mod.rs`** -- import as `use crate::connectors::drivers::sqlite::{SqliteBackend, SqliteHandle}`.

### Current `src/lib.rs`

```rust
pub mod connectors;
```

### Current `src/main.rs`

```rust
mod connectors;

fn main() {
    println!("stratifio backend");
}
```

### Current `Cargo.toml` dependencies

tokio, async-trait, anyhow, serde, serde_json, duckdb (bundled), rusqlite (bundled), sqlx (postgres), reqwest (json), clickhouse.

---

## Task 1: Cargo deps + shared types + module scaffolding

**Files to modify:**
- `backend-rs/Cargo.toml`
- `backend-rs/src/lib.rs`

**Files to create:**
- `backend-rs/src/api/mod.rs`
- `backend-rs/src/api/error.rs`
- `backend-rs/src/query/mod.rs`

### Steps

- [ ] **1a. Add dependencies to `Cargo.toml`**

Add these lines to `[dependencies]`:

```toml
axum = "0.7"
tower-http = { version = "0.5", features = ["cors"] }
fernet = "0.2"
sha2 = "0.10"
base64 = "0.22"
tower = "0.4"
```

- [ ] **1b. Create `src/api/error.rs`**

File: `backend-rs/src/api/error.rs`

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// Wrapper so handlers can return `Result<_, ApiError>` and use `?` freely.
pub struct ApiError(pub anyhow::Error);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let msg = self.0.to_string();
        tracing::error!("API error: {msg}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response()
    }
}

impl<E: Into<anyhow::Error>> From<E> for ApiError {
    fn from(e: E) -> Self {
        ApiError(e.into())
    }
}

/// Standard envelope: `{ "data": T }`.
#[derive(Serialize)]
pub struct DataResponse<T: Serialize> {
    pub data: T,
}

/// Property filter from query params / JSON body.
#[derive(serde::Deserialize, Clone, Debug)]
pub struct Filter {
    pub property: String,
    pub operator: String,
    pub value: String,
}

impl Filter {
    /// Convert to a SQL WHERE fragment using the dialect's quoting.
    pub fn to_sql(&self, quote: char) -> String {
        let col = format!("{quote}{}{quote}", self.property);
        let val = self.value.replace('\'', "''"); // basic SQL escape
        match self.operator.as_str() {
            "equals" => format!("{col} = '{val}'"),
            "not_equals" => format!("{col} != '{val}'"),
            "contains" => format!("{col} LIKE '%{val}%'"),
            "not_contains" => format!("{col} NOT LIKE '%{val}%'"),
            "greater_than" => format!("{col} > '{val}'"),
            "less_than" => format!("{col} < '{val}'"),
            "is_set" => format!("{col} IS NOT NULL"),
            "is_not_set" => format!("{col} IS NULL"),
            _ => format!("{col} = '{val}'"),
        }
    }
}

/// Build a combined WHERE fragment from a slice of filters.
pub fn filters_to_sql(filters: &[Filter], quote: char) -> String {
    if filters.is_empty() {
        String::new()
    } else {
        let clauses: Vec<String> = filters.iter().map(|f| f.to_sql(quote)).collect();
        format!(" AND {}", clauses.join(" AND "))
    }
}
```

- [ ] **1c. Create `src/api/mod.rs`**

File: `backend-rs/src/api/mod.rs`

```rust
pub mod error;
pub mod state;
pub mod trend;
pub mod events;
pub mod sessions;
pub mod retention;
pub mod paths;
pub mod conversion;
pub mod pivot;
pub mod mission_control;

use axum::Router;
use state::AppState;

/// Build the complete Axum router with all API routes.
pub fn build_router(state: AppState) -> Router {
    use axum::routing::{get, post};

    Router::new()
        .route("/api/trend", get(trend::get_trend))
        .route("/api/events", get(events::get_events))
        .route("/api/events/top", get(events::get_top_events))
        .route("/api/raw/events", get(events::get_raw_events))
        .route("/api/users/:user_id/events", get(events::get_user_events))
        .route("/api/raw/sessions", get(sessions::get_raw_sessions))
        .route("/api/sessions/summary", get(sessions::get_sessions_summary))
        .route("/api/retention", get(retention::get_retention))
        .route("/api/paths", get(paths::get_paths))
        .route("/api/path-analysis", get(paths::get_path_analysis))
        .route("/api/path-funnel", get(paths::get_path_funnel))
        .route("/api/conversion", get(conversion::get_conversion))
        .route("/api/pivot/options", get(pivot::get_pivot_options))
        .route("/api/pivot", post(pivot::post_pivot))
        .route("/api/pivot/grid", post(pivot::post_pivot_grid))
        .route(
            "/api/pivot/grid/filter-values",
            get(pivot::get_pivot_filter_values),
        )
        .route("/api/pivot/grid/rows", post(pivot::post_pivot_grid_rows))
        .route("/api/mission-control", get(mission_control::get_mission_control))
        .route(
            "/api/mission-control/trend",
            get(mission_control::get_mission_control_trend),
        )
        .with_state(state)
}
```

- [ ] **1d. Create `src/query/mod.rs`**

File: `backend-rs/src/query/mod.rs`

```rust
pub mod trend;
pub mod events;
pub mod sessions;
pub mod retention;
pub mod paths;
pub mod conversion;
pub mod pivot;
pub mod mission_control;
```

- [ ] **1e. Update `src/lib.rs`**

Replace contents of `backend-rs/src/lib.rs` with:

```rust
pub mod connectors;
pub mod api;
pub mod query;
```

- [ ] **1f. Create placeholder query modules**

Create each of these files with a placeholder so the project compiles:

`backend-rs/src/query/trend.rs`:
```rust
// Query builder for /api/trend
```

`backend-rs/src/query/events.rs`:
```rust
// Query builders for /api/events, /api/events/top, /api/raw/events
```

`backend-rs/src/query/sessions.rs`:
```rust
// Query builders for /api/raw/sessions, /api/sessions/summary
```

`backend-rs/src/query/retention.rs`:
```rust
// Query builder for /api/retention
```

`backend-rs/src/query/paths.rs`:
```rust
// Query builders for /api/paths, /api/path-analysis, /api/path-funnel
```

`backend-rs/src/query/conversion.rs`:
```rust
// Query builder for /api/conversion
```

`backend-rs/src/query/pivot.rs`:
```rust
// Query builders for /api/pivot/*
```

`backend-rs/src/query/mission_control.rs`:
```rust
// Query builders for /api/mission-control
```

- [ ] **1g. Create placeholder API handler modules**

Each file should have the handler functions that return `StatusCode::NOT_IMPLEMENTED` so the router compiles. They will be filled in by subsequent tasks.

`backend-rs/src/api/trend.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_trend(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

`backend-rs/src/api/events.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_events(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_top_events(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_raw_events(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_user_events(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

`backend-rs/src/api/sessions.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_raw_sessions(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_sessions_summary(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

`backend-rs/src/api/retention.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_retention(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

`backend-rs/src/api/paths.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_paths(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_path_analysis(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_path_funnel(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

`backend-rs/src/api/conversion.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_conversion(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

`backend-rs/src/api/pivot.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_pivot_options(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn post_pivot(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn post_pivot_grid(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_pivot_filter_values(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn post_pivot_grid_rows(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

`backend-rs/src/api/mission_control.rs`:
```rust
use axum::{extract::State, http::StatusCode};
use super::state::AppState;

pub async fn get_mission_control(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}

pub async fn get_mission_control_trend(State(_state): State<AppState>) -> StatusCode {
    StatusCode::NOT_IMPLEMENTED
}
```

- [ ] **1h. Create stub `src/api/state.rs`**

File: `backend-rs/src/api/state.rs`

```rust
use std::sync::Arc;
use crate::connectors::BackendRegistry;
use crate::connectors::BackendConnection;
use crate::connectors::drivers::sqlite::SqliteHandle;

/// Shared application state, passed to every handler via `State<AppState>`.
#[derive(Clone)]
pub struct AppState {
    /// All registered analytics backends (DuckDB, Postgres, Snowflake, etc.).
    pub registry: Arc<BackendRegistry>,
    /// Product database (users, connections, credentials). SQLite actor handle.
    pub product_db: SqliteHandle,
    /// Encryption key for decrypting stored credentials (from STRATIFIO_ENCRYPTION_KEY).
    pub encryption_key: Arc<String>,
}
```

- [ ] **1i. Write tests for `Filter` and `filters_to_sql`**

Add to the bottom of `backend-rs/src/api/error.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filter_equals_to_sql() {
        let f = Filter {
            property: "country".into(),
            operator: "equals".into(),
            value: "US".into(),
        };
        assert_eq!(f.to_sql('"'), r#""country" = 'US'"#);
    }

    #[test]
    fn filter_contains_to_sql() {
        let f = Filter {
            property: "page".into(),
            operator: "contains".into(),
            value: "pricing".into(),
        };
        assert_eq!(f.to_sql('"'), r#""page" LIKE '%pricing%'"#);
    }

    #[test]
    fn filter_sql_injection_escaped() {
        let f = Filter {
            property: "name".into(),
            operator: "equals".into(),
            value: "O'Brien".into(),
        };
        assert_eq!(f.to_sql('"'), r#""name" = 'O''Brien'"#);
    }

    #[test]
    fn filters_to_sql_empty() {
        assert_eq!(filters_to_sql(&[], '"'), "");
    }

    #[test]
    fn filters_to_sql_multiple() {
        let filters = vec![
            Filter { property: "a".into(), operator: "equals".into(), value: "1".into() },
            Filter { property: "b".into(), operator: "not_equals".into(), value: "2".into() },
        ];
        assert_eq!(
            filters_to_sql(&filters, '"'),
            r#" AND "a" = '1' AND "b" != '2'"#
        );
    }

    #[test]
    fn filter_deserialize() {
        let json = r#"{"property":"country","operator":"equals","value":"US"}"#;
        let f: Filter = serde_json::from_str(json).unwrap();
        assert_eq!(f.property, "country");
        assert_eq!(f.operator, "equals");
        assert_eq!(f.value, "US");
    }
}
```

### Verify

```bash
cd backend-rs && cargo test --lib api::error::tests -- --nocapture
```

Expect: 5 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/Cargo.toml backend-rs/src/lib.rs backend-rs/src/api/ backend-rs/src/query/
git commit -m "feat(backend-rs): add axum deps, shared types, and module scaffolding for HTTP API"
```

---

## Task 2: AppState + connection helper

**Files to modify:**
- `backend-rs/src/api/state.rs` (replace stub)

### Steps

- [ ] **2a. Write failing test for `open_analytics_conn`**

Add to `backend-rs/src/api/state.rs` (the stub from Task 1):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt_roundtrip() {
        let key = "test-encryption-key-that-is-32-chars!!";
        let hash = Sha256::digest(key.as_bytes());
        let fernet_key = base64::engine::general_purpose::URL_SAFE.encode(hash);
        let fernet = fernet::Fernet::new(&fernet_key).unwrap();

        let plaintext = r#"{"file_path": ":memory:"}"#;
        let encrypted = fernet.encrypt(plaintext.as_bytes());

        let decrypted = decrypt_credentials(&encrypted, key).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[tokio::test]
    async fn test_open_analytics_conn() {
        use crate::connectors::BackendRegistry;
        use crate::connectors::drivers::sqlite::SqliteBackend;
        use crate::connectors::backend::DatabaseBackend;

        let encryption_key = "test-encryption-key-that-is-32-chars!!";

        // Derive fernet for encrypting test credentials
        let hash = Sha256::digest(encryption_key.as_bytes());
        let fernet_key = base64::engine::general_purpose::URL_SAFE.encode(hash);
        let fernet_inst = fernet::Fernet::new(&fernet_key).unwrap();

        // Create product DB (in-memory SQLite)
        let sqlite_backend = SqliteBackend::new();
        let mut product_conn = DatabaseBackend::open(
            &sqlite_backend,
            &crate::connectors::drivers::sqlite::SqliteCredentials {
                file_path: ":memory:".into(),
            },
        )
        .await
        .unwrap();

        // Extract the SqliteHandle from the BackendConnection
        let product_handle = match &product_conn {
            BackendConnection::Sqlite(h) => h.clone(),
            _ => panic!("expected Sqlite variant"),
        };

        // Create connections table and insert a test row
        DatabaseBackend::execute(
            &sqlite_backend,
            &mut product_conn,
            "CREATE TABLE connections (id TEXT, credentials TEXT, driver TEXT)",
            vec![],
        )
        .await
        .unwrap();

        let creds_json = r#"{"file_path": ":memory:"}"#;
        let encrypted = fernet_inst.encrypt(creds_json.as_bytes());
        let insert_sql = format!(
            "INSERT INTO connections VALUES ('test-conn-1', '{}', 'duckdb')",
            encrypted
        );
        DatabaseBackend::execute(&sqlite_backend, &mut product_conn, &insert_sql, vec![])
            .await
            .unwrap();

        // Build AppState
        let state = AppState {
            registry: Arc::new(BackendRegistry::default()),
            product_db: product_handle,
            encryption_key: Arc::new(encryption_key.to_string()),
        };

        // open_analytics_conn should succeed and return a DuckDB connection
        let (conn, backend) = open_analytics_conn(&state, "test-conn-1").await.unwrap();
        assert_eq!(backend.dialect_name(), "duckdb");
        // Verify we can execute on it
        match conn {
            BackendConnection::DuckDb(_) => {} // correct variant
            _ => panic!("expected DuckDb connection"),
        }
    }
}
```

- [ ] **2b. Run failing test — expect compile error**

```bash
cd backend-rs && cargo test -p stratifio-backend -- api::state::tests::test_open_analytics_conn 2>&1 | head -20
```

Expect: compile error — `open_analytics_conn`, `decrypt_credentials`, `AppState` not yet defined.

- [ ] **2c. Implement `src/api/state.rs` with `open_analytics_conn`**

File: `backend-rs/src/api/state.rs`

```rust
use std::sync::Arc;
use anyhow::{anyhow, Context, Result};
use base64::Engine;
use sha2::{Digest, Sha256};

use crate::connectors::drivers::sqlite::SqliteHandle;
use crate::connectors::mod_types::BackendConnection;
use crate::connectors::types::SqlValue;
use crate::connectors::BackendRegistry;
use crate::connectors::AnyBackend;

/// Shared application state, passed to every handler via `State<AppState>`.
#[derive(Clone)]
pub struct AppState {
    /// All registered analytics backends (DuckDB, Postgres, Snowflake, etc.).
    pub registry: Arc<BackendRegistry>,
    /// Product database (users, connections, credentials). SQLite actor handle.
    pub product_db: SqliteHandle,
    /// Encryption key for decrypting stored credentials (from STRATIFIO_ENCRYPTION_KEY).
    pub encryption_key: Arc<String>,
}

/// Decrypt a Fernet-encrypted credential string using the app's encryption key.
/// The key derivation matches the Python backend: SHA-256 hash of the key string,
/// then URL-safe base64-encode the 32-byte hash to get the Fernet key.
fn decrypt_credentials(encrypted: &str, encryption_key: &str) -> Result<String> {
    let hash = Sha256::digest(encryption_key.as_bytes());
    let fernet_key = base64::engine::general_purpose::URL_SAFE.encode(hash);
    let fernet = fernet::Fernet::new(&fernet_key)
        .ok_or_else(|| anyhow!("invalid fernet key derived from STRATIFIO_ENCRYPTION_KEY"))?;
    let decrypted_bytes = fernet
        .decrypt(encrypted)
        .map_err(|e| anyhow!("fernet decrypt failed: {e}"))?;
    String::from_utf8(decrypted_bytes).context("decrypted credentials are not valid UTF-8")
}

/// Open a fresh analytics database connection for the given `connection_id`.
///
/// 1. Queries the product DB for the connection's `credentials` (encrypted) and `driver` key.
/// 2. Decrypts the credentials using Fernet.
/// 3. Looks up the backend driver in the registry.
/// 4. Opens a new connection via `backend.open_any(...)`.
///
/// Returns the open connection and a reference to the backend (for executing queries and
/// accessing dialect methods).
pub async fn open_analytics_conn<'r>(
    state: &'r AppState,
    connection_id: &str,
) -> Result<(BackendConnection, &'r dyn AnyBackend)> {
    // Query product DB for the active connection.
    let product_db = &state.product_db;
    let rows = crate::connectors::drivers::sqlite::execute_on_handle(
        product_db,
        &format!("SELECT credentials, driver FROM connections WHERE id = '{connection_id}'"),
    )
    .await
    .context("failed to query product DB for connection")?;

    let row = rows
        .first()
        .ok_or_else(|| anyhow!("no analytics connection configured in product DB"))?;

    let encrypted = match &row[0] {
        SqlValue::Text(s) => s.clone(),
        _ => return Err(anyhow!("credentials column is not text")),
    };
    let driver = match &row[1] {
        SqlValue::Text(s) => s.clone(),
        _ => return Err(anyhow!("driver column is not text")),
    };

    let decrypted_json = decrypt_credentials(&encrypted, &state.encryption_key)?;
    let creds_value: serde_json::Value = serde_json::from_str(&decrypted_json)
        .context("decrypted credentials are not valid JSON")?;

    let backend = state.registry.get(&driver)?;
    let conn = backend.open_any(creds_value).await?;

    Ok((conn, backend))
}

/// Convenience: execute a SQL string on the product DB (SQLite handle).
/// This is a thin wrapper used internally.
pub(crate) mod product_db_helpers {
    use super::*;

    /// Execute a query on the SQLite product DB handle and return rows.
    pub async fn execute(handle: &SqliteHandle, sql: &str) -> Result<Vec<crate::connectors::types::Row>> {
        // We use the SqliteBackend's execute through the handle directly.
        // The SqliteHandle sends messages to the actor thread.
        use tokio::sync::oneshot;
        use crate::connectors::drivers::sqlite::SqliteRequest;

        let (tx, rx) = oneshot::channel();
        handle
            .tx
            .send(SqliteRequest::Execute {
                query: sql.to_owned(),
                reply: tx,
            })
            .await
            .map_err(|_| anyhow!("product DB actor channel closed"))?;
        rx.await.map_err(|_| anyhow!("product DB actor dropped reply"))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt_roundtrip() {
        let key = "test-encryption-key-that-is-32-chars!!";
        let hash = Sha256::digest(key.as_bytes());
        let fernet_key = base64::engine::general_purpose::URL_SAFE.encode(hash);
        let fernet = fernet::Fernet::new(&fernet_key).unwrap();

        let plaintext = r#"{"file_path": ":memory:"}"#;
        let encrypted = fernet.encrypt(plaintext.as_bytes());

        let decrypted = decrypt_credentials(&encrypted, key).unwrap();
        assert_eq!(decrypted, plaintext);
    }
}
```

- [ ] **2d. Add `execute_on_handle` helper to the sqlite driver**

The `open_analytics_conn` function needs to execute raw SQL on the product DB's `SqliteHandle` without going through the `DatabaseBackend` trait (which requires `&mut BackendConnection`). Add this public helper function at the end of `backend-rs/src/connectors/drivers/sqlite.rs` (before the `#[cfg(test)]` blocks):

```rust
/// Execute a query on a bare SqliteHandle (used for product DB queries).
pub async fn execute_on_handle(
    handle: &SqliteHandle,
    sql: &str,
) -> anyhow::Result<Vec<Row>> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    handle
        .tx
        .send(SqliteRequest::Execute {
            query: sql.to_owned(),
            reply: tx,
        })
        .await
        .map_err(|_| anyhow::anyhow!("sqlite actor channel closed"))?;
    rx.await
        .map_err(|_| anyhow::anyhow!("sqlite actor dropped reply"))?
}
```

Note: `SqliteRequest` is `pub(crate)`, so this function must live inside the `drivers::sqlite` module.

- [ ] **2e. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- api::state::tests 2>&1
```

Expect: both `test_decrypt_roundtrip` and `test_open_analytics_conn` pass.

### Verify

```bash
cd backend-rs && cargo test --lib api::state::tests -- --nocapture
```

Expect: 2 tests pass (decrypt roundtrip + integration).

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/api/state.rs backend-rs/src/connectors/drivers/sqlite.rs
git commit -m "feat(backend-rs): implement AppState and open_analytics_conn with credential decryption"
```

---

## Task 3: main.rs server skeleton

**Files to modify:**
- `backend-rs/src/main.rs`

### Steps

- [ ] **3a. Replace `src/main.rs` with full server startup**

File: `backend-rs/src/main.rs`

```rust
use std::sync::Arc;

use stratifio_backend::api::{build_router, state::AppState};
use stratifio_backend::connectors::BackendRegistry;
use stratifio_backend::connectors::drivers::sqlite::{SqliteBackend, SqliteCredentials};
use stratifio_backend::connectors::backend::DatabaseBackend;
use stratifio_backend::connectors::mod_types::BackendConnection;

use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    // Read configuration from environment
    let host = std::env::var("STRATIFIO_HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let port: u16 = std::env::var("STRATIFIO_PORT")
        .unwrap_or_else(|_| "8000".into())
        .parse()
        .expect("STRATIFIO_PORT must be a valid u16");
    let encryption_key = std::env::var("STRATIFIO_ENCRYPTION_KEY")
        .expect("STRATIFIO_ENCRYPTION_KEY must be set");
    let product_db_path = std::env::var("STRATIFIO_PRODUCT_DB_PATH")
        .unwrap_or_else(|_| "stratifio_product.db".into());

    // Open product database
    let sqlite_backend = SqliteBackend::new();
    let product_conn = DatabaseBackend::open(
        &sqlite_backend,
        &SqliteCredentials {
            file_path: product_db_path.clone(),
        },
    )
    .await
    .expect("failed to open product database");

    let product_handle = match product_conn {
        BackendConnection::Sqlite(h) => h,
        _ => panic!("expected Sqlite connection for product DB"),
    };

    // Build app state
    let state = AppState {
        registry: Arc::new(BackendRegistry::default()),
        product_db: product_handle,
        encryption_key: Arc::new(encryption_key),
    };

    // CORS layer
    let cors_origins = std::env::var("STRATIFIO_CORS_ORIGINS").unwrap_or_default();
    let cors = if cors_origins.is_empty() || cors_origins == "*" {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        let origins: Vec<_> = cors_origins
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let app = build_router(state).layer(cors);

    let addr = format!("{host}:{port}");
    println!("stratifio-backend listening on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind");
    axum::serve(listener, app).await.expect("server error");
}
```

### Verify

```bash
cd backend-rs && cargo build --bin stratifio-backend
```

This should compile successfully. (Running it requires env vars, so just verify build.)

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/main.rs
git commit -m "feat(backend-rs): implement main.rs with Axum server startup and CORS"
```

---

## Task 4: Trend query builder + handler

**Files to modify:**
- `backend-rs/src/query/trend.rs` (replace placeholder)
- `backend-rs/src/api/trend.rs` (replace placeholder)

### Steps

- [ ] **4a. Write failing tests for `src/query/trend.rs`**

Add to `backend-rs/src/query/trend.rs` (the placeholder file from Task 1):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;

    /// Open an in-memory DuckDB and return (conn, &'static dyn AnyBackend).
    /// Leaks the registry so the backend reference is 'static -- only for tests.
    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed_events(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT,
                    event_name TEXT,
                    timestamp TIMESTAMP,
                    properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        let inserts = [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-16 09:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'page_view', '2024-01-17 14:00:00', '{}')",
        ];
        for sql in inserts {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_build_trend_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed_events(&mut conn, backend).await;

        let sql = build_trend_query(
            backend,
            "page_view",
            "day",
            "2024-01-01",
            "2024-02-01",
            &[],
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        // 3 distinct days with page_view events
        assert_eq!(rows.len(), 3);
    }

    #[tokio::test]
    async fn test_build_trend_total_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed_events(&mut conn, backend).await;

        let sql = build_trend_total_query(
            backend,
            "page_view",
            "2024-01-01",
            "2024-02-01",
            &[],
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        // 3 unique users with page_view
        use crate::connectors::types::SqlValue;
        match &rows[0][0] {
            SqlValue::Int(n) => assert_eq!(*n, 3),
            other => panic!("expected Int, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_trend_with_filter() {
        let (mut conn, backend) = make_duckdb().await;
        seed_events(&mut conn, backend).await;

        let filters = vec![Filter {
            property: "user_id".into(),
            operator: "equals".into(),
            value: "u1".into(),
        }];
        let sql = build_trend_query(
            backend,
            "page_view",
            "day",
            "2024-01-01",
            "2024-02-01",
            &filters,
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        // u1 has page_view on Jan 15 and Jan 16
        assert_eq!(rows.len(), 2);
    }
}
```

- [ ] **4b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::trend::tests 2>&1 | head -20
```

Expect: compile error — `build_trend_query`, `build_trend_total_query` not yet defined.

- [ ] **4c. Implement `src/query/trend.rs`**

File: `backend-rs/src/query/trend.rs`

```rust
use crate::api::error::{filters_to_sql, Filter};
use crate::connectors::AnyBackend;

/// Build a time-series trend query.
/// Returns SQL that produces rows: (date TEXT, count INT, unique_users INT).
pub fn build_trend_query(
    backend: &dyn AnyBackend,
    event_name: &str,
    granularity: &str,
    start_date: &str,
    end_date: &str,
    filters: &[Filter],
) -> String {
    let date_expr = backend.date_trunc(granularity, "timestamp");
    let q = backend.identifier_quote_char();
    let filter_sql = filters_to_sql(filters, q);
    let event_escaped = event_name.replace('\'', "''");

    format!(
        "SELECT {date_expr} AS date, \
         COUNT(*) AS count, \
         COUNT(DISTINCT user_id) AS unique_users \
         FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}' \
         AND event_name = '{event_escaped}'\
         {filter_sql} \
         GROUP BY 1 ORDER BY 1"
    )
}

/// Build aggregate totals query for the same period.
/// Returns SQL that produces one row: (total_unique_users INT).
pub fn build_trend_total_query(
    backend: &dyn AnyBackend,
    event_name: &str,
    start_date: &str,
    end_date: &str,
    filters: &[Filter],
) -> String {
    let q = backend.identifier_quote_char();
    let filter_sql = filters_to_sql(filters, q);
    let event_escaped = event_name.replace('\'', "''");

    format!(
        "SELECT COUNT(DISTINCT user_id) AS total_unique_users \
         FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}' \
         AND event_name = '{event_escaped}'\
         {filter_sql}"
    )
}
```

- [ ] **4d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::trend::tests 2>&1
```

Expect: 3 tests pass.

- [ ] **4e. Implement `src/api/trend.rs`**

File: `backend-rs/src/api/trend.rs`

```rust
use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse, Filter};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::trend::{build_trend_query, build_trend_total_query};

#[derive(Deserialize)]
pub struct TrendParams {
    pub connection_id: String,
    pub event_name: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_granularity")]
    pub granularity: String,
    #[serde(default)]
    pub filters: Option<String>, // JSON-encoded Vec<Filter>
}

fn default_granularity() -> String {
    "day".into()
}

#[derive(Serialize)]
pub struct TrendPoint {
    pub date: String,
    pub count: i64,
    pub unique_users: i64,
}

#[derive(Serialize)]
pub struct TrendResponse {
    pub series: Vec<TrendPoint>,
    pub total_unique_users: i64,
}

pub async fn get_trend(
    State(state): State<AppState>,
    Query(params): Query<TrendParams>,
) -> Result<Json<DataResponse<TrendResponse>>, ApiError> {
    let filters: Vec<Filter> = match &params.filters {
        Some(s) if !s.is_empty() => serde_json::from_str(s)?,
        _ => vec![],
    };

    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;

    // Time-series query
    let sql = build_trend_query(
        backend,
        &params.event_name,
        &params.granularity,
        &params.start_date,
        &params.end_date,
        &filters,
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let series: Vec<TrendPoint> = rows
        .into_iter()
        .map(|row| TrendPoint {
            date: match &row[0] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            },
            count: match &row[1] {
                SqlValue::Int(n) => *n,
                _ => 0,
            },
            unique_users: match &row[2] {
                SqlValue::Int(n) => *n,
                _ => 0,
            },
        })
        .collect();

    // Total query
    let total_sql = build_trend_total_query(
        backend,
        &params.event_name,
        &params.start_date,
        &params.end_date,
        &filters,
    );
    let total_rows = backend.execute_any(&mut conn, &total_sql, vec![]).await?;
    let total_unique_users = total_rows
        .first()
        .and_then(|r| match &r[0] {
            SqlValue::Int(n) => Some(*n),
            _ => None,
        })
        .unwrap_or(0);

    Ok(Json(DataResponse {
        data: TrendResponse {
            series,
            total_unique_users,
        },
    }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::trend::tests -- --nocapture
```

Expect: 3 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/trend.rs backend-rs/src/api/trend.rs
git commit -m "feat(backend-rs): implement trend query builder and handler"
```

---

## Task 5: Events query builders + handlers

**Files to modify:**
- `backend-rs/src/query/events.rs` (replace placeholder)
- `backend-rs/src/api/events.rs` (replace placeholder)

### Steps

- [ ] **5a. Write failing tests for `src/query/events.rs`**

Add to `backend-rs/src/query/events.rs` (the placeholder):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;
    use crate::connectors::types::SqlValue;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'purchase', '2024-01-16 14:00:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_distinct_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_distinct_events_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 3); // page_view, purchase, sign_up
    }

    #[tokio::test]
    async fn test_top_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_top_events_query(backend, "2024-01-01", "2024-02-01", 2);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
        // First should be page_view (2 occurrences)
        match &rows[0][0] {
            SqlValue::Text(s) => assert_eq!(s, "page_view"),
            other => panic!("expected Text, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_raw_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let (data_sql, count_sql) = build_raw_events_queries(
            backend,
            "2024-01-01",
            "2024-02-01",
            Some("page_view"),
            None,
            &[],
            10,
            0,
        );
        let rows = backend.execute_any(&mut conn, &data_sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
        let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await.unwrap();
        match &count_rows[0][0] {
            SqlValue::Int(n) => assert_eq!(*n, 2),
            other => panic!("expected Int, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_user_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let (data_sql, count_sql) = build_user_events_queries(backend, "u1", 10, 0);
        let rows = backend.execute_any(&mut conn, &data_sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2); // u1 has page_view + sign_up
        let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await.unwrap();
        match &count_rows[0][0] {
            SqlValue::Int(n) => assert_eq!(*n, 2),
            other => panic!("expected Int, got {other:?}"),
        }
    }
}
```

- [ ] **5b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::events::tests 2>&1 | head -20
```

Expect: compile error — query functions not yet defined.

- [ ] **5c. Implement `src/query/events.rs`**

File: `backend-rs/src/query/events.rs`

```rust
use crate::api::error::{filters_to_sql, Filter};
use crate::connectors::AnyBackend;

/// Distinct event names in the date range.
pub fn build_distinct_events_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    format!(
        "SELECT DISTINCT event_name FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}' \
         ORDER BY event_name"
    )
}

/// Top N events by count.
pub fn build_top_events_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    limit: u32,
) -> String {
    format!(
        "SELECT event_name, COUNT(*) AS count FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}' \
         GROUP BY event_name ORDER BY count DESC LIMIT {limit}"
    )
}

/// Raw events with optional event_name, user_id filters plus generic filters.
/// Returns (data_query, count_query).
pub fn build_raw_events_queries(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    event_name: Option<&str>,
    user_id: Option<&str>,
    filters: &[Filter],
    limit: u32,
    offset: u32,
) -> (String, String) {
    let q = backend.identifier_quote_char();
    let mut where_clauses = format!(
        "timestamp >= '{start_date}' AND timestamp < '{end_date}'"
    );
    if let Some(en) = event_name {
        let escaped = en.replace('\'', "''");
        where_clauses.push_str(&format!(" AND event_name = '{escaped}'"));
    }
    if let Some(uid) = user_id {
        let escaped = uid.replace('\'', "''");
        where_clauses.push_str(&format!(" AND user_id = '{escaped}'"));
    }
    where_clauses.push_str(&filters_to_sql(filters, q));

    let data = format!(
        "SELECT timestamp, user_id, event_name, properties \
         FROM events WHERE {where_clauses} \
         ORDER BY timestamp DESC LIMIT {limit} OFFSET {offset}"
    );
    let count = format!(
        "SELECT COUNT(*) AS total FROM events WHERE {where_clauses}"
    );
    (data, count)
}

/// Events for a specific user (paginated).
/// Returns (data_query, count_query).
pub fn build_user_events_queries(
    _backend: &dyn AnyBackend,
    user_id: &str,
    limit: u32,
    offset: u32,
) -> (String, String) {
    let escaped = user_id.replace('\'', "''");
    let data = format!(
        "SELECT timestamp, user_id, event_name, properties \
         FROM events WHERE user_id = '{escaped}' \
         ORDER BY timestamp DESC LIMIT {limit} OFFSET {offset}"
    );
    let count = format!(
        "SELECT COUNT(*) AS total FROM events WHERE user_id = '{escaped}'"
    );
    (data, count)
}
```

- [ ] **5d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::events::tests 2>&1
```

Expect: 4 tests pass.

- [ ] **5e. Implement `src/api/events.rs`**

File: `backend-rs/src/api/events.rs`

```rust
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse, Filter};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::events::{
    build_distinct_events_query, build_raw_events_queries, build_top_events_query,
    build_user_events_queries,
};

// --- GET /api/events ---

#[derive(Deserialize)]
pub struct EventsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
}

pub async fn get_events(
    State(state): State<AppState>,
    Query(params): Query<EventsParams>,
) -> Result<Json<DataResponse<Vec<String>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_distinct_events_query(backend, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let events: Vec<String> = rows
        .into_iter()
        .filter_map(|r| match &r[0] {
            SqlValue::Text(s) => Some(s.clone()),
            _ => None,
        })
        .collect();
    Ok(Json(DataResponse { data: events }))
}

// --- GET /api/events/top ---

#[derive(Deserialize)]
pub struct TopEventsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 {
    10
}

#[derive(Serialize)]
pub struct TopEvent {
    pub event_name: String,
    pub count: i64,
}

pub async fn get_top_events(
    State(state): State<AppState>,
    Query(params): Query<TopEventsParams>,
) -> Result<Json<DataResponse<Vec<TopEvent>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_top_events_query(backend, &params.start_date, &params.end_date, params.limit);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let events: Vec<TopEvent> = rows
        .into_iter()
        .map(|r| TopEvent {
            event_name: match &r[0] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            },
            count: match &r[1] {
                SqlValue::Int(n) => *n,
                _ => 0,
            },
        })
        .collect();
    Ok(Json(DataResponse { data: events }))
}

// --- GET /api/raw/events ---

#[derive(Deserialize)]
pub struct RawEventsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub event_name: Option<String>,
    pub user_id: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
    pub filters: Option<String>, // JSON-encoded Vec<Filter>
}

#[derive(Serialize)]
pub struct RawEvent {
    pub timestamp: String,
    pub user_id: String,
    pub event_name: String,
    pub properties: String,
}

#[derive(Serialize)]
pub struct PaginatedEvents {
    pub events: Vec<RawEvent>,
    pub total: i64,
}

pub async fn get_raw_events(
    State(state): State<AppState>,
    Query(params): Query<RawEventsParams>,
) -> Result<Json<DataResponse<PaginatedEvents>>, ApiError> {
    let filters: Vec<Filter> = match &params.filters {
        Some(s) if !s.is_empty() => serde_json::from_str(s)?,
        _ => vec![],
    };

    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let (data_sql, count_sql) = build_raw_events_queries(
        backend,
        &params.start_date,
        &params.end_date,
        params.event_name.as_deref(),
        params.user_id.as_deref(),
        &filters,
        params.limit,
        params.offset,
    );

    let data_rows = backend.execute_any(&mut conn, &data_sql, vec![]).await?;
    let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await?;

    let events: Vec<RawEvent> = data_rows
        .into_iter()
        .map(|r| {
            let text = |i: usize| match &r[i] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            };
            RawEvent {
                timestamp: text(0),
                user_id: text(1),
                event_name: text(2),
                properties: text(3),
            }
        })
        .collect();

    let total = count_rows
        .first()
        .and_then(|r| match &r[0] {
            SqlValue::Int(n) => Some(*n),
            _ => None,
        })
        .unwrap_or(0);

    Ok(Json(DataResponse {
        data: PaginatedEvents { events, total },
    }))
}

// --- GET /api/users/:user_id/events ---

#[derive(Deserialize)]
pub struct UserEventsParams {
    pub connection_id: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

pub async fn get_user_events(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Query(params): Query<UserEventsParams>,
) -> Result<Json<DataResponse<PaginatedEvents>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let (data_sql, count_sql) =
        build_user_events_queries(backend, &user_id, params.limit, params.offset);

    let data_rows = backend.execute_any(&mut conn, &data_sql, vec![]).await?;
    let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await?;

    let events: Vec<RawEvent> = data_rows
        .into_iter()
        .map(|r| {
            let text = |i: usize| match &r[i] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            };
            RawEvent {
                timestamp: text(0),
                user_id: text(1),
                event_name: text(2),
                properties: text(3),
            }
        })
        .collect();

    let total = count_rows
        .first()
        .and_then(|r| match &r[0] {
            SqlValue::Int(n) => Some(*n),
            _ => None,
        })
        .unwrap_or(0);

    Ok(Json(DataResponse {
        data: PaginatedEvents { events, total },
    }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::events::tests -- --nocapture
```

Expect: 4 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/events.rs backend-rs/src/api/events.rs
git commit -m "feat(backend-rs): implement events query builders and handlers"
```

---

## Task 6: Sessions query builders + handlers

**Files to modify:**
- `backend-rs/src/query/sessions.rs` (replace placeholder)
- `backend-rs/src/api/sessions.rs` (replace placeholder)

### Steps

- [ ] **6a. Write failing tests for `src/query/sessions.rs`**

Add to `backend-rs/src/query/sessions.rs` (the placeholder):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;
    use crate::connectors::types::SqlValue;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        // u1: two sessions (gap > 30 min between 10:05 and 12:00)
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'click', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 12:00:00', '{}')",
            // u2: one session
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'click', '2024-01-15 11:10:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_sessions_query() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_sessions_query(backend, "2024-01-01", "2024-02-01", 10, 0);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        // u1 has 2 sessions, u2 has 1 = 3 total
        assert_eq!(rows.len(), 3);
    }

    #[tokio::test]
    async fn test_sessions_summary() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_sessions_summary_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match &rows[0][0] {
            SqlValue::Int(n) => assert_eq!(*n, 3),
            other => panic!("expected 3 sessions, got {other:?}"),
        }
    }
}
```

- [ ] **6b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::sessions::tests 2>&1 | head -20
```

Expect: compile error — `build_sessions_query`, `build_sessions_summary_query` not yet defined.

- [ ] **6c. Implement `src/query/sessions.rs`**

File: `backend-rs/src/query/sessions.rs`

```rust
use crate::connectors::AnyBackend;

/// Build the sessions CTE. This is a reusable building block.
/// The CTE defines a `sessions` table with columns:
/// session_id, user_id, start_time, end_time, event_count, duration_sec.
///
/// Session boundary: 30-minute inactivity gap.
pub fn build_sessions_cte(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    let epoch_diff = backend.epoch_diff_seconds("prev_ts", "timestamp");
    let epoch_diff_agg = backend.epoch_diff_seconds("MIN(timestamp)", "MAX(timestamp)");
    let cast_session_num = backend.cast_to_text("session_num");
    let concat_parts = backend.string_concat(&["user_id", "'-'", &cast_session_num]);

    format!(
        "WITH lagged AS (\
            SELECT user_id, timestamp, event_name, \
                LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_ts \
            FROM events \
            WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}'\
        ), \
        boundaries AS (\
            SELECT *, \
                CASE WHEN prev_ts IS NULL OR {epoch_diff} > 1800 \
                    THEN 1 ELSE 0 END AS is_new \
            FROM lagged\
        ), \
        numbered AS (\
            SELECT *, \
                SUM(is_new) OVER (PARTITION BY user_id ORDER BY timestamp) AS session_num \
            FROM boundaries\
        ), \
        sessions AS (\
            SELECT \
                {concat_parts} AS session_id, \
                user_id, \
                MIN(timestamp) AS start_time, \
                MAX(timestamp) AS end_time, \
                COUNT(*) AS event_count, \
                {epoch_diff_agg} AS duration_sec \
            FROM numbered \
            GROUP BY user_id, session_num\
        )"
    )
}

/// Paginated sessions list.
pub fn build_sessions_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    limit: u32,
    offset: u32,
) -> String {
    let cte = build_sessions_cte(backend, start_date, end_date);
    format!(
        "{cte} \
        SELECT session_id, user_id, start_time, end_time, event_count, duration_sec \
        FROM sessions ORDER BY start_time DESC LIMIT {limit} OFFSET {offset}"
    )
}

/// Sessions summary: total count, average duration, average events per session.
pub fn build_sessions_summary_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    let cte = build_sessions_cte(backend, start_date, end_date);
    format!(
        "{cte} \
        SELECT \
            COUNT(*) AS total_sessions, \
            AVG(duration_sec) AS avg_duration, \
            AVG(event_count) AS avg_events \
        FROM sessions"
    )
}
```

- [ ] **6d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::sessions::tests 2>&1
```

Expect: 2 tests pass.

- [ ] **6e. Implement `src/api/sessions.rs`**

File: `backend-rs/src/api/sessions.rs`

```rust
use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::sessions::{build_sessions_query, build_sessions_summary_query};

#[derive(Deserialize)]
pub struct SessionsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

fn default_limit() -> u32 {
    20
}

#[derive(Serialize)]
pub struct Session {
    pub session_id: String,
    pub user_id: String,
    pub start_time: String,
    pub end_time: String,
    pub event_count: i64,
    pub duration_sec: f64,
}

pub async fn get_raw_sessions(
    State(state): State<AppState>,
    Query(params): Query<SessionsParams>,
) -> Result<Json<DataResponse<Vec<Session>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_sessions_query(
        backend,
        &params.start_date,
        &params.end_date,
        params.limit,
        params.offset,
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let sessions: Vec<Session> = rows
        .into_iter()
        .map(|r| {
            let text = |i: usize| match &r[i] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            };
            Session {
                session_id: text(0),
                user_id: text(1),
                start_time: text(2),
                end_time: text(3),
                event_count: match &r[4] {
                    SqlValue::Int(n) => *n,
                    _ => 0,
                },
                duration_sec: match &r[5] {
                    SqlValue::Float(f) => *f,
                    SqlValue::Int(n) => *n as f64,
                    _ => 0.0,
                },
            }
        })
        .collect();

    Ok(Json(DataResponse { data: sessions }))
}

#[derive(Deserialize)]
pub struct SessionsSummaryParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize)]
pub struct SessionsSummary {
    pub total_sessions: i64,
    pub avg_duration: f64,
    pub avg_events: f64,
}

pub async fn get_sessions_summary(
    State(state): State<AppState>,
    Query(params): Query<SessionsSummaryParams>,
) -> Result<Json<DataResponse<SessionsSummary>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_sessions_summary_query(backend, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let row = rows.first().ok_or_else(|| anyhow::anyhow!("no summary data"))?;
    let summary = SessionsSummary {
        total_sessions: match &row[0] {
            SqlValue::Int(n) => *n,
            _ => 0,
        },
        avg_duration: match &row[1] {
            SqlValue::Float(f) => *f,
            SqlValue::Int(n) => *n as f64,
            _ => 0.0,
        },
        avg_events: match &row[2] {
            SqlValue::Float(f) => *f,
            SqlValue::Int(n) => *n as f64,
            _ => 0.0,
        },
    };

    Ok(Json(DataResponse { data: summary }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::sessions::tests -- --nocapture
```

Expect: 2 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/sessions.rs backend-rs/src/api/sessions.rs
git commit -m "feat(backend-rs): implement sessions query builders and handlers"
```

---

## Task 7: Retention query builder + handler

**Files to modify:**
- `backend-rs/src/query/retention.rs` (replace placeholder)
- `backend-rs/src/api/retention.rs` (replace placeholder)

### Steps

- [ ] **7a. Write failing tests for `src/query/retention.rs`**

Add to `backend-rs/src/query/retention.rs` (the placeholder):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        for sql in [
            // u1: active on Jan 15, 16, 17
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-16 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-17 10:00:00', '{}')",
            // u2: active on Jan 15 only
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            // u3: active on Jan 16, 17
            "INSERT INTO events VALUES ('u3', 'page_view', '2024-01-16 14:00:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'page_view', '2024-01-17 14:00:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_retention_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_retention_query(backend, "2024-01-01", "2024-02-01", "day", None);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert!(!rows.is_empty());
        // Verify structure: each row has 4 columns
        assert_eq!(rows[0].len(), 4);
    }

    #[tokio::test]
    async fn test_retention_with_event_filter() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_retention_query(
            backend,
            "2024-01-01",
            "2024-02-01",
            "day",
            Some("page_view"),
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert!(!rows.is_empty());
    }
}
```

- [ ] **7b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::retention::tests 2>&1 | head -20
```

Expect: compile error — `build_retention_query` not yet defined.

- [ ] **7c. Implement `src/query/retention.rs`**

File: `backend-rs/src/query/retention.rs`

```rust
use crate::connectors::AnyBackend;

/// Build a cohort retention query.
///
/// `granularity`: "day", "week", or "month" — determines cohort bucketing and period width.
/// `event_name`: optional — if set, only users whose first event matches this are in the cohort.
pub fn build_retention_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    granularity: &str,
    event_name: Option<&str>,
) -> String {
    let date_trunc_expr = backend.date_trunc(granularity, "timestamp");
    let date_trunc_min = backend.date_trunc(granularity, "MIN(timestamp)");
    let date_diff = backend.date_diff_days("f.cohort_date", "a.active_date");

    let days_per_unit: u32 = match granularity {
        "week" => 7,
        "month" => 30,
        _ => 1, // day
    };

    let first_seen_filter = match event_name {
        Some(en) => {
            let escaped = en.replace('\'', "''");
            format!(" AND event_name = '{escaped}'")
        }
        None => String::new(),
    };

    format!(
        "WITH first_seen AS (\
            SELECT user_id, {date_trunc_min} AS cohort_date \
            FROM events \
            WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}'\
            {first_seen_filter} \
            GROUP BY user_id\
        ), \
        activity AS (\
            SELECT DISTINCT user_id, {date_trunc_expr} AS active_date \
            FROM events \
            WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}'\
        ), \
        cohort_activity AS (\
            SELECT f.user_id, f.cohort_date, \
                {date_diff} / {days_per_unit} AS period \
            FROM first_seen f \
            JOIN activity a ON f.user_id = a.user_id \
            WHERE a.active_date >= f.cohort_date\
        ), \
        cohort_sizes AS (\
            SELECT cohort_date, COUNT(DISTINCT user_id) AS cohort_size \
            FROM first_seen GROUP BY cohort_date\
        ), \
        retention AS (\
            SELECT cohort_date, period, COUNT(DISTINCT user_id) AS retained \
            FROM cohort_activity GROUP BY cohort_date, period\
        ) \
        SELECT cs.cohort_date, cs.cohort_size, r.period, r.retained \
        FROM cohort_sizes cs \
        LEFT JOIN retention r ON cs.cohort_date = r.cohort_date \
        ORDER BY cs.cohort_date, r.period"
    )
}
```

- [ ] **7d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::retention::tests 2>&1
```

Expect: 2 tests pass.

- [ ] **7e. Implement `src/api/retention.rs`**

File: `backend-rs/src/api/retention.rs`

```rust
use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::retention::build_retention_query;

#[derive(Deserialize)]
pub struct RetentionParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_granularity")]
    pub granularity: String,
    pub event_name: Option<String>,
}

fn default_granularity() -> String {
    "day".into()
}

#[derive(Serialize)]
pub struct CohortRow {
    pub cohort_date: String,
    pub cohort_size: i64,
    pub periods: BTreeMap<i64, i64>, // period_number -> retained_count
}

pub async fn get_retention(
    State(state): State<AppState>,
    Query(params): Query<RetentionParams>,
) -> Result<Json<DataResponse<Vec<CohortRow>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_retention_query(
        backend,
        &params.start_date,
        &params.end_date,
        &params.granularity,
        params.event_name.as_deref(),
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    // Group rows by cohort_date
    let mut cohorts: BTreeMap<String, CohortRow> = BTreeMap::new();

    for row in rows {
        let cohort_date = match &row[0] {
            SqlValue::Text(s) => s.clone(),
            other => format!("{other:?}"),
        };
        let cohort_size = match &row[1] {
            SqlValue::Int(n) => *n,
            _ => 0,
        };
        let period = match &row[2] {
            SqlValue::Int(n) => *n,
            SqlValue::Null => continue,
            _ => 0,
        };
        let retained = match &row[3] {
            SqlValue::Int(n) => *n,
            _ => 0,
        };

        let entry = cohorts.entry(cohort_date.clone()).or_insert_with(|| CohortRow {
            cohort_date,
            cohort_size,
            periods: BTreeMap::new(),
        });
        entry.periods.insert(period, retained);
    }

    let result: Vec<CohortRow> = cohorts.into_values().collect();
    Ok(Json(DataResponse { data: result }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::retention::tests -- --nocapture
```

Expect: 2 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/retention.rs backend-rs/src/api/retention.rs
git commit -m "feat(backend-rs): implement retention query builder and handler"
```

---

## Task 8: Paths query builders + handlers

**Files to modify:**
- `backend-rs/src/query/paths.rs` (replace placeholder)
- `backend-rs/src/api/paths.rs` (replace placeholder)

### Steps

- [ ] **8a. Write failing tests for `src/query/paths.rs`**

Add to `backend-rs/src/query/paths.rs` (the placeholder):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;
    use crate::connectors::types::SqlValue;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'landing', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'purchase', '2024-01-15 10:10:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'landing', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'sign_up', '2024-01-15 11:05:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'landing', '2024-01-15 12:00:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_paths_query() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_paths_query(backend, "2024-01-01", "2024-02-01", 10);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert!(!rows.is_empty());
        assert_eq!(rows[0].len(), 4); // e1, e2, e3, count
    }

    #[tokio::test]
    async fn test_path_analysis() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_path_analysis_query(
            backend, "sign_up", "2024-01-01", "2024-02-01", "before", 10,
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert!(!rows.is_empty());
        let first_event = match &rows[0][0] {
            SqlValue::Text(s) => s.clone(),
            other => panic!("expected Text, got {other:?}"),
        };
        assert_eq!(first_event, "landing");
    }

    #[tokio::test]
    async fn test_path_funnel() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let steps = vec!["landing".into(), "sign_up".into(), "purchase".into()];
        let sql = build_path_funnel_query(backend, &steps, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match (&rows[0][0], &rows[0][1], &rows[0][2]) {
            (SqlValue::Int(c0), SqlValue::Int(c1), SqlValue::Int(c2)) => {
                assert_eq!(*c0, 3);
                assert_eq!(*c1, 2);
                assert_eq!(*c2, 1);
            }
            other => panic!("unexpected types: {other:?}"),
        }
    }
}
```

- [ ] **8b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::paths::tests 2>&1 | head -20
```

Expect: compile error — `build_paths_query`, etc. not yet defined.

- [ ] **8c. Implement `src/query/paths.rs`**

File: `backend-rs/src/query/paths.rs`

```rust
use crate::connectors::AnyBackend;

/// Top 3-event sequences (most common paths).
pub fn build_paths_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    limit: u32,
) -> String {
    format!(
        "WITH e AS (\
            SELECT user_id, timestamp, event_name, \
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp) AS rn \
            FROM events \
            WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}'\
        ) \
        SELECT e1.event_name AS e1, e2.event_name AS e2, e3.event_name AS e3, \
            COUNT(*) AS count \
        FROM e e1 \
        JOIN e e2 ON e1.user_id = e2.user_id AND e2.rn = e1.rn + 1 \
        JOIN e e3 ON e2.user_id = e3.user_id AND e3.rn = e2.rn + 1 \
        GROUP BY e1.event_name, e2.event_name, e3.event_name \
        ORDER BY count DESC LIMIT {limit}"
    )
}

/// Events that occur before/after a given event.
/// `direction`: "before" or "after".
pub fn build_path_analysis_query(
    _backend: &dyn AnyBackend,
    event_name: &str,
    start_date: &str,
    end_date: &str,
    direction: &str,
    limit: u32,
) -> String {
    let escaped = event_name.replace('\'', "''");
    let (time_cond, select_alias) = if direction == "before" {
        ("other.timestamp < curr.timestamp", "prev_event")
    } else {
        ("other.timestamp > curr.timestamp", "next_event")
    };

    format!(
        "SELECT other.event_name AS {select_alias}, COUNT(*) AS count \
        FROM events curr \
        JOIN events other ON curr.user_id = other.user_id AND {time_cond} \
        WHERE curr.event_name = '{escaped}' \
            AND curr.timestamp >= '{start_date}' AND curr.timestamp < '{end_date}' \
        GROUP BY other.event_name \
        ORDER BY count DESC LIMIT {limit}"
    )
}

/// Funnel: ordered step-through conversion.
/// `steps`: ordered list of event names.
pub fn build_path_funnel_query(
    _backend: &dyn AnyBackend,
    steps: &[String],
    start_date: &str,
    end_date: &str,
) -> String {
    if steps.is_empty() {
        return "SELECT 0 AS count0".to_string();
    }

    let mut cte_parts = Vec::new();

    // Step 0
    let step0_event = steps[0].replace('\'', "''");
    cte_parts.push(format!(
        "step0 AS (\
            SELECT user_id, MIN(timestamp) AS ts0 \
            FROM events \
            WHERE event_name = '{step0_event}' \
                AND timestamp >= '{start_date}' AND timestamp < '{end_date}' \
            GROUP BY user_id\
        )"
    ));

    // Steps 1..N
    for i in 1..steps.len() {
        let event = steps[i].replace('\'', "''");
        let prev = i - 1;
        cte_parts.push(format!(
            "step{i} AS (\
                SELECT s.user_id, MIN(e.timestamp) AS ts{i} \
                FROM step{prev} s \
                JOIN events e ON s.user_id = e.user_id \
                WHERE e.event_name = '{event}' AND e.timestamp > s.ts{prev} \
                GROUP BY s.user_id\
            )"
        ));
    }

    // Final SELECT: count distinct users at each step
    let count_exprs: Vec<String> = (0..steps.len())
        .map(|i| format!("COUNT(DISTINCT step{i}.user_id) AS count{i}"))
        .collect();

    let joins: Vec<String> = (1..steps.len())
        .map(|i| format!("LEFT JOIN step{i} ON step0.user_id = step{i}.user_id"))
        .collect();

    format!(
        "WITH {} SELECT {} FROM step0 {}",
        cte_parts.join(", "),
        count_exprs.join(", "),
        joins.join(" ")
    )
}
```

- [ ] **8d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::paths::tests 2>&1
```

Expect: 3 tests pass.

- [ ] **8e. Implement `src/api/paths.rs`**

File: `backend-rs/src/api/paths.rs`

```rust
use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::paths::{
    build_path_analysis_query, build_path_funnel_query, build_paths_query,
};

// --- GET /api/paths ---

#[derive(Deserialize)]
pub struct PathsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 {
    20
}

#[derive(Serialize)]
pub struct PathEntry {
    pub path: Vec<String>,
    pub count: i64,
}

pub async fn get_paths(
    State(state): State<AppState>,
    Query(params): Query<PathsParams>,
) -> Result<Json<DataResponse<Vec<PathEntry>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_paths_query(backend, &params.start_date, &params.end_date, params.limit);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let entries: Vec<PathEntry> = rows
        .into_iter()
        .map(|r| {
            let text = |i: usize| match &r[i] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            };
            PathEntry {
                path: vec![text(0), text(1), text(2)],
                count: match &r[3] {
                    SqlValue::Int(n) => *n,
                    _ => 0,
                },
            }
        })
        .collect();

    Ok(Json(DataResponse { data: entries }))
}

// --- GET /api/path-analysis ---

#[derive(Deserialize)]
pub struct PathAnalysisParams {
    pub connection_id: String,
    pub event_name: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_direction")]
    pub direction: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_direction() -> String {
    "before".into()
}

#[derive(Serialize)]
pub struct PathAnalysisEntry {
    pub event: String,
    pub count: i64,
}

pub async fn get_path_analysis(
    State(state): State<AppState>,
    Query(params): Query<PathAnalysisParams>,
) -> Result<Json<DataResponse<Vec<PathAnalysisEntry>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_path_analysis_query(
        backend,
        &params.event_name,
        &params.start_date,
        &params.end_date,
        &params.direction,
        params.limit,
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let entries: Vec<PathAnalysisEntry> = rows
        .into_iter()
        .map(|r| PathAnalysisEntry {
            event: match &r[0] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            },
            count: match &r[1] {
                SqlValue::Int(n) => *n,
                _ => 0,
            },
        })
        .collect();

    Ok(Json(DataResponse { data: entries }))
}

// --- GET /api/path-funnel ---

#[derive(Deserialize)]
pub struct PathFunnelParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub steps: String, // JSON-encoded Vec<String>
}

#[derive(Serialize)]
pub struct FunnelStep {
    pub step: usize,
    pub event: String,
    pub count: i64,
}

pub async fn get_path_funnel(
    State(state): State<AppState>,
    Query(params): Query<PathFunnelParams>,
) -> Result<Json<DataResponse<Vec<FunnelStep>>>, ApiError> {
    let steps: Vec<String> = serde_json::from_str(&params.steps)?;

    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_path_funnel_query(backend, &steps, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let mut result = Vec::new();
    if let Some(row) = rows.first() {
        for (i, step_name) in steps.iter().enumerate() {
            let count = match row.get(i) {
                Some(SqlValue::Int(n)) => *n,
                _ => 0,
            };
            result.push(FunnelStep {
                step: i,
                event: step_name.clone(),
                count,
            });
        }
    }

    Ok(Json(DataResponse { data: result }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::paths::tests -- --nocapture
```

Expect: 3 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/paths.rs backend-rs/src/api/paths.rs
git commit -m "feat(backend-rs): implement paths query builders and handlers"
```

---

## Task 9: Conversion query builder + handler

**Files to modify:**
- `backend-rs/src/query/conversion.rs` (replace placeholder)
- `backend-rs/src/api/conversion.rs` (replace placeholder)

### Steps

- [ ] **9a. Write failing tests for `src/query/conversion.rs`**

Add to `backend-rs/src/query/conversion.rs` (the placeholder):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;
    use crate::connectors::types::SqlValue;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'purchase', '2024-01-15 10:30:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'sign_up', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'sign_up', '2024-01-16 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'purchase', '2024-01-16 11:00:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_conversion_query() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_conversion_query(backend, "sign_up", "purchase", "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match (&rows[0][0], &rows[0][1]) {
            (SqlValue::Int(entry), SqlValue::Int(converted)) => {
                assert_eq!(*entry, 3);
                assert_eq!(*converted, 2);
            }
            other => panic!("unexpected: {other:?}"),
        }
    }
}
```

- [ ] **9b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::conversion::tests 2>&1 | head -20
```

Expect: compile error — `build_conversion_query` not yet defined.

- [ ] **9c. Implement `src/query/conversion.rs`**

File: `backend-rs/src/query/conversion.rs`

```rust
use crate::connectors::AnyBackend;

/// Build a conversion query: what fraction of users who did `entry_event`
/// subsequently did `goal_event`.
pub fn build_conversion_query(
    _backend: &dyn AnyBackend,
    entry_event: &str,
    goal_event: &str,
    start_date: &str,
    end_date: &str,
) -> String {
    let entry_escaped = entry_event.replace('\'', "''");
    let goal_escaped = goal_event.replace('\'', "''");

    format!(
        "WITH entry_users AS (\
            SELECT DISTINCT user_id FROM events \
            WHERE event_name = '{entry_escaped}' \
                AND timestamp >= '{start_date}' AND timestamp < '{end_date}'\
        ), \
        converted AS (\
            SELECT DISTINCT eu.user_id \
            FROM entry_users eu \
            WHERE EXISTS (\
                SELECT 1 FROM events g \
                WHERE g.user_id = eu.user_id \
                    AND g.event_name = '{goal_escaped}' \
                    AND g.timestamp > (\
                        SELECT MIN(timestamp) FROM events \
                        WHERE user_id = eu.user_id AND event_name = '{entry_escaped}' \
                            AND timestamp >= '{start_date}' AND timestamp < '{end_date}'\
                    )\
            )\
        ) \
        SELECT \
            (SELECT COUNT(*) FROM entry_users) AS entry_count, \
            (SELECT COUNT(*) FROM converted) AS converted_count"
    )
}
```

- [ ] **9d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::conversion::tests 2>&1
```

Expect: 1 test passes.

- [ ] **9e. Implement `src/api/conversion.rs`**

File: `backend-rs/src/api/conversion.rs`

```rust
use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::conversion::build_conversion_query;

#[derive(Deserialize)]
pub struct ConversionParams {
    pub connection_id: String,
    pub entry_event: String,
    pub goal_event: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize)]
pub struct ConversionResponse {
    pub entry_count: i64,
    pub converted_count: i64,
    pub conversion_rate: f64,
}

pub async fn get_conversion(
    State(state): State<AppState>,
    Query(params): Query<ConversionParams>,
) -> Result<Json<DataResponse<ConversionResponse>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_conversion_query(
        backend,
        &params.entry_event,
        &params.goal_event,
        &params.start_date,
        &params.end_date,
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let row = rows
        .first()
        .ok_or_else(|| anyhow::anyhow!("no conversion data"))?;

    let entry_count = match &row[0] {
        SqlValue::Int(n) => *n,
        _ => 0,
    };
    let converted_count = match &row[1] {
        SqlValue::Int(n) => *n,
        _ => 0,
    };
    let conversion_rate = if entry_count > 0 {
        (converted_count as f64 / entry_count as f64) * 100.0
    } else {
        0.0
    };

    Ok(Json(DataResponse {
        data: ConversionResponse {
            entry_count,
            converted_count,
            conversion_rate,
        },
    }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::conversion::tests -- --nocapture
```

Expect: 1 test passes.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/conversion.rs backend-rs/src/api/conversion.rs
git commit -m "feat(backend-rs): implement conversion query builder and handler"
```

---

## Task 10: Mission Control query builders + handlers

**Files to modify:**
- `backend-rs/src/query/mission_control.rs` (replace placeholder)
- `backend-rs/src/api/mission_control.rs` (replace placeholder)

### Steps

- [ ] **10a. Write failing tests for `src/query/mission_control.rs`**

Add to `backend-rs/src/query/mission_control.rs` (the placeholder):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;
    use crate::connectors::types::SqlValue;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'click', '2024-01-16 09:00:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_overview_query() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_overview_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match (&rows[0][0], &rows[0][1]) {
            (SqlValue::Int(total), SqlValue::Int(unique)) => {
                assert_eq!(*total, 3);
                assert_eq!(*unique, 2);
            }
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_new_users_query() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_new_users_query(backend, "2024-01-15", "2024-01-16");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match &rows[0][0] {
            SqlValue::Int(n) => assert_eq!(*n, 2),
            other => panic!("expected Int, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_trend_total_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_trend_query(backend, "total_events", "2024-01-01", "2024-02-01")
            .expect("total_events should be supported");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
    }

    #[tokio::test]
    async fn test_trend_unsupported_metric() {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        assert!(build_trend_query(backend, "dau_mau_ratio", "2024-01-01", "2024-02-01").is_none());
    }
}
```

- [ ] **10b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::mission_control::tests 2>&1 | head -20
```

Expect: compile error — `build_overview_query`, etc. not yet defined.

- [ ] **10c. Implement `src/query/mission_control.rs`**

File: `backend-rs/src/query/mission_control.rs`

```rust
use crate::connectors::AnyBackend;

/// Build the main mission control overview query.
/// Returns: total_events, unique_users for a given period.
pub fn build_overview_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    format!(
        "SELECT COUNT(*) AS total_events, \
         COUNT(DISTINCT user_id) AS unique_users \
         FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}'"
    )
}

/// New users: users whose first-ever event falls within the period.
pub fn build_new_users_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    format!(
        "SELECT COUNT(*) AS new_users FROM (\
            SELECT user_id FROM events \
            GROUP BY user_id \
            HAVING MIN(timestamp) >= '{start_date}' AND MIN(timestamp) < '{end_date}'\
        ) t"
    )
}

/// Sessions aggregate for a period. Reuses the sessions CTE pattern.
pub fn build_sessions_agg_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    let cte = crate::query::sessions::build_sessions_cte(backend, start_date, end_date);
    format!(
        "{cte} \
        SELECT COUNT(*) AS total_sessions, \
            AVG(duration_sec) AS avg_duration, \
            AVG(event_count) AS avg_events \
        FROM sessions"
    )
}

/// Mission control trend: time-series for a given metric.
/// Supported metrics: "total_events", "unique_users".
/// Returns (sql, supported). If not supported, returns (empty, false).
pub fn build_trend_query(
    backend: &dyn AnyBackend,
    metric: &str,
    start_date: &str,
    end_date: &str,
) -> Option<String> {
    let date_expr = backend.date_trunc("day", "timestamp");
    let agg = match metric {
        "total_events" => "COUNT(*)".to_string(),
        "unique_users" => "COUNT(DISTINCT user_id)".to_string(),
        _ => return None, // unsupported metrics like new_users, dau_mau_ratio
    };

    Some(format!(
        "SELECT {date_expr} AS date, {agg} AS value \
         FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}' \
         GROUP BY 1 ORDER BY 1"
    ))
}
```

- [ ] **10d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::mission_control::tests 2>&1
```

Expect: 4 tests pass.

- [ ] **10e. Implement `src/api/mission_control.rs`**

File: `backend-rs/src/api/mission_control.rs`

```rust
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::mission_control::{
    build_new_users_query, build_overview_query, build_sessions_agg_query, build_trend_query,
};

// --- GET /api/mission-control ---

#[derive(Deserialize)]
pub struct MissionControlParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    /// Previous period start for comparison.
    pub prev_start_date: Option<String>,
    /// Previous period end for comparison.
    pub prev_end_date: Option<String>,
}

#[derive(Serialize)]
pub struct PeriodMetrics {
    pub total_events: i64,
    pub unique_users: i64,
    pub new_users: i64,
    pub returning_users: i64,
    pub total_sessions: i64,
    pub avg_session_duration: f64,
    pub avg_events_per_session: f64,
}

#[derive(Serialize)]
pub struct MissionControlResponse {
    pub current: PeriodMetrics,
    pub previous: Option<PeriodMetrics>,
}

async fn fetch_period_metrics(
    state: &AppState,
    connection_id: &str,
    start: &str,
    end: &str,
) -> Result<PeriodMetrics, ApiError> {
    let (mut conn, backend) = open_analytics_conn(state, connection_id).await?;

    // Overview
    let overview_sql = build_overview_query(backend, start, end);
    let overview_rows = backend.execute_any(&mut conn, &overview_sql, vec![]).await?;
    let (total_events, unique_users) = overview_rows
        .first()
        .map(|r| {
            let te = match &r[0] { SqlValue::Int(n) => *n, _ => 0 };
            let uu = match &r[1] { SqlValue::Int(n) => *n, _ => 0 };
            (te, uu)
        })
        .unwrap_or((0, 0));

    // New users
    let new_sql = build_new_users_query(backend, start, end);
    let new_rows = backend.execute_any(&mut conn, &new_sql, vec![]).await?;
    let new_users = new_rows
        .first()
        .and_then(|r| match &r[0] { SqlValue::Int(n) => Some(*n), _ => None })
        .unwrap_or(0);

    // Sessions
    let sess_sql = build_sessions_agg_query(backend, start, end);
    let sess_rows = backend.execute_any(&mut conn, &sess_sql, vec![]).await?;
    let (total_sessions, avg_duration, avg_events) = sess_rows
        .first()
        .map(|r| {
            let ts = match &r[0] { SqlValue::Int(n) => *n, _ => 0 };
            let ad = match &r[1] {
                SqlValue::Float(f) => *f,
                SqlValue::Int(n) => *n as f64,
                _ => 0.0,
            };
            let ae = match &r[2] {
                SqlValue::Float(f) => *f,
                SqlValue::Int(n) => *n as f64,
                _ => 0.0,
            };
            (ts, ad, ae)
        })
        .unwrap_or((0, 0.0, 0.0));

    Ok(PeriodMetrics {
        total_events,
        unique_users,
        new_users,
        returning_users: unique_users - new_users,
        total_sessions,
        avg_session_duration: avg_duration,
        avg_events_per_session: avg_events,
    })
}

pub async fn get_mission_control(
    State(state): State<AppState>,
    Query(params): Query<MissionControlParams>,
) -> Result<Json<DataResponse<MissionControlResponse>>, ApiError> {
    let current = fetch_period_metrics(&state, &params.connection_id, &params.start_date, &params.end_date).await?;

    let previous = match (&params.prev_start_date, &params.prev_end_date) {
        (Some(ps), Some(pe)) => Some(fetch_period_metrics(&state, &params.connection_id, ps, pe).await?),
        _ => None,
    };

    Ok(Json(DataResponse {
        data: MissionControlResponse { current, previous },
    }))
}

// --- GET /api/mission-control/trend ---

#[derive(Deserialize)]
pub struct MissionControlTrendParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub metric: String,
}

#[derive(Serialize)]
pub struct TrendPoint {
    pub date: String,
    pub value: f64,
}

pub async fn get_mission_control_trend(
    State(state): State<AppState>,
    Query(params): Query<MissionControlTrendParams>,
) -> Result<Json<DataResponse<Vec<TrendPoint>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;

    let sql = match build_trend_query(backend, &params.metric, &params.start_date, &params.end_date)
    {
        Some(sql) => sql,
        None => {
            return Err(ApiError(anyhow::anyhow!(
                "unsupported metric for trend: {}",
                params.metric
            )));
        }
    };

    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let points: Vec<TrendPoint> = rows
        .into_iter()
        .map(|r| TrendPoint {
            date: match &r[0] {
                SqlValue::Text(s) => s.clone(),
                other => format!("{other:?}"),
            },
            value: match &r[1] {
                SqlValue::Int(n) => *n as f64,
                SqlValue::Float(f) => *f,
                _ => 0.0,
            },
        })
        .collect();

    Ok(Json(DataResponse { data: points }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::mission_control::tests -- --nocapture
```

Expect: 4 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/mission_control.rs backend-rs/src/api/mission_control.rs
git commit -m "feat(backend-rs): implement mission control query builders and handlers"
```

---

## Task 11: Pivot query builders + handlers

**Files to modify:**
- `backend-rs/src/query/pivot.rs` (replace placeholder)
- `backend-rs/src/api/pivot.rs` (replace placeholder)

### Steps

- [ ] **11a. Write failing tests for `src/query/pivot.rs`**

Add to `backend-rs/src/query/pivot.rs` (the placeholder):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;
    use crate::connectors::types::SqlValue;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend
            .execute_any(
                conn,
                "CREATE TABLE events (
                    user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT
                )",
                vec![],
            )
            .await
            .unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'click', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'page_view', '2024-01-16 14:00:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_pivot_options_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_pivot_options_events_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2); // click, page_view
    }

    #[tokio::test]
    async fn test_pivot_count_by_event() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_pivot_query(
            backend, &["event_name".into()], "count", "", "2024-01-01", "2024-02-01", None,
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2); // page_view (3), click (1)
    }

    #[tokio::test]
    async fn test_pivot_unique_users() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_pivot_query(
            backend, &["event_name".into()], "unique_users", "user_id",
            "2024-01-01", "2024-02-01", None,
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
        match (&rows[0][0], &rows[0][1]) {
            (SqlValue::Text(name), SqlValue::Int(n)) => {
                assert_eq!(name, "page_view");
                assert_eq!(*n, 3);
            }
            other => panic!("unexpected: {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_filter_values() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_filter_values_query(backend, "user_id", "2024-01-01", "2024-02-01", 100);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 3); // u1, u2, u3
    }

    #[tokio::test]
    async fn test_pivot_grid_rows_paginated() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_pivot_grid_rows_query(
            backend, &["event_name".into()], "count", "", "2024-01-01", "2024-02-01",
            None, None, None, 1, 0,
        );
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1); // only 1 row due to LIMIT
    }
}
```

- [ ] **11b. Run failing tests — expect compile error or "not found"**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::pivot::tests 2>&1 | head -20
```

Expect: compile error — pivot query functions not yet defined.

- [ ] **11c. Implement `src/query/pivot.rs`**

File: `backend-rs/src/query/pivot.rs`

```rust
use crate::connectors::AnyBackend;

/// Build query for pivot options: distinct event names + hardcoded metric list.
pub fn build_pivot_options_events_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    format!(
        "SELECT DISTINCT event_name FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}' \
         ORDER BY event_name"
    )
}

/// Build a pivot aggregation query.
///
/// `row_dims`: columns to GROUP BY (e.g., ["event_name", "user_id"]).
/// `agg_func`: "count", "count_distinct", "sum", "avg".
/// `agg_col`: the column to aggregate (ignored for "count").
pub fn build_pivot_query(
    backend: &dyn AnyBackend,
    row_dims: &[String],
    agg_func: &str,
    agg_col: &str,
    start_date: &str,
    end_date: &str,
    event_name: Option<&str>,
) -> String {
    let q = backend.identifier_quote_char();

    let group_cols: Vec<String> = row_dims
        .iter()
        .map(|d| format!("{q}{d}{q}"))
        .collect();
    let group_by = group_cols.join(", ");

    let agg_expr = match agg_func {
        "count" => "COUNT(*)".to_string(),
        "count_distinct" | "unique_users" => {
            let col = if agg_col.is_empty() { "user_id" } else { agg_col };
            format!("COUNT(DISTINCT {q}{col}{q})")
        }
        "sum" => format!("SUM({q}{agg_col}{q})"),
        "avg" => format!("AVG({q}{agg_col}{q})"),
        _ => "COUNT(*)".to_string(),
    };

    let mut where_clause = format!(
        "timestamp >= '{start_date}' AND timestamp < '{end_date}'"
    );
    if let Some(en) = event_name {
        let escaped = en.replace('\'', "''");
        where_clause.push_str(&format!(" AND event_name = '{escaped}'"));
    }

    format!(
        "SELECT {group_by}, {agg_expr} AS value \
         FROM events WHERE {where_clause} \
         GROUP BY {group_by} \
         ORDER BY value DESC"
    )
}

/// Build a query to get distinct values for a given field (for filter dropdowns).
pub fn build_filter_values_query(
    backend: &dyn AnyBackend,
    field: &str,
    start_date: &str,
    end_date: &str,
    limit: u32,
) -> String {
    let q = backend.identifier_quote_char();
    format!(
        "SELECT DISTINCT {q}{field}{q} FROM events \
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}' \
         ORDER BY 1 LIMIT {limit}"
    )
}

/// Build a paginated pivot grid query with optional sort.
pub fn build_pivot_grid_rows_query(
    backend: &dyn AnyBackend,
    row_dims: &[String],
    agg_func: &str,
    agg_col: &str,
    start_date: &str,
    end_date: &str,
    event_name: Option<&str>,
    sort_col: Option<&str>,
    sort_dir: Option<&str>,
    limit: u32,
    offset: u32,
) -> String {
    let base = build_pivot_query(
        backend, row_dims, agg_func, agg_col, start_date, end_date, event_name,
    );

    // Override ORDER BY if sort specified
    let order = match (sort_col, sort_dir) {
        (Some(col), Some(dir)) => {
            let q = backend.identifier_quote_char();
            let direction = if dir.to_uppercase() == "ASC" { "ASC" } else { "DESC" };
            // Remove existing ORDER BY and replace
            let without_order = if let Some(idx) = base.to_uppercase().rfind("ORDER BY") {
                &base[..idx]
            } else {
                &base
            };
            return format!("{without_order} ORDER BY {q}{col}{q} {direction} LIMIT {limit} OFFSET {offset}");
        }
        _ => String::new(),
    };

    if order.is_empty() {
        format!("{base} LIMIT {limit} OFFSET {offset}")
    } else {
        format!("{base} {order} LIMIT {limit} OFFSET {offset}")
    }
}
```

- [ ] **11d. Run tests — expect PASS**

```bash
cd backend-rs && cargo test -p stratifio-backend -- query::pivot::tests 2>&1
```

Expect: 5 tests pass.

- [ ] **11e. Implement `src/api/pivot.rs`**

File: `backend-rs/src/api/pivot.rs`

```rust
use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::pivot::{
    build_filter_values_query, build_pivot_grid_rows_query, build_pivot_options_events_query,
    build_pivot_query,
};

// --- GET /api/pivot/options ---

#[derive(Deserialize)]
pub struct PivotOptionsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize)]
pub struct PivotOptions {
    pub dimensions: Vec<String>,
    pub metrics: Vec<String>,
    pub events: Vec<String>,
}

pub async fn get_pivot_options(
    State(state): State<AppState>,
    Query(params): Query<PivotOptionsParams>,
) -> Result<Json<DataResponse<PivotOptions>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_pivot_options_events_query(backend, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let events: Vec<String> = rows
        .into_iter()
        .filter_map(|r| match &r[0] {
            SqlValue::Text(s) => Some(s.clone()),
            _ => None,
        })
        .collect();

    Ok(Json(DataResponse {
        data: PivotOptions {
            dimensions: vec![
                "event_name".into(),
                "user_id".into(),
            ],
            metrics: vec![
                "count".into(),
                "unique_users".into(),
            ],
            events,
        },
    }))
}

// --- POST /api/pivot ---

#[derive(Deserialize)]
pub struct PivotRequest {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub rows: Vec<String>,
    #[serde(default = "default_agg")]
    pub agg_func: String,
    #[serde(default)]
    pub agg_col: String,
    pub event_name: Option<String>,
}

fn default_agg() -> String {
    "count".into()
}

#[derive(Serialize)]
pub struct PivotRow {
    pub dimensions: Vec<String>,
    pub value: f64,
}

pub async fn post_pivot(
    State(state): State<AppState>,
    Json(req): Json<PivotRequest>,
) -> Result<Json<DataResponse<Vec<PivotRow>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &req.connection_id).await?;
    let sql = build_pivot_query(
        backend,
        &req.rows,
        &req.agg_func,
        &req.agg_col,
        &req.start_date,
        &req.end_date,
        req.event_name.as_deref(),
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let dim_count = req.rows.len();
    let result: Vec<PivotRow> = rows
        .into_iter()
        .map(|r| {
            let dims: Vec<String> = (0..dim_count)
                .map(|i| match &r[i] {
                    SqlValue::Text(s) => s.clone(),
                    other => format!("{other:?}"),
                })
                .collect();
            let value = match &r[dim_count] {
                SqlValue::Int(n) => *n as f64,
                SqlValue::Float(f) => *f,
                _ => 0.0,
            };
            PivotRow {
                dimensions: dims,
                value,
            }
        })
        .collect();

    Ok(Json(DataResponse { data: result }))
}

// --- POST /api/pivot/grid ---
// Same as post_pivot but returns in grid format. For simplicity, reuse the same logic.

pub async fn post_pivot_grid(
    State(state): State<AppState>,
    Json(req): Json<PivotRequest>,
) -> Result<Json<DataResponse<Vec<PivotRow>>>, ApiError> {
    // Grid format is the same as pivot in this simplified implementation
    post_pivot(State(state), Json(req)).await
}

// --- GET /api/pivot/grid/filter-values ---

#[derive(Deserialize)]
pub struct FilterValuesParams {
    pub connection_id: String,
    pub field: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_fv_limit")]
    pub limit: u32,
}

fn default_fv_limit() -> u32 {
    100
}

pub async fn get_pivot_filter_values(
    State(state): State<AppState>,
    Query(params): Query<FilterValuesParams>,
) -> Result<Json<DataResponse<Vec<String>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_filter_values_query(
        backend,
        &params.field,
        &params.start_date,
        &params.end_date,
        params.limit,
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let values: Vec<String> = rows
        .into_iter()
        .filter_map(|r| match &r[0] {
            SqlValue::Text(s) => Some(s.clone()),
            _ => None,
        })
        .collect();

    Ok(Json(DataResponse { data: values }))
}

// --- POST /api/pivot/grid/rows ---

#[derive(Deserialize)]
pub struct PivotGridRowsRequest {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub rows: Vec<String>,
    #[serde(default = "default_agg")]
    pub agg_func: String,
    #[serde(default)]
    pub agg_col: String,
    pub event_name: Option<String>,
    pub sort_col: Option<String>,
    pub sort_dir: Option<String>,
    #[serde(default = "default_grid_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

fn default_grid_limit() -> u32 {
    50
}

pub async fn post_pivot_grid_rows(
    State(state): State<AppState>,
    Json(req): Json<PivotGridRowsRequest>,
) -> Result<Json<DataResponse<Vec<PivotRow>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &req.connection_id).await?;
    let sql = build_pivot_grid_rows_query(
        backend,
        &req.rows,
        &req.agg_func,
        &req.agg_col,
        &req.start_date,
        &req.end_date,
        req.event_name.as_deref(),
        req.sort_col.as_deref(),
        req.sort_dir.as_deref(),
        req.limit,
        req.offset,
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let dim_count = req.rows.len();
    let result: Vec<PivotRow> = rows
        .into_iter()
        .map(|r| {
            let dims: Vec<String> = (0..dim_count)
                .map(|i| match &r[i] {
                    SqlValue::Text(s) => s.clone(),
                    other => format!("{other:?}"),
                })
                .collect();
            let value = match &r[dim_count] {
                SqlValue::Int(n) => *n as f64,
                SqlValue::Float(f) => *f,
                _ => 0.0,
            };
            PivotRow {
                dimensions: dims,
                value,
            }
        })
        .collect();

    Ok(Json(DataResponse { data: result }))
}
```

### Verify

```bash
cd backend-rs && cargo test --lib query::pivot::tests -- --nocapture
```

Expect: 5 tests pass.

### Commit

```bash
cd backend-rs && cd ..
git add backend-rs/src/query/pivot.rs backend-rs/src/api/pivot.rs
git commit -m "feat(backend-rs): implement pivot query builders and handlers"
```

---

## Final verification

After all 11 tasks are complete, run the full test suite:

```bash
cd backend-rs && cargo test --lib -- --nocapture
```

Expected: All ~30 tests pass. Then verify the binary builds:

```bash
cd backend-rs && cargo build --release --bin stratifio-backend
```

### Summary of all files created/modified

**New files (20):**
- `backend-rs/src/api/mod.rs`
- `backend-rs/src/api/error.rs`
- `backend-rs/src/api/state.rs`
- `backend-rs/src/api/trend.rs`
- `backend-rs/src/api/events.rs`
- `backend-rs/src/api/sessions.rs`
- `backend-rs/src/api/retention.rs`
- `backend-rs/src/api/paths.rs`
- `backend-rs/src/api/conversion.rs`
- `backend-rs/src/api/pivot.rs`
- `backend-rs/src/api/mission_control.rs`
- `backend-rs/src/query/mod.rs`
- `backend-rs/src/query/trend.rs`
- `backend-rs/src/query/events.rs`
- `backend-rs/src/query/sessions.rs`
- `backend-rs/src/query/retention.rs`
- `backend-rs/src/query/paths.rs`
- `backend-rs/src/query/conversion.rs`
- `backend-rs/src/query/pivot.rs`
- `backend-rs/src/query/mission_control.rs`

**Modified files (4):**
- `backend-rs/Cargo.toml` — added axum, tower-http, fernet, sha2, base64, tower
- `backend-rs/src/lib.rs` — added `pub mod api; pub mod query;`
- `backend-rs/src/main.rs` — full Axum server startup
- `backend-rs/src/connectors/drivers/sqlite.rs` — added `execute_on_handle` helper
