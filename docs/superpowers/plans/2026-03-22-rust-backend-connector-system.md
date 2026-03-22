# Rust Backend Connector System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Rust `connectors` module for the stratif.io backend — two traits, six warehouse drivers, an object-safe registry, with full unit tests for all dialect methods and integration tests for DuckDB/SQLite.

**Architecture:** `SqlDialect` (pure, sync) and `DatabaseBackend` (async I/O) are separate traits; an `AnyBackend` object-safe trait with a blanket impl lets the registry store all drivers as `Box<dyn AnyBackend>`. DuckDB and SQLite use a thread-actor pattern (their connections are not `Send`); PostgreSQL uses `sqlx::PgPool`; cloud drivers use HTTP clients.

**Tech Stack:** Rust 2021, Tokio, async-trait, anyhow, serde/serde_json, duckdb, rusqlite, sqlx (postgres), reqwest, clickhouse-rs.

**Reference:** Spec at `docs/superpowers/specs/2026-03-22-rust-backend-connector-system-design.md`. Python implementations at `backend/backends/` — use them as the source of truth for all SQL strings and I/O logic.

---

## File Map

| File | Purpose |
|---|---|
| `backend-rs/Cargo.toml` | Project manifest + all dependencies |
| `backend-rs/src/main.rs` | Minimal binary entry point |
| `backend-rs/src/connectors/mod.rs` | `BackendConnection` enum, `BackendRegistry` |
| `backend-rs/src/connectors/types.rs` | `SqlValue`, `Row`, `ColumnInfo`, `SchemaInfo`, `CustomProperty`, `BrowseNode`, `BrowseKind` |
| `backend-rs/src/connectors/dialect.rs` | `SqlDialect` trait |
| `backend-rs/src/connectors/backend.rs` | `DatabaseBackend` trait |
| `backend-rs/src/connectors/any_backend.rs` | `AnyBackend` trait + blanket impl |
| `backend-rs/src/connectors/drivers/mod.rs` | Re-exports all drivers |
| `backend-rs/src/connectors/drivers/duckdb.rs` | DuckDB driver (actor + dialect) |
| `backend-rs/src/connectors/drivers/sqlite.rs` | SQLite driver (actor + dialect) |
| `backend-rs/src/connectors/drivers/postgres.rs` | PostgreSQL driver (sqlx pool + dialect) |
| `backend-rs/src/connectors/drivers/snowflake.rs` | Snowflake driver (HTTP + dialect) |
| `backend-rs/src/connectors/drivers/clickhouse.rs` | ClickHouse driver (clickhouse-rs + dialect) |
| `backend-rs/src/connectors/drivers/databricks.rs` | Databricks driver (HTTP + dialect) |

---

## Task 1: Scaffold the Rust project

**Files:**
- Create: `backend-rs/Cargo.toml`
- Create: `backend-rs/src/main.rs`
- Create: `backend-rs/src/connectors/mod.rs`
- Create: `backend-rs/src/connectors/types.rs`
- Create: `backend-rs/src/connectors/dialect.rs`
- Create: `backend-rs/src/connectors/backend.rs`
- Create: `backend-rs/src/connectors/any_backend.rs`
- Create: `backend-rs/src/connectors/drivers/mod.rs`
- Create: `backend-rs/src/connectors/drivers/duckdb.rs`
- Create: `backend-rs/src/connectors/drivers/sqlite.rs`
- Create: `backend-rs/src/connectors/drivers/postgres.rs`
- Create: `backend-rs/src/connectors/drivers/snowflake.rs`
- Create: `backend-rs/src/connectors/drivers/clickhouse.rs`
- Create: `backend-rs/src/connectors/drivers/databricks.rs`

- [ ] **Step 1: Create `backend-rs/Cargo.toml`**

```toml
[package]
name = "stratifio-backend"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "stratifio-backend"
path = "src/main.rs"

[dependencies]
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
anyhow = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
duckdb = "1"
rusqlite = { version = "0.32", features = ["bundled"] }
sqlx = { version = "0.8", features = ["postgres", "runtime-tokio-rustls", "macros"] }
reqwest = { version = "0.12", features = ["json"] }
clickhouse = "0.11"

[dev-dependencies]
tokio = { version = "1", features = ["full", "test-util"] }
```

- [ ] **Step 2: Create `backend-rs/src/main.rs`**

```rust
fn main() {
    println!("stratifio backend");
}
```

- [ ] **Step 3: Create empty stub files**

Create each file with a single `// TODO` comment so the project compiles:

```
backend-rs/src/connectors/mod.rs
backend-rs/src/connectors/types.rs
backend-rs/src/connectors/dialect.rs
backend-rs/src/connectors/backend.rs
backend-rs/src/connectors/any_backend.rs
backend-rs/src/connectors/drivers/mod.rs
backend-rs/src/connectors/drivers/duckdb.rs
backend-rs/src/connectors/drivers/sqlite.rs
backend-rs/src/connectors/drivers/postgres.rs
backend-rs/src/connectors/drivers/snowflake.rs
backend-rs/src/connectors/drivers/clickhouse.rs
backend-rs/src/connectors/drivers/databricks.rs
```

Add module declarations to `src/main.rs`:

```rust
mod connectors;

fn main() {
    println!("stratifio backend");
}
```

Add module declarations to `src/connectors/mod.rs`:

```rust
pub mod any_backend;
pub mod backend;
pub mod dialect;
pub mod drivers;
pub mod mod_types;  // BackendConnection lives here to avoid circular imports
pub mod types;
```

Add driver re-exports to `src/connectors/drivers/mod.rs`:

```rust
pub mod clickhouse;
pub mod databricks;
pub mod duckdb;
pub mod postgres;
pub mod snowflake;
pub mod sqlite;
```

- [ ] **Step 4: Verify project compiles**

Run from `backend-rs/`:
```bash
cargo build
```
Expected: compiles with 0 errors (warnings OK for empty stubs)

- [ ] **Step 5: Commit**

```bash
git add backend-rs/
git commit -m "chore(rust): scaffold backend-rs project with empty connectors module"
```

---

## Task 2: Core types

**Files:**
- Modify: `backend-rs/src/connectors/types.rs`

- [ ] **Step 1: Write `types.rs`**

```rust
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SqlValue {
    Int(i64),
    Float(f64),
    Text(String),
    Bool(bool),
    Null,
}

pub type Row = Vec<SqlValue>;

#[derive(Debug, Clone)]
pub struct ColumnInfo {
    pub name: String,
    pub sql_type: String,
}

#[derive(Debug, Clone)]
pub struct SchemaInfo {
    pub tables: Vec<String>,
    pub events_table: String,
    pub columns: Vec<ColumnInfo>,
    pub suggestions: HashMap<String, String>,
    pub proposed_custom_properties: Vec<CustomProperty>,
}

#[derive(Debug, Clone)]
pub struct CustomProperty {
    pub name: String,
    pub path: String,
    pub prop_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BrowseKind {
    Schema,
    Table,
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowseNode {
    pub name: String,
    pub full_name: String,
    pub kind: BrowseKind,
}
```

- [ ] **Step 2: Verify compiles**

```bash
cargo build
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add backend-rs/src/connectors/types.rs
git commit -m "feat(rust/connectors): add core types (SqlValue, Row, SchemaInfo, BrowseNode)"
```

---

## Task 3: Trait declarations

**Files:**
- Modify: `backend-rs/src/connectors/dialect.rs`
- Modify: `backend-rs/src/connectors/backend.rs`
- Modify: `backend-rs/src/connectors/any_backend.rs`
- Modify: `backend-rs/src/connectors/mod.rs`

These are declarations only — no implementations yet.

- [ ] **Step 1: Write `dialect.rs`**

```rust
use crate::connectors::types::CustomProperty;

pub trait SqlDialect: Send + Sync {
    fn dialect_name(&self) -> &'static str;
    fn identifier_quote_char(&self) -> char;

    fn date_trunc(&self, unit: &str, col: &str) -> String;
    fn date_diff_days(&self, start: &str, end: &str) -> String;
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String;
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String;

    fn cast_to_text(&self, expr: &str) -> String;
    fn json_extract_string(&self, col: &str, key: &str) -> String;
    fn extract_hour(&self, col: &str) -> String;
    fn extract_day_of_week(&self, col: &str) -> String;
    fn extract_year(&self, col: &str) -> String;
    fn extract_month(&self, col: &str) -> String;
    fn extract_week(&self, col: &str) -> String;
    fn extract_quarter(&self, col: &str) -> String;

    fn string_concat(&self, parts: &[&str]) -> String;

    fn build_events_cte(
        &self,
        source_table: &str,
        uid_field: &str,
        ts_field: &str,
        en_field: &str,
        custom_props: &[CustomProperty],
    ) -> String;

    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String;
}
```

- [ ] **Step 2: Write `backend.rs`**

```rust
use anyhow::Result;
use async_trait::async_trait;
use serde::de::DeserializeOwned;

use crate::connectors::mod_types::BackendConnection;
use crate::connectors::types::{BrowseNode, ColumnInfo, Row, SchemaInfo, SqlValue};
use crate::connectors::dialect::SqlDialect;

#[async_trait]
pub trait DatabaseBackend: SqlDialect {
    type Credentials: DeserializeOwned + Send + Sync;

    async fn open(&self, creds: &Self::Credentials) -> Result<BackendConnection>;

    async fn execute(
        &self,
        conn: &mut BackendConnection,
        query: &str,
        params: Vec<SqlValue>,
    ) -> Result<Vec<Row>>;

    async fn get_tables(&self, conn: &mut BackendConnection) -> Result<Vec<String>>;

    async fn table_exists(
        &self,
        conn: &mut BackendConnection,
        table_name: &str,
    ) -> Result<bool>;

    async fn get_table_columns(
        &self,
        conn: &mut BackendConnection,
        table: &str,
    ) -> Result<Vec<ColumnInfo>>;

    async fn get_columns_for_browse(
        &self,
        conn: &mut BackendConnection,
        table: &str,
    ) -> Result<Vec<String>>;

    async fn detect_schema(
        &self,
        conn: &mut BackendConnection,
        hint: Option<&str>,
    ) -> Result<SchemaInfo>;

    async fn browse(
        &self,
        conn: &mut BackendConnection,
        catalog: Option<&str>,
        schema: Option<&str>,
    ) -> Result<Vec<BrowseNode>>;

    fn is_connection_error(&self, err: &anyhow::Error) -> bool;
}
```

Note: `BackendConnection` is imported from `mod_types` — a submodule of `connectors::mod` we'll define next to avoid circular imports.

- [ ] **Step 3: Write `any_backend.rs` (declaration + blanket impl skeleton)**

```rust
use anyhow::Result;
use async_trait::async_trait;
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::connectors::backend::DatabaseBackend;
use crate::connectors::dialect::SqlDialect;
use crate::connectors::mod_types::BackendConnection;
use crate::connectors::types::{BrowseNode, ColumnInfo, CustomProperty, Row, SchemaInfo, SqlValue};

#[async_trait]
pub trait AnyBackend: Send + Sync {
    fn dialect_name(&self) -> &'static str;
    fn identifier_quote_char(&self) -> char;
    fn date_trunc(&self, unit: &str, col: &str) -> String;
    fn date_diff_days(&self, start: &str, end: &str) -> String;
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String;
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String;
    fn cast_to_text(&self, expr: &str) -> String;
    fn json_extract_string(&self, col: &str, key: &str) -> String;
    fn extract_hour(&self, col: &str) -> String;
    fn extract_day_of_week(&self, col: &str) -> String;
    fn extract_year(&self, col: &str) -> String;
    fn extract_month(&self, col: &str) -> String;
    fn extract_week(&self, col: &str) -> String;
    fn extract_quarter(&self, col: &str) -> String;
    fn string_concat(&self, parts: &[&str]) -> String;
    fn build_events_cte(
        &self, source_table: &str, uid_field: &str,
        ts_field: &str, en_field: &str,
        custom_props: &[CustomProperty],
    ) -> String;
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String;

    async fn open_any(&self, raw: Value) -> Result<BackendConnection>;
    async fn execute_any(
        &self, conn: &mut BackendConnection,
        query: &str, params: Vec<SqlValue>,
    ) -> Result<Vec<Row>>;
    async fn get_tables(&self, conn: &mut BackendConnection) -> Result<Vec<String>>;
    async fn table_exists(
        &self, conn: &mut BackendConnection, table_name: &str,
    ) -> Result<bool>;
    async fn get_table_columns(
        &self, conn: &mut BackendConnection, table: &str,
    ) -> Result<Vec<ColumnInfo>>;
    async fn get_columns_for_browse(
        &self, conn: &mut BackendConnection, table: &str,
    ) -> Result<Vec<String>>;
    async fn detect_schema(
        &self, conn: &mut BackendConnection, hint: Option<&str>,
    ) -> Result<SchemaInfo>;
    async fn browse(
        &self, conn: &mut BackendConnection,
        catalog: Option<&str>, schema: Option<&str>,
    ) -> Result<Vec<BrowseNode>>;
    fn is_connection_error(&self, err: &anyhow::Error) -> bool;
}

#[async_trait]
impl<B> AnyBackend for B
where
    B: DatabaseBackend + Send + Sync,
    B::Credentials: DeserializeOwned + Send + Sync,
{
    fn dialect_name(&self) -> &'static str { <Self as SqlDialect>::dialect_name(self) }
    fn identifier_quote_char(&self) -> char { <Self as SqlDialect>::identifier_quote_char(self) }
    fn date_trunc(&self, unit: &str, col: &str) -> String { <Self as SqlDialect>::date_trunc(self, unit, col) }
    fn date_diff_days(&self, start: &str, end: &str) -> String { <Self as SqlDialect>::date_diff_days(self, start, end) }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String { <Self as SqlDialect>::epoch_diff_seconds(self, start, end) }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String { <Self as SqlDialect>::interval_minutes_exceeded(self, earlier, later, minutes) }
    fn cast_to_text(&self, expr: &str) -> String { <Self as SqlDialect>::cast_to_text(self, expr) }
    fn json_extract_string(&self, col: &str, key: &str) -> String { <Self as SqlDialect>::json_extract_string(self, col, key) }
    fn extract_hour(&self, col: &str) -> String { <Self as SqlDialect>::extract_hour(self, col) }
    fn extract_day_of_week(&self, col: &str) -> String { <Self as SqlDialect>::extract_day_of_week(self, col) }
    fn extract_year(&self, col: &str) -> String { <Self as SqlDialect>::extract_year(self, col) }
    fn extract_month(&self, col: &str) -> String { <Self as SqlDialect>::extract_month(self, col) }
    fn extract_week(&self, col: &str) -> String { <Self as SqlDialect>::extract_week(self, col) }
    fn extract_quarter(&self, col: &str) -> String { <Self as SqlDialect>::extract_quarter(self, col) }
    fn string_concat(&self, parts: &[&str]) -> String { <Self as SqlDialect>::string_concat(self, parts) }
    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, custom_props: &[CustomProperty]) -> String {
        <Self as SqlDialect>::build_events_cte(self, source_table, uid_field, ts_field, en_field, custom_props)
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String { <Self as SqlDialect>::prepend_events_cte(self, cte_body, query) }

    async fn open_any(&self, raw: Value) -> Result<BackendConnection> {
        let creds = serde_json::from_value::<B::Credentials>(raw)?;
        DatabaseBackend::open(self, &creds).await
    }
    async fn execute_any(&self, conn: &mut BackendConnection, query: &str, params: Vec<SqlValue>) -> Result<Vec<Row>> {
        DatabaseBackend::execute(self, conn, query, params).await
    }
    async fn get_tables(&self, conn: &mut BackendConnection) -> Result<Vec<String>> {
        DatabaseBackend::get_tables(self, conn).await
    }
    async fn table_exists(&self, conn: &mut BackendConnection, table_name: &str) -> Result<bool> {
        DatabaseBackend::table_exists(self, conn, table_name).await
    }
    async fn get_table_columns(&self, conn: &mut BackendConnection, table: &str) -> Result<Vec<ColumnInfo>> {
        DatabaseBackend::get_table_columns(self, conn, table).await
    }
    async fn get_columns_for_browse(&self, conn: &mut BackendConnection, table: &str) -> Result<Vec<String>> {
        DatabaseBackend::get_columns_for_browse(self, conn, table).await
    }
    async fn detect_schema(&self, conn: &mut BackendConnection, hint: Option<&str>) -> Result<SchemaInfo> {
        DatabaseBackend::detect_schema(self, conn, hint).await
    }
    async fn browse(&self, conn: &mut BackendConnection, catalog: Option<&str>, schema: Option<&str>) -> Result<Vec<BrowseNode>> {
        DatabaseBackend::browse(self, conn, catalog, schema).await
    }
    fn is_connection_error(&self, err: &anyhow::Error) -> bool {
        DatabaseBackend::is_connection_error(self, err)
    }
}
```

- [ ] **Step 4: Update `connectors/mod.rs` with module declarations**

```rust
pub mod any_backend;
pub mod backend;
pub mod dialect;
pub mod drivers;
pub mod mod_types;  // BackendConnection lives here to avoid circular imports
pub mod types;

pub use any_backend::AnyBackend;
pub use backend::DatabaseBackend;
pub use dialect::SqlDialect;
pub use mod_types::BackendConnection;
pub use types::*;
```

Create `backend-rs/src/connectors/mod_types.rs` with a placeholder:

```rust
// BackendConnection will be filled in Task 10
pub enum BackendConnection {
    _Placeholder,
}
```

- [ ] **Step 5: Verify compiles**

```bash
cargo build
```
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add backend-rs/src/
git commit -m "feat(rust/connectors): add SqlDialect, DatabaseBackend, AnyBackend trait declarations"
```

---

## Task 4: DuckDB `SqlDialect` implementation + unit tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/duckdb.rs`

Python reference: `backend/backends/duckdb/__init__.py`

- [ ] **Step 1: Write failing tests first**

```rust
// backend-rs/src/connectors/drivers/duckdb.rs

pub struct DuckDbBackend;

impl DuckDbBackend {
    pub fn new() -> Self { Self }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;

    fn b() -> DuckDbBackend { DuckDbBackend::new() }

    #[test]
    fn dialect_name() { assert_eq!(b().dialect_name(), "duckdb"); }

    #[test]
    fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '"'); }

    #[test]
    fn date_trunc_day() {
        assert_eq!(b().date_trunc("day", "ts"), "DATE_TRUNC('day', ts)");
    }

    #[test]
    fn date_diff_days() {
        assert_eq!(b().date_diff_days("a", "b"), "DATE_DIFF('day', a, b)");
    }

    #[test]
    fn epoch_diff_seconds() {
        assert_eq!(b().epoch_diff_seconds("a", "b"), "EXTRACT(EPOCH FROM (b - a))");
    }

    #[test]
    fn interval_minutes_exceeded() {
        assert_eq!(
            b().interval_minutes_exceeded("earlier", "later", 30),
            "later - earlier > INTERVAL '30 minutes'"
        );
    }

    #[test]
    fn cast_to_text() {
        assert_eq!(b().cast_to_text("x"), "CAST(x AS TEXT)");
    }

    #[test]
    fn json_extract_string_simple() {
        assert_eq!(b().json_extract_string("props", "plan"), "json_extract_string(props, '$.plan')");
    }

    #[test]
    fn json_extract_string_nested() {
        assert_eq!(b().json_extract_string("props", "a.b"), "json_extract_string(props, '$.a.b')");
    }

    #[test]
    fn extract_hour() {
        assert_eq!(b().extract_hour("ts"), "CAST(EXTRACT(HOUR FROM ts) AS INTEGER)");
    }

    #[test]
    fn extract_day_of_week() {
        assert_eq!(b().extract_day_of_week("ts"), "CAST(EXTRACT(DAYOFWEEK FROM ts) AS INTEGER)");
    }

    #[test]
    fn extract_year() {
        assert_eq!(b().extract_year("ts"), "CAST(EXTRACT(YEAR FROM ts) AS INTEGER)");
    }

    #[test]
    fn extract_month() {
        assert_eq!(b().extract_month("ts"), "CAST(EXTRACT(MONTH FROM ts) AS INTEGER)");
    }

    #[test]
    fn extract_week() {
        assert_eq!(b().extract_week("ts"), "CAST(EXTRACT(WEEK FROM ts) AS INTEGER)");
    }

    #[test]
    fn extract_quarter() {
        assert_eq!(b().extract_quarter("ts"), "CAST(EXTRACT(QUARTER FROM ts) AS INTEGER)");
    }

    #[test]
    fn string_concat_two() {
        assert_eq!(b().string_concat(&["a", "b"]), "a || b");
    }

    #[test]
    fn string_concat_three() {
        assert_eq!(b().string_concat(&["a", "b", "c"]), "a || b || c");
    }

    #[test]
    fn prepend_events_cte_no_existing() {
        let result = b().prepend_events_cte("(SELECT * FROM tbl)", "SELECT * FROM events");
        assert!(result.starts_with("WITH events AS (SELECT * FROM tbl)"));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cargo test -p stratifio-backend -- connectors::drivers::duckdb
```
Expected: FAIL — `SqlDialect` not implemented for `DuckDbBackend`

- [ ] **Step 3: Implement `SqlDialect` for `DuckDbBackend`**

Add after the struct definition:

```rust
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

impl SqlDialect for DuckDbBackend {
    fn dialect_name(&self) -> &'static str { "duckdb" }
    fn identifier_quote_char(&self) -> char { '"' }

    fn date_trunc(&self, unit: &str, col: &str) -> String {
        format!("DATE_TRUNC('{unit}', {col})")
    }
    fn date_diff_days(&self, start: &str, end: &str) -> String {
        format!("DATE_DIFF('day', {start}, {end})")
    }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String {
        format!("EXTRACT(EPOCH FROM ({end} - {start}))")
    }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("{later} - {earlier} > INTERVAL '{minutes} minutes'")
    }
    fn cast_to_text(&self, expr: &str) -> String {
        format!("CAST({expr} AS TEXT)")
    }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        format!("json_extract_string({col}, '$.{key}')")
    }
    fn extract_hour(&self, col: &str) -> String {
        format!("CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)")
    }
    fn extract_day_of_week(&self, col: &str) -> String {
        format!("CAST(EXTRACT(DAYOFWEEK FROM {col}) AS INTEGER)")
    }
    fn extract_year(&self, col: &str) -> String {
        format!("CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)")
    }
    fn extract_month(&self, col: &str) -> String {
        format!("CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)")
    }
    fn extract_week(&self, col: &str) -> String {
        format!("CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)")
    }
    fn extract_quarter(&self, col: &str) -> String {
        format!("CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)")
    }
    fn string_concat(&self, parts: &[&str]) -> String {
        parts.join(" || ")
    }
    fn build_events_cte(
        &self,
        source_table: &str,
        uid_field: &str,
        ts_field: &str,
        en_field: &str,
        _custom_props: &[CustomProperty],
    ) -> String {
        let q = '"';
        let quoted_table = source_table
            .split('.')
            .map(|p| format!("{q}{p}{q}"))
            .collect::<Vec<_>>()
            .join(".");
        let core = format!(
            "{q}{uid_field}{q} AS user_id, {q}{ts_field}{q} AS timestamp, {q}{en_field}{q} AS event_name"
        );
        let excl = [uid_field, ts_field, en_field]
            .iter()
            .map(|c| format!("{q}{c}{q}"))
            .collect::<Vec<_>>()
            .join(", ");
        format!("(SELECT {core}, * EXCLUDE ({excl}) FROM {quoted_table})")
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let cte_def = format!("events AS {cte_body}");
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH {cte_def}, {}", &q[5..])
        } else {
            format!("WITH {cte_def} {q}")
        }
    }
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cargo test -p stratifio-backend -- connectors::drivers::duckdb
```
Expected: all 16 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend-rs/src/connectors/drivers/duckdb.rs
git commit -m "feat(rust/connectors): DuckDB SqlDialect impl + unit tests"
```

---

## Task 5: SQLite `SqlDialect` implementation + unit tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/sqlite.rs`

Python reference: `backend/backends/sqlite/__init__.py`

- [ ] **Step 1: Write failing tests**

```rust
pub struct SqliteBackend;
impl SqliteBackend { pub fn new() -> Self { Self } }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;
    fn b() -> SqliteBackend { SqliteBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "sqlite"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '"'); }
    #[test] fn date_trunc_day() { assert_eq!(b().date_trunc("day", "ts"), "DATE(ts)"); }
    #[test] fn date_trunc_hour() { assert_eq!(b().date_trunc("hour", "ts"), "STRFTIME('%Y-%m-%d %H:00:00', ts)"); }
    #[test] fn date_trunc_month() { assert_eq!(b().date_trunc("month", "ts"), "STRFTIME('%Y-%m-01', ts)"); }
    #[test] fn date_trunc_week() { assert_eq!(b().date_trunc("week", "ts"), "DATE(ts, 'weekday 1', '-6 days')"); }
    #[test] fn date_trunc_year() { assert_eq!(b().date_trunc("year", "ts"), "STRFTIME('%Y-01-01', ts)"); }
    #[test] fn date_diff_days() { assert_eq!(b().date_diff_days("a", "b"), "CAST(julianday(b) - julianday(a) AS INTEGER)"); }
    #[test] fn epoch_diff_seconds() { assert_eq!(b().epoch_diff_seconds("a", "b"), "(STRFTIME('%s', b) - STRFTIME('%s', a))"); }
    #[test] fn interval_minutes_exceeded() { assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "(STRFTIME('%s', l) - STRFTIME('%s', e)) > 1800"); }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "CAST(x AS TEXT)"); }
    #[test] fn json_extract_string() { assert_eq!(b().json_extract_string("props", "plan"), "json_extract(props, '$.plan')"); }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "CAST(STRFTIME('%H', ts) AS INTEGER)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "CAST(STRFTIME('%w', ts) AS INTEGER)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "a || b"); }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cargo test -p stratifio-backend -- connectors::drivers::sqlite
```

- [ ] **Step 3: Implement `SqlDialect` for `SqliteBackend`**

```rust
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

impl SqlDialect for SqliteBackend {
    fn dialect_name(&self) -> &'static str { "sqlite" }
    fn identifier_quote_char(&self) -> char { '"' }

    fn date_trunc(&self, unit: &str, col: &str) -> String {
        match unit {
            "hour"  => format!("STRFTIME('%Y-%m-%d %H:00:00', {col})"),
            "day"   => format!("DATE({col})"),
            "week"  => format!("DATE({col}, 'weekday 1', '-6 days')"),
            "month" => format!("STRFTIME('%Y-%m-01', {col})"),
            "year"  => format!("STRFTIME('%Y-01-01', {col})"),
            _       => format!("DATE({col})"),
        }
    }
    fn date_diff_days(&self, start: &str, end: &str) -> String {
        format!("CAST(julianday({end}) - julianday({start}) AS INTEGER)")
    }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String {
        format!("(STRFTIME('%s', {end}) - STRFTIME('%s', {start}))")
    }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("(STRFTIME('%s', {later}) - STRFTIME('%s', {earlier})) > {}", minutes * 60)
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("CAST({expr} AS TEXT)") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        format!("json_extract({col}, '$.{key}')")
    }
    fn extract_hour(&self, col: &str) -> String { format!("CAST(STRFTIME('%H', {col}) AS INTEGER)") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("CAST(STRFTIME('%w', {col}) AS INTEGER)") }
    fn extract_year(&self, col: &str) -> String { format!("CAST(STRFTIME('%Y', {col}) AS INTEGER)") }
    fn extract_month(&self, col: &str) -> String { format!("CAST(STRFTIME('%m', {col}) AS INTEGER)") }
    fn extract_week(&self, col: &str) -> String { format!("CAST(STRFTIME('%W', {col}) AS INTEGER)") }
    fn extract_quarter(&self, col: &str) -> String {
        format!("CAST((CAST(STRFTIME('%m', {col}) AS INTEGER) + 2) / 3 AS INTEGER)")
    }
    fn string_concat(&self, parts: &[&str]) -> String { parts.join(" || ") }

    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        // SQLite has no EXCLUDE — select only core columns
        format!(
            "(SELECT \"{uid_field}\" AS user_id, \"{ts_field}\" AS timestamp, \"{en_field}\" AS event_name FROM \"{source_table}\")"
        )
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let cte_def = format!("events AS {cte_body}");
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH {cte_def}, {}", &q[5..])
        } else {
            format!("WITH {cte_def} {q}")
        }
    }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
cargo test -p stratifio-backend -- connectors::drivers::sqlite
```

- [ ] **Step 5: Commit**

```bash
git add backend-rs/src/connectors/drivers/sqlite.rs
git commit -m "feat(rust/connectors): SQLite SqlDialect impl + unit tests"
```

---

## Task 6: PostgreSQL `SqlDialect` implementation + unit tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/postgres.rs`

Python reference: `backend/backends/postgresql/__init__.py`

- [ ] **Step 1: Write failing tests**

```rust
pub struct PostgresBackend;
impl PostgresBackend { pub fn new() -> Self { Self } }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;
    fn b() -> PostgresBackend { PostgresBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "postgres"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '"'); }
    #[test] fn date_trunc() { assert_eq!(b().date_trunc("day", "ts"), "DATE_TRUNC('day', ts)"); }
    #[test] fn date_diff_days() {
        assert_eq!(b().date_diff_days("a", "b"), "CAST(EXTRACT(DAY FROM (b::timestamp - a::timestamp)) AS INTEGER)");
    }
    #[test] fn epoch_diff_seconds() {
        assert_eq!(b().epoch_diff_seconds("a", "b"), "EXTRACT(EPOCH FROM (b - a))");
    }
    #[test] fn interval_minutes_exceeded() {
        assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "l - e > INTERVAL '30 minutes'");
    }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "CAST(x AS TEXT)"); }
    #[test] fn json_extract_simple() {
        assert_eq!(b().json_extract_string("props", "plan"), "props->>'plan'");
    }
    #[test] fn json_extract_nested() {
        assert_eq!(b().json_extract_string("props", "a.b"), "json_extract_path_text(props, 'a', 'b')");
    }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "CAST(EXTRACT(HOUR FROM ts) AS INTEGER)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "CAST(EXTRACT(DOW FROM ts) AS INTEGER)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "a || b"); }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cargo test -p stratifio-backend -- connectors::drivers::postgres
```

- [ ] **Step 3: Implement `SqlDialect` for `PostgresBackend`**

```rust
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

impl SqlDialect for PostgresBackend {
    fn dialect_name(&self) -> &'static str { "postgres" }
    fn identifier_quote_char(&self) -> char { '"' }

    fn date_trunc(&self, unit: &str, col: &str) -> String {
        format!("DATE_TRUNC('{unit}', {col})")
    }
    fn date_diff_days(&self, start: &str, end: &str) -> String {
        format!("CAST(EXTRACT(DAY FROM ({end}::timestamp - {start}::timestamp)) AS INTEGER)")
    }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String {
        format!("EXTRACT(EPOCH FROM ({end} - {start}))")
    }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("{later} - {earlier} > INTERVAL '{minutes} minutes'")
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("CAST({expr} AS TEXT)") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        let parts: Vec<&str> = key.split('.').collect();
        if parts.len() == 1 {
            format!("{col}->>'{key}'")
        } else {
            let keys = parts.iter().map(|p| format!("'{p}'")).collect::<Vec<_>>().join(", ");
            format!("json_extract_path_text({col}, {keys})")
        }
    }
    fn extract_hour(&self, col: &str) -> String { format!("CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("CAST(EXTRACT(DOW FROM {col}) AS INTEGER)") }
    fn extract_year(&self, col: &str) -> String { format!("CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)") }
    fn extract_month(&self, col: &str) -> String { format!("CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)") }
    fn extract_week(&self, col: &str) -> String { format!("CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)") }
    fn extract_quarter(&self, col: &str) -> String { format!("CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)") }
    fn string_concat(&self, parts: &[&str]) -> String { parts.join(" || ") }

    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        format!(
            "(SELECT \"{uid_field}\" AS user_id, \"{ts_field}\" AS timestamp, \"{en_field}\" AS event_name FROM \"{source_table}\")"
        )
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let cte_def = format!("events AS {cte_body}");
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH {cte_def}, {}", &q[5..])
        } else {
            format!("WITH {cte_def} {q}")
        }
    }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
cargo test -p stratifio-backend -- connectors::drivers::postgres
```

- [ ] **Step 5: Commit**

```bash
git add backend-rs/src/connectors/drivers/postgres.rs
git commit -m "feat(rust/connectors): PostgreSQL SqlDialect impl + unit tests"
```

---

## Task 7: ClickHouse `SqlDialect` implementation + unit tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/clickhouse.rs`

Python reference: `backend/backends/clickhouse/__init__.py`
Note: ClickHouse uses backtick (`` ` ``) as identifier quote char.

- [ ] **Step 1: Write failing tests**

```rust
pub struct ClickHouseBackend;
impl ClickHouseBackend { pub fn new() -> Self { Self } }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;
    fn b() -> ClickHouseBackend { ClickHouseBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "clickhouse"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '`'); }
    #[test] fn date_trunc_day() { assert_eq!(b().date_trunc("day", "ts"), "toStartOfDay(ts)"); }
    #[test] fn date_trunc_hour() { assert_eq!(b().date_trunc("hour", "ts"), "toStartOfHour(ts)"); }
    #[test] fn date_trunc_month() { assert_eq!(b().date_trunc("month", "ts"), "toStartOfMonth(ts)"); }
    #[test] fn date_trunc_week() { assert_eq!(b().date_trunc("week", "ts"), "toStartOfWeek(ts)"); }
    #[test] fn date_trunc_quarter() { assert_eq!(b().date_trunc("quarter", "ts"), "toStartOfQuarter(ts)"); }
    #[test] fn date_trunc_year() { assert_eq!(b().date_trunc("year", "ts"), "toStartOfYear(ts)"); }
    #[test] fn date_diff_days() { assert_eq!(b().date_diff_days("a", "b"), "dateDiff('day', a, b)"); }
    #[test] fn epoch_diff_seconds() { assert_eq!(b().epoch_diff_seconds("a", "b"), "dateDiff('second', a, b)"); }
    #[test] fn interval_minutes_exceeded() {
        assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "dateDiff('minute', e, l) > 30");
    }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "toString(x)"); }
    #[test] fn json_extract_string() {
        assert_eq!(b().json_extract_string("props", "plan"), "JSONExtractString(props, 'plan')");
    }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "toHour(ts)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "toDayOfWeek(ts)"); }
    #[test] fn extract_year() { assert_eq!(b().extract_year("ts"), "toYear(ts)"); }
    #[test] fn extract_month() { assert_eq!(b().extract_month("ts"), "toMonth(ts)"); }
    #[test] fn extract_week() { assert_eq!(b().extract_week("ts"), "toWeek(ts)"); }
    #[test] fn extract_quarter() { assert_eq!(b().extract_quarter("ts"), "toQuarter(ts)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "concat(a, b)"); }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cargo test -p stratifio-backend -- connectors::drivers::clickhouse
```

- [ ] **Step 3: Implement `SqlDialect` for `ClickHouseBackend`**

```rust
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

impl SqlDialect for ClickHouseBackend {
    fn dialect_name(&self) -> &'static str { "clickhouse" }
    fn identifier_quote_char(&self) -> char { '`' }

    fn date_trunc(&self, unit: &str, col: &str) -> String {
        let fn_name = match unit {
            "hour"    => "toStartOfHour",
            "day"     => "toStartOfDay",
            "week"    => "toStartOfWeek",
            "month"   => "toStartOfMonth",
            "quarter" => "toStartOfQuarter",
            "year"    => "toStartOfYear",
            _         => "toStartOfDay",
        };
        format!("{fn_name}({col})")
    }
    fn date_diff_days(&self, start: &str, end: &str) -> String { format!("dateDiff('day', {start}, {end})") }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String { format!("dateDiff('second', {start}, {end})") }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("dateDiff('minute', {earlier}, {later}) > {minutes}")
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("toString({expr})") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        format!("JSONExtractString({col}, '{key}')")
    }
    fn extract_hour(&self, col: &str) -> String { format!("toHour({col})") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("toDayOfWeek({col})") }
    fn extract_year(&self, col: &str) -> String { format!("toYear({col})") }
    fn extract_month(&self, col: &str) -> String { format!("toMonth({col})") }
    fn extract_week(&self, col: &str) -> String { format!("toWeek({col})") }
    fn extract_quarter(&self, col: &str) -> String { format!("toQuarter({col})") }
    fn string_concat(&self, parts: &[&str]) -> String {
        format!("concat({})", parts.join(", "))
    }
    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        format!(
            "(SELECT `{uid_field}` AS user_id, `{ts_field}` AS timestamp, `{en_field}` AS event_name FROM `{source_table}`)"
        )
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let cte_def = format!("events AS {cte_body}");
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH {cte_def}, {}", &q[5..])
        } else {
            format!("WITH {cte_def} {q}")
        }
    }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
cargo test -p stratifio-backend -- connectors::drivers::clickhouse
```

- [ ] **Step 5: Commit**

```bash
git add backend-rs/src/connectors/drivers/clickhouse.rs
git commit -m "feat(rust/connectors): ClickHouse SqlDialect impl + unit tests"
```

---

## Task 8: Snowflake `SqlDialect` implementation + unit tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/snowflake.rs`

Python reference: `backend/backends/snowflake/__init__.py`

- [ ] **Step 1: Write failing tests**

```rust
pub struct SnowflakeBackend;
impl SnowflakeBackend { pub fn new() -> Self { Self } }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;
    fn b() -> SnowflakeBackend { SnowflakeBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "snowflake"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '"'); }
    #[test] fn date_trunc() { assert_eq!(b().date_trunc("day", "ts"), "DATE_TRUNC('day', ts)"); }
    #[test] fn date_diff_days() { assert_eq!(b().date_diff_days("a", "b"), "DATEDIFF('day', a, b)"); }
    #[test] fn epoch_diff_seconds() { assert_eq!(b().epoch_diff_seconds("a", "b"), "DATEDIFF('second', a, b)"); }
    #[test] fn interval_minutes_exceeded() {
        assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "DATEDIFF('minute', e, l) > 30");
    }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "x::string"); }
    #[test] fn json_extract_string() {
        assert_eq!(b().json_extract_string("props", "plan"), "props:plan::string");
    }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "EXTRACT(HOUR FROM ts)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "DAYOFWEEK(ts)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "a || b"); }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cargo test -p stratifio-backend -- connectors::drivers::snowflake
```

- [ ] **Step 3: Implement `SqlDialect` for `SnowflakeBackend`**

```rust
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

impl SqlDialect for SnowflakeBackend {
    fn dialect_name(&self) -> &'static str { "snowflake" }
    fn identifier_quote_char(&self) -> char { '"' }

    fn date_trunc(&self, unit: &str, col: &str) -> String { format!("DATE_TRUNC('{unit}', {col})") }
    fn date_diff_days(&self, start: &str, end: &str) -> String { format!("DATEDIFF('day', {start}, {end})") }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String { format!("DATEDIFF('second', {start}, {end})") }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("DATEDIFF('minute', {earlier}, {later}) > {minutes}")
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("{expr}::string") }
    fn json_extract_string(&self, col: &str, key: &str) -> String { format!("{col}:{key}::string") }
    fn extract_hour(&self, col: &str) -> String { format!("EXTRACT(HOUR FROM {col})") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("DAYOFWEEK({col})") }
    fn extract_year(&self, col: &str) -> String { format!("EXTRACT(YEAR FROM {col})") }
    fn extract_month(&self, col: &str) -> String { format!("EXTRACT(MONTH FROM {col})") }
    fn extract_week(&self, col: &str) -> String { format!("EXTRACT(WEEK FROM {col})") }
    fn extract_quarter(&self, col: &str) -> String { format!("EXTRACT(QUARTER FROM {col})") }
    fn string_concat(&self, parts: &[&str]) -> String { parts.join(" || ") }

    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        format!(
            "(SELECT \"{uid_field}\" AS user_id, \"{ts_field}\" AS timestamp, \"{en_field}\" AS event_name FROM \"{source_table}\")"
        )
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH events AS {cte_body}, {}", &q[5..])
        } else {
            format!("WITH events AS {cte_body} {q}")
        }
    }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
cargo test -p stratifio-backend -- connectors::drivers::snowflake
```

- [ ] **Step 5: Commit**

```bash
git add backend-rs/src/connectors/drivers/snowflake.rs
git commit -m "feat(rust/connectors): Snowflake SqlDialect impl + unit tests"
```

---

## Task 9: Databricks `SqlDialect` implementation + unit tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/databricks.rs`

Python reference: `backend/backends/databricks/__init__.py`
Note: Databricks uses backtick (`` ` ``) as identifier quote char.

- [ ] **Step 1: Write failing tests**

```rust
pub struct DatabricksBackend;
impl DatabricksBackend { pub fn new() -> Self { Self } }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;
    fn b() -> DatabricksBackend { DatabricksBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "databricks"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '`'); }
    #[test] fn date_trunc() { assert_eq!(b().date_trunc("day", "ts"), "DATE_TRUNC('day', ts)"); }
    #[test] fn date_diff_days() { assert_eq!(b().date_diff_days("a", "b"), "DATEDIFF(b, a)"); }
    #[test] fn epoch_diff_seconds() {
        assert_eq!(b().epoch_diff_seconds("a", "b"), "(unix_timestamp(b) - unix_timestamp(a))");
    }
    #[test] fn interval_minutes_exceeded() {
        assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "(unix_timestamp(l) - unix_timestamp(e)) > 1800");
    }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "CAST(x AS STRING)"); }
    #[test] fn json_extract_string() {
        assert_eq!(b().json_extract_string("props", "plan"), "get_json_object(props, '$.plan')");
    }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "CAST(EXTRACT(HOUR FROM ts) AS INTEGER)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "CAST(EXTRACT(DAYOFWEEK FROM ts) AS INTEGER)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "a || b"); }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cargo test -p stratifio-backend -- connectors::drivers::databricks
```

- [ ] **Step 3: Implement `SqlDialect` for `DatabricksBackend`**

```rust
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

impl SqlDialect for DatabricksBackend {
    fn dialect_name(&self) -> &'static str { "databricks" }
    fn identifier_quote_char(&self) -> char { '`' }

    fn date_trunc(&self, unit: &str, col: &str) -> String { format!("DATE_TRUNC('{unit}', {col})") }
    fn date_diff_days(&self, start: &str, end: &str) -> String { format!("DATEDIFF({end}, {start})") }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String {
        format!("(unix_timestamp({end}) - unix_timestamp({start}))")
    }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("(unix_timestamp({later}) - unix_timestamp({earlier})) > {}", minutes * 60)
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("CAST({expr} AS STRING)") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        format!("get_json_object({col}, '$.{key}')")
    }
    fn extract_hour(&self, col: &str) -> String { format!("CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("CAST(EXTRACT(DAYOFWEEK FROM {col}) AS INTEGER)") }
    fn extract_year(&self, col: &str) -> String { format!("CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)") }
    fn extract_month(&self, col: &str) -> String { format!("CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)") }
    fn extract_week(&self, col: &str) -> String { format!("CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)") }
    fn extract_quarter(&self, col: &str) -> String { format!("CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)") }
    fn string_concat(&self, parts: &[&str]) -> String { parts.join(" || ") }

    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        format!(
            "(SELECT `{uid_field}` AS user_id, `{ts_field}` AS timestamp, `{en_field}` AS event_name FROM `{source_table}`)"
        )
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH events AS {cte_body}, {}", &q[5..])
        } else {
            format!("WITH events AS {cte_body} {q}")
        }
    }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
cargo test -p stratifio-backend -- connectors::drivers::databricks
```

- [ ] **Step 5: Run all dialect tests together**

```bash
cargo test -p stratifio-backend
```
Expected: all dialect tests pass (no I/O tests yet)

- [ ] **Step 6: Commit**

```bash
git add backend-rs/src/connectors/drivers/databricks.rs
git commit -m "feat(rust/connectors): Databricks SqlDialect impl + unit tests (all 6 dialects done)"
```

---

## Task 10: Actor infrastructure + `BackendConnection` enum

**Files:**
- Modify: `backend-rs/src/connectors/mod_types.rs`
- Modify: `backend-rs/src/connectors/drivers/duckdb.rs`
- Modify: `backend-rs/src/connectors/drivers/sqlite.rs`

This task builds the thread-actor infrastructure for DuckDB and SQLite (whose connections are not `Send`) and replaces the `BackendConnection` placeholder with the real enum.

- [ ] **Step 1: Define actor request types in `duckdb.rs`**

Add to `backend-rs/src/connectors/drivers/duckdb.rs`:

```rust
use tokio::sync::{mpsc, oneshot};
use crate::connectors::types::{BrowseNode, ColumnInfo, Row, SchemaInfo};
use anyhow::Result;

pub(crate) enum DuckDbRequest {
    Execute {
        query: String,
        params: Vec<String>,  // params serialized as strings for simplicity
        reply: oneshot::Sender<Result<Vec<Row>>>,
    },
    GetTables {
        reply: oneshot::Sender<Result<Vec<String>>>,
    },
    TableExists {
        table_name: String,
        reply: oneshot::Sender<Result<bool>>,
    },
    GetTableColumns {
        table: String,
        reply: oneshot::Sender<Result<Vec<ColumnInfo>>>,
    },
    GetColumnsForBrowse {
        table: String,
        reply: oneshot::Sender<Result<Vec<String>>>,
    },
    DetectSchema {
        hint: Option<String>,
        reply: oneshot::Sender<Result<SchemaInfo>>,
    },
    Browse {
        catalog: Option<String>,
        schema: Option<String>,
        reply: oneshot::Sender<Result<Vec<BrowseNode>>>,
    },
}

/// Send handle for a DuckDB actor thread. Is `Send + Sync`.
#[derive(Clone)]
pub struct DuckDbHandle {
    pub(crate) tx: mpsc::Sender<DuckDbRequest>,
}
```

- [ ] **Step 2: Define `run_duckdb_actor` in `duckdb.rs`**

```rust
fn run_duckdb_actor(conn: duckdb::Connection, mut rx: mpsc::Receiver<DuckDbRequest>) {
    while let Some(req) = rx.blocking_recv() {
        match req {
            DuckDbRequest::Execute { query, params: _, reply } => {
                let result = conn.prepare(&query)
                    .and_then(|mut stmt| {
                        let rows = stmt.query_map([], |row| {
                            // Collect row columns as SqlValue::Text for now
                            // Full type mapping done in Task 12
                            Ok(vec![])
                        })?;
                        rows.collect::<Result<Vec<_>, _>>()
                    })
                    .map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            DuckDbRequest::GetTables { reply } => {
                let result = conn.prepare(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY 1"
                ).and_then(|mut stmt| {
                    stmt.query_map([], |r| r.get::<_, String>(0))?.collect::<Result<Vec<_>, _>>()
                }).map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            DuckDbRequest::TableExists { table_name, reply } => {
                // Query information_schema — avoids triggering a scan and correctly returns false
                let exists = conn.query_row(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
                    [&table_name],
                    |r| r.get::<_, i64>(0),
                ).map(|n| n > 0).unwrap_or(false);
                let _ = reply.send(Ok(exists));
            }
            // DetectSchema, Browse, GetTableColumns, GetColumnsForBrowse: full impl in Task 12
            _ => {}
        }
    }
}
```

- [ ] **Step 3: Define `SqliteHandle` and actor in `sqlite.rs`**

Mirror the DuckDB pattern using `rusqlite`. Key differences from duckdb:
- In-memory: `rusqlite::Connection::open_in_memory()` (works correctly, no special-casing needed for `":memory:"`)
- Row access: `row.get::<usize, Value>(i)` with `rusqlite::types::Value`
- Params: use `rusqlite::params![]` macro or `[]` for no params
- `get_tables` query: `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
- `table_exists` query: `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1`

Provide this skeleton and fill in the actor loop:

```rust
pub(crate) enum SqliteRequest {
    Execute { query: String, reply: oneshot::Sender<Result<Vec<Row>>> },
    GetTables { reply: oneshot::Sender<Result<Vec<String>>> },
    TableExists { table_name: String, reply: oneshot::Sender<Result<bool>> },
    GetTableColumns { table: String, reply: oneshot::Sender<Result<Vec<ColumnInfo>>> },
    GetColumnsForBrowse { table: String, reply: oneshot::Sender<Result<Vec<String>>> },
    DetectSchema { hint: Option<String>, reply: oneshot::Sender<Result<SchemaInfo>> },
    Browse { catalog: Option<String>, schema: Option<String>, reply: oneshot::Sender<Result<Vec<BrowseNode>>> },
}

#[derive(Clone)]
pub struct SqliteHandle {
    pub(crate) tx: mpsc::Sender<SqliteRequest>,
}

fn run_sqlite_actor(conn: rusqlite::Connection, mut rx: mpsc::Receiver<SqliteRequest>) {
    while let Some(req) = rx.blocking_recv() {
        match req {
            SqliteRequest::GetTables { reply } => {
                let result = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                    .and_then(|mut stmt| stmt.query_map([], |r| r.get::<_, String>(0))
                        .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>()))
                    .map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            SqliteRequest::TableExists { table_name, reply } => {
                let exists = conn.query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    rusqlite::params![table_name],
                    |r| r.get::<_, i64>(0),
                ).map(|n| n > 0).unwrap_or(false);
                let _ = reply.send(Ok(exists));
            }
            // Implement Execute, GetTableColumns, GetColumnsForBrowse, DetectSchema, Browse
            // following the same pattern. Mirror Python backend/backends/sqlite/__init__.py logic.
            _ => {}
        }
    }
}
```

- [ ] **Step 4: Replace `BackendConnection` placeholder in `mod_types.rs`**

> **Note:** `BackendConnection` is `Send` but **not** `Sync` because `sqlx::pool::PoolConnection<Postgres>` is `Send` but not `Sync`. This is fine for passing `&mut BackendConnection` across async boundaries. If you ever need to share a connection across threads, use `tokio::sync::Mutex<BackendConnection>` (not `std::sync::Mutex`).

```rust
use crate::connectors::drivers::duckdb::DuckDbHandle;
use crate::connectors::drivers::sqlite::SqliteHandle;

pub enum BackendConnection {
    DuckDb(DuckDbHandle),
    Sqlite(SqliteHandle),
    Postgres(sqlx::pool::PoolConnection<sqlx::Postgres>),
    Snowflake(SnowflakeClient),     // stub type for now
    ClickHouse(ClickHouseClient),   // stub type for now
    Databricks(DatabricksClient),   // stub type for now
}

// Stub client types — will be replaced in Task 15
pub struct SnowflakeClient;
pub struct ClickHouseClient;
pub struct DatabricksClient;
```

- [ ] **Step 5: Verify compiles**

```bash
cargo build
```
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add backend-rs/src/connectors/
git commit -m "feat(rust/connectors): actor infrastructure for DuckDB/SQLite, BackendConnection enum"
```

---

## Task 11: DuckDB `DatabaseBackend` I/O implementation + integration tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/duckdb.rs`

Integration tests use DuckDB in-memory — no external infrastructure needed.

- [ ] **Step 1: Write failing integration test**

```rust
#[cfg(test)]
mod integration {
    use super::*;
    use crate::connectors::any_backend::AnyBackend;  // needed for open_any
    use crate::connectors::backend::DatabaseBackend;

    #[tokio::test]
    async fn open_and_get_tables() {
        let b = DuckDbBackend::new();
        // ":memory:" is special-cased in open() to call open_in_memory()
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = AnyBackend::open_any(&b, raw).await.unwrap();
        let tables = DatabaseBackend::get_tables(&b, &mut conn).await.unwrap();
        assert!(tables.is_empty()); // fresh in-memory DB
    }

    #[tokio::test]
    async fn table_exists_false() {
        let b = DuckDbBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = AnyBackend::open_any(&b, raw).await.unwrap();
        let exists = DatabaseBackend::table_exists(&b, &mut conn, "no_such_table").await.unwrap();
        assert!(!exists);
    }

    #[tokio::test]
    async fn execute_select_1() {
        let b = DuckDbBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = AnyBackend::open_any(&b, raw).await.unwrap();
        let rows = DatabaseBackend::execute(&b, &mut conn, "SELECT 1", vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
    }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cargo test -p stratifio-backend -- integration
```

- [ ] **Step 3: Add `DuckDbCredentials` and `DatabaseBackend` impl**

```rust
use serde::Deserialize;

#[derive(Deserialize)]
pub struct DuckDbCredentials {
    pub file_path: Option<String>,
    pub s3_path: Option<String>,
}

impl DuckDbCredentials {
    fn resolved_path(&self) -> anyhow::Result<&str> {
        self.file_path.as_deref()
            .or(self.s3_path.as_deref())
            .ok_or_else(|| anyhow::anyhow!("DuckDB requires file_path or s3_path"))
    }
}
```

Then implement `DatabaseBackend for DuckDbBackend`:

```rust
use async_trait::async_trait;
use crate::connectors::backend::DatabaseBackend;
use crate::connectors::mod_types::BackendConnection;
use crate::connectors::types::{BrowseNode, BrowseKind, ColumnInfo, Row, SchemaInfo, SqlValue};

#[async_trait]
impl DatabaseBackend for DuckDbBackend {
    type Credentials = DuckDbCredentials;

    async fn open(&self, creds: &DuckDbCredentials) -> anyhow::Result<BackendConnection> {
        let path = creds.resolved_path()?.to_owned();
        let (tx, rx) = tokio::sync::mpsc::channel(32);
        std::thread::spawn(move || {
            // Special-case ":memory:" — duckdb-rs does not treat it as a magic path
            let conn = if path == ":memory:" {
                duckdb::Connection::open_in_memory().expect("duckdb open_in_memory")
            } else {
                duckdb::Connection::open(&path).expect("duckdb open")
            };
            run_duckdb_actor(conn, rx);
        });
        Ok(BackendConnection::DuckDb(DuckDbHandle { tx }))
    }

    async fn execute(&self, conn: &mut BackendConnection, query: &str, _params: Vec<SqlValue>) -> anyhow::Result<Vec<Row>> {
        let BackendConnection::DuckDb(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(DuckDbRequest::Execute { query: query.to_owned(), params: vec![], reply: tx }).await?;
        rx.await?
    }

    async fn get_tables(&self, conn: &mut BackendConnection) -> anyhow::Result<Vec<String>> {
        let BackendConnection::DuckDb(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(DuckDbRequest::GetTables { reply: tx }).await?;
        rx.await?
    }

    async fn table_exists(&self, conn: &mut BackendConnection, table_name: &str) -> anyhow::Result<bool> {
        let BackendConnection::DuckDb(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(DuckDbRequest::TableExists { table_name: table_name.to_owned(), reply: tx }).await?;
        rx.await?
    }

    // Implement get_table_columns, get_columns_for_browse, detect_schema, browse
    // following the same send/recv pattern. Mirror logic from backend/backends/duckdb/__init__.py.

    fn is_connection_error(&self, _err: &anyhow::Error) -> bool { false }

    // Stub remaining methods for now — fill in following Python logic
    async fn get_table_columns(&self, _conn: &mut BackendConnection, _table: &str) -> anyhow::Result<Vec<ColumnInfo>> { todo!() }
    async fn get_columns_for_browse(&self, _conn: &mut BackendConnection, _table: &str) -> anyhow::Result<Vec<String>> { todo!() }
    async fn detect_schema(&self, _conn: &mut BackendConnection, _hint: Option<&str>) -> anyhow::Result<SchemaInfo> { todo!() }
    async fn browse(&self, _conn: &mut BackendConnection, _catalog: Option<&str>, _schema: Option<&str>) -> anyhow::Result<Vec<BrowseNode>> { todo!() }
}
```

- [ ] **Step 4: Implement full `run_duckdb_actor` with row mapping**

Replace the skeleton `run_duckdb_actor` with full row-to-`SqlValue` mapping, and implement `DetectSchema`, `GetTableColumns`, `GetColumnsForBrowse`, `Browse` request handlers. Mirror the Python `DuckDBBackend` logic directly.

Row mapping (inside actor execute handler). **Important:** check the actual `duckdb::types::ValueRef` enum variant names in the crate docs before writing this — the names differ between versions (e.g. `Integer` not `SmallInt`, `Real` not `Float`). A safe starting point:

```rust
fn map_value(val: duckdb::types::ValueRef<'_>) -> SqlValue {
    match val {
        duckdb::types::ValueRef::Null => SqlValue::Null,
        duckdb::types::ValueRef::Boolean(b) => SqlValue::Bool(b),
        duckdb::types::ValueRef::TinyInt(i) => SqlValue::Int(i as i64),
        duckdb::types::ValueRef::SmallInt(i) => SqlValue::Int(i as i64),
        duckdb::types::ValueRef::Int(i) => SqlValue::Int(i as i64),
        duckdb::types::ValueRef::BigInt(i) => SqlValue::Int(i),
        duckdb::types::ValueRef::Float(f) => SqlValue::Float(f as f64),
        duckdb::types::ValueRef::Double(f) => SqlValue::Float(f),
        duckdb::types::ValueRef::Text(s) => SqlValue::Text(String::from_utf8_lossy(s).into_owned()),
        other => SqlValue::Text(format!("{other:?}")),
    }
}
```

Verify variant names compile against your installed `duckdb` version; adjust if needed.

- [ ] **Step 5: Run integration tests — all pass**

```bash
cargo test -p stratifio-backend -- integration
```

- [ ] **Step 6: Run all tests**

```bash
cargo test -p stratifio-backend
```

- [ ] **Step 7: Commit**

```bash
git add backend-rs/src/connectors/drivers/duckdb.rs
git commit -m "feat(rust/connectors): DuckDB DatabaseBackend impl + integration tests"
```

---

## Task 12: SQLite `DatabaseBackend` I/O implementation + integration tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/sqlite.rs`

Python reference: `backend/backends/sqlite/__init__.py`. Mirror the same actor pattern as DuckDB.

- [ ] **Step 1: Add integration tests**

```rust
#[cfg(test)]
mod integration {
    use super::*;
    use crate::connectors::backend::DatabaseBackend;

    #[tokio::test]
    async fn open_and_get_tables_empty() {
        let b = SqliteBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = b.open_any(raw).await.unwrap();
        let tables = DatabaseBackend::get_tables(&b, &mut conn).await.unwrap();
        assert!(tables.is_empty());
    }

    #[tokio::test]
    async fn execute_select_1() {
        let b = SqliteBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = b.open_any(raw).await.unwrap();
        let rows = DatabaseBackend::execute(&b, &mut conn, "SELECT 1", vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
    }

    #[tokio::test]
    async fn table_exists_false() {
        let b = SqliteBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = b.open_any(raw).await.unwrap();
        assert!(!DatabaseBackend::table_exists(&b, &mut conn, "nope").await.unwrap());
    }
}
```

- [ ] **Step 2: Add `SqliteCredentials` and implement `DatabaseBackend`**

```rust
#[derive(serde::Deserialize)]
pub struct SqliteCredentials {
    pub file_path: String,  // use ":memory:" for in-memory
}
```

Then implement `DatabaseBackend for SqliteBackend`. `open()` spawns the actor thread using `SqliteHandle` from Task 10. All I/O methods send requests to the actor and await `oneshot` replies.

Row mapping from `rusqlite::types::Value`:
- `Value::Integer(i)` → `SqlValue::Int(i)`
- `Value::Real(f)` → `SqlValue::Float(f)`
- `Value::Text(s)` → `SqlValue::Text(s)`
- `Value::Blob(_)` → `SqlValue::Null`
- `Value::Null` → `SqlValue::Null`

- [ ] **Step 3: Run all tests**

```bash
cargo test -p stratifio-backend
```

- [ ] **Step 4: Commit**

```bash
git add backend-rs/src/connectors/drivers/sqlite.rs
git commit -m "feat(rust/connectors): SQLite DatabaseBackend impl + integration tests"
```

---

## Task 13: PostgreSQL `DatabaseBackend` I/O implementation + integration tests

**Files:**
- Modify: `backend-rs/src/connectors/drivers/postgres.rs`

Python reference: `backend/backends/postgresql/__init__.py`

Integration tests require Docker (PostgreSQL testcontainer) — gated by `STRATIFIO_TEST_POSTGRES=1`.

- [ ] **Step 1: Add `PostgresCredentials`**

```rust
use serde::Deserialize;

#[derive(Deserialize)]
pub struct PostgresCredentials {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub password: String,
}

impl PostgresCredentials {
    pub fn connection_string(&self) -> String {
        format!(
            "postgresql://{}:{}@{}:{}/{}",
            self.user, self.password, self.host, self.port, self.database
        )
    }
}
```

- [ ] **Step 2: Implement `DatabaseBackend for PostgresBackend`**

`PostgresBackend` holds a `tokio::sync::OnceCell<sqlx::PgPool>` per credentials. For simplicity in this task, create a fresh pool on each `open()` call (optimization deferred).

```rust
use async_trait::async_trait;
use anyhow::Result;

#[async_trait]
impl DatabaseBackend for PostgresBackend {
    type Credentials = PostgresCredentials;

    async fn open(&self, creds: &PostgresCredentials) -> Result<BackendConnection> {
        let pool = sqlx::PgPool::connect(&creds.connection_string()).await?;
        let conn = pool.acquire().await?;
        Ok(BackendConnection::Postgres(conn))
    }

    async fn execute(&self, conn: &mut BackendConnection, query: &str, params: Vec<SqlValue>) -> Result<Vec<Row>> {
        let BackendConnection::Postgres(conn) = conn else { anyhow::bail!("wrong connection type") };
        let rows = sqlx::query(query).fetch_all(conn.as_mut()).await?;
        // Map sqlx Row → Vec<SqlValue>
        Ok(rows.into_iter().map(|r| map_pg_row(&r)).collect())
    }

    async fn get_tables(&self, conn: &mut BackendConnection) -> Result<Vec<String>> {
        let rows = self.execute(conn,
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
            vec![]).await?;
        Ok(rows.into_iter().filter_map(|r| {
            r.into_iter().next().and_then(|v| if let SqlValue::Text(s) = v { Some(s) } else { None })
        }).collect())
    }

    async fn table_exists(&self, conn: &mut BackendConnection, table_name: &str) -> Result<bool> {
        let rows = self.execute(conn,
            &format!("SELECT 1 FROM information_schema.tables WHERE table_name = '{table_name}' LIMIT 1"),
            vec![]).await?;
        Ok(!rows.is_empty())
    }

    fn is_connection_error(&self, err: &anyhow::Error) -> bool {
        err.to_string().contains("connection refused") || err.to_string().contains("timeout")
    }

    async fn get_table_columns(&self, _conn: &mut BackendConnection, _table: &str) -> Result<Vec<ColumnInfo>> { todo!() }
    async fn get_columns_for_browse(&self, _conn: &mut BackendConnection, _table: &str) -> Result<Vec<String>> { todo!() }
    async fn detect_schema(&self, _conn: &mut BackendConnection, _hint: Option<&str>) -> Result<SchemaInfo> { todo!() }
    async fn browse(&self, _conn: &mut BackendConnection, _catalog: Option<&str>, _schema: Option<&str>) -> Result<Vec<BrowseNode>> { todo!() }
}

fn map_pg_row(row: &sqlx::postgres::PgRow) -> Row {
    use sqlx::Row;
    (0..row.len()).map(|i| {
        row.try_get::<i64, _>(i).map(SqlValue::Int)
            .or_else(|_| row.try_get::<f64, _>(i).map(SqlValue::Float))
            .or_else(|_| row.try_get::<bool, _>(i).map(SqlValue::Bool))
            .or_else(|_| row.try_get::<String, _>(i).map(SqlValue::Text))
            .unwrap_or(SqlValue::Null)
    }).collect()
}
```

- [ ] **Step 3: Add integration tests gated by env var**

```rust
#[cfg(test)]
mod integration {
    use super::*;
    use crate::connectors::backend::DatabaseBackend;

    fn pg_url() -> Option<String> {
        std::env::var("STRATIFIO_TEST_POSTGRES").ok().map(|_| {
            std::env::var("STRATIFIO_POSTGRES_URL")
                .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/postgres".to_string())
        })
    }

    #[tokio::test]
    async fn get_tables_smoke() {
        let Some(url) = pg_url() else { return };
        // test runs only when STRATIFIO_TEST_POSTGRES=1
        let b = PostgresBackend::new();
        let creds: PostgresCredentials = serde_json::from_str(&format!(
            r#"{{"host":"localhost","port":5432,"database":"postgres","user":"postgres","password":"postgres"}}"#
        )).unwrap();
        let mut conn = b.open(&creds).await.unwrap();
        let _ = DatabaseBackend::get_tables(&b, &mut conn).await.unwrap();
    }
}
```

- [ ] **Step 4: Run unit tests (integration skipped without env var)**

```bash
cargo test -p stratifio-backend
```

- [ ] **Step 5: Commit**

```bash
git add backend-rs/src/connectors/drivers/postgres.rs
git commit -m "feat(rust/connectors): PostgreSQL DatabaseBackend impl + gated integration tests"
```

---

## Task 14: Cloud driver stubs (Snowflake, ClickHouse, Databricks)

**Files:**
- Modify: `backend-rs/src/connectors/drivers/snowflake.rs`
- Modify: `backend-rs/src/connectors/drivers/clickhouse.rs`
- Modify: `backend-rs/src/connectors/drivers/databricks.rs`
- Modify: `backend-rs/src/connectors/mod_types.rs`

These three use HTTP-based or native async clients. This task produces minimal `DatabaseBackend` impls that compile and return `Err(anyhow!("not yet implemented"))` for I/O methods, so the registry can include them and the system compiles end-to-end.

- [ ] **Step 1: Add real client types to `mod_types.rs`**

Replace stub client structs with minimal wrappers:

```rust
// Snowflake — reqwest-based HTTP client
pub struct SnowflakeClient {
    pub http: reqwest::Client,
    pub account: String,
    pub token: String,   // JWT or session token
}

// ClickHouse — from clickhouse-rs
pub use clickhouse::Client as ClickHouseClient;

// Databricks — reqwest-based HTTP client
pub struct DatabricksClient {
    pub http: reqwest::Client,
    pub host: String,
    pub token: String,
}
```

- [ ] **Step 2: Add credential types for each driver**

In each driver file, add a `Credentials` struct deserializable from JSON. Mirror the Python credential models in `backend/backends/<driver>/credentials.py`.

Snowflake: `account`, `user`, `password`, `warehouse`, `database`, `schema`.
ClickHouse: `host`, `port`, `database`, `user`, `password`.
Databricks: `host`, `http_path`, `token`.

- [ ] **Step 3: Implement stub `DatabaseBackend` for each**

For each driver, implement `DatabaseBackend` with:
- `open()` — creates the HTTP client and returns the `BackendConnection` variant
- All I/O methods — `Err(anyhow!("not yet implemented"))`
- `is_connection_error()` — checks for HTTP 401/403/connection errors

- [ ] **Step 4: Verify all three compile**

```bash
cargo build
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add backend-rs/src/connectors/drivers/snowflake.rs backend-rs/src/connectors/drivers/clickhouse.rs backend-rs/src/connectors/drivers/databricks.rs backend-rs/src/connectors/mod_types.rs
git commit -m "feat(rust/connectors): Snowflake, ClickHouse, Databricks stub DatabaseBackend impls"
```

---

## Task 15: `BackendRegistry` + registry test

**Files:**
- Modify: `backend-rs/src/connectors/mod.rs`

- [ ] **Step 1: Write failing registry test**

> **Note on testcontainers:** The spec mentions PostgreSQL testcontainers for integration tests. This plan instead gates PostgreSQL tests behind `STRATIFIO_TEST_POSTGRES=1` and assumes Postgres is running locally (e.g. via `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`). Adding testcontainers is a follow-up.

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_has_all_drivers() {
        let reg = BackendRegistry::default();  // impl Default
        let cases = [
            ("duckdb",      "duckdb"),
            ("sqlite",      "sqlite"),
            ("postgresql",  "postgres"),
            ("snowflake",   "snowflake"),
            ("clickhouse",  "clickhouse"),
            ("databricks",  "databricks"),
        ];
        for (key, expected_dialect) in cases {
            let b = reg.get(key).expect(key);
            assert_eq!(b.dialect_name(), expected_dialect, "dialect_name mismatch for {key}");
        }
    }

    #[test]
    fn registry_unknown_key_errors() {
        let reg = BackendRegistry::default();
        assert!(reg.get("oracle").is_err());
    }
}
```

- [ ] **Step 2: Run — verify test fails**

```bash
cargo test -p stratifio-backend -- registry
```
Expected: FAIL — `BackendRegistry` not defined

- [ ] **Step 3: Implement `BackendRegistry` in `connectors/mod.rs`**

```rust
use std::collections::HashMap;
use anyhow::{anyhow, Result};

use crate::connectors::any_backend::AnyBackend;
use crate::connectors::drivers::{
    clickhouse::ClickHouseBackend,
    databricks::DatabricksBackend,
    duckdb::DuckDbBackend,
    postgres::PostgresBackend,
    snowflake::SnowflakeBackend,
    sqlite::SqliteBackend,
};

pub struct BackendRegistry {
    backends: HashMap<String, Box<dyn AnyBackend>>,
}

impl Default for BackendRegistry {
    fn default() -> Self {
        let mut r = Self { backends: HashMap::new() };
        r.register("duckdb",      DuckDbBackend::new());
        r.register("sqlite",      SqliteBackend::new());
        r.register("postgresql",  PostgresBackend::new());
        r.register("snowflake",   SnowflakeBackend::new());
        r.register("clickhouse",  ClickHouseBackend::new());
        r.register("databricks",  DatabricksBackend::new());
        r
    }
}

impl BackendRegistry {
    pub fn register<B: AnyBackend + 'static>(&mut self, name: &str, backend: B) {
        self.backends.insert(name.to_string(), Box::new(backend));
    }

    pub fn get(&self, db_type: &str) -> Result<&dyn AnyBackend> {
        self.backends
            .get(db_type)
            .map(|b| b.as_ref())
            .ok_or_else(|| anyhow!("Unsupported db_type: {db_type}"))
    }
}

// Note: BackendRegistry::default() is now via `impl Default`.
// Use `BackendRegistry::default()` or `BackendRegistry { ..Default::default() }` at call sites.
```

- [ ] **Step 4: Run registry tests — both pass**

```bash
cargo test -p stratifio-backend -- registry
```

- [ ] **Step 5: Run full test suite**

```bash
cargo test -p stratifio-backend
```
Expected: all dialect unit tests + DuckDB/SQLite integration tests pass; PostgreSQL integration skipped (no env var)

- [ ] **Step 6: Run clippy — zero warnings**

```bash
cargo clippy -- -D warnings
```

- [ ] **Step 7: Final commit**

```bash
git add backend-rs/src/connectors/mod.rs
git commit -m "feat(rust/connectors): BackendRegistry + registry tests — connector system complete"
```

---

## Running Tests

```bash
# All unit tests (no DB needed)
cargo test -p stratifio-backend

# With PostgreSQL integration tests
STRATIFIO_TEST_POSTGRES=1 STRATIFIO_POSTGRES_URL=postgresql://... cargo test -p stratifio-backend

# Lint
cargo clippy -- -D warnings

# Format check
cargo fmt --check
```
