# Rust Backend Connector System — Design Spec

**Date:** 2026-03-22

## Goal

Design and implement the database connector subsystem for the stratif.io Rust backend. This replaces the Python `DatabaseBackend` Protocol and its 6 driver implementations with idiomatic Rust: two traits (`SqlDialect` + `DatabaseBackend`), an object-safe `AnyBackend` trait for the registry, and concrete drivers for DuckDB, SQLite, PostgreSQL, Snowflake, ClickHouse, and Databricks.

This is sub-project 2 of the stratif.io Rust backend rewrite. It assumes no other Rust backend subsystems exist yet. The output is a standalone `connectors` module within `backend/src/`.

---

## Scope

**In scope:**
- Core types (`SqlValue`, `Row`, `ColumnInfo`, `SchemaInfo`, `CustomProperty`, `BrowseNode`)
- `SqlDialect` trait — pure, sync, dialect-specific SQL generation
- `DatabaseBackend` trait — async I/O (extends `SqlDialect`)
- `AnyBackend` trait — object-safe, used by registry
- Blanket impl converting `DatabaseBackend` → `AnyBackend`
- `BackendConnection` enum — wraps all concrete connection types
- `BackendRegistry` — `HashMap<String, Box<dyn AnyBackend>>`
- 6 driver implementations: DuckDB, SQLite, PostgreSQL, Snowflake, ClickHouse, Databricks
- Unit tests for all `SqlDialect` implementations (no DB required)
- Integration tests for `execute`, `get_tables`, `detect_schema` per driver (require live DB or testcontainer)

**Out of scope:**
- Credential encryption (crypto subsystem, separate sub-project)
- Connection pooling above the driver level (each driver owns its pool internally)
- SQL builder / analytics query generation (separate sub-project)
- API routes (separate sub-project)
- Auth / JWT (separate sub-project)

---

## Module Structure

```
backend/src/
└── connectors/
    ├── mod.rs          # BackendConnection enum, BackendRegistry
    ├── types.rs        # SqlValue, Row, ColumnInfo, SchemaInfo, CustomProperty, BrowseNode
    ├── dialect.rs      # SqlDialect trait
    ├── backend.rs      # DatabaseBackend trait
    ├── any_backend.rs  # AnyBackend trait + blanket impl
    └── drivers/
        ├── mod.rs
        ├── duckdb.rs
        ├── sqlite.rs
        ├── postgres.rs
        ├── snowflake.rs
        ├── clickhouse.rs
        └── databricks.rs
```

---

## Core Types

```rust
// connectors/types.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub sql_type: String,   // raw SQL type e.g. "VARCHAR", "BIGINT"
}

#[derive(Debug, Clone)]
pub struct SchemaInfo {
    pub tables: Vec<String>,
    pub events_table: String,
    pub columns: Vec<ColumnInfo>,
    pub suggestions: HashMap<String, String>,   // "user_id_field" -> "user_id"
    pub proposed_custom_properties: Vec<CustomProperty>,
}

#[derive(Debug, Clone)]
pub struct CustomProperty {
    pub name: String,
    pub path: String,       // e.g. "properties.plan"
    pub prop_type: String,  // "string" | "number" | "boolean" | "timestamp"
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowseNode {
    pub name: String,
    pub full_name: String,
    pub kind: String,       // "schema" | "table"
}
```

---

## `SqlDialect` Trait

Pure, sync, no I/O. Every backend implements this. Testable without a database connection.

```rust
// connectors/dialect.rs

pub trait SqlDialect: Send + Sync {
    fn dialect_name(&self) -> &'static str;
    fn identifier_quote_char(&self) -> char;

    // Date / time
    fn date_trunc(&self, unit: &str, col: &str) -> String;
    fn date_diff_days(&self, start: &str, end: &str) -> String;
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String;
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String;

    // Type casting & extraction
    fn cast_to_text(&self, expr: &str) -> String;
    fn json_extract_string(&self, col: &str, key: &str) -> String;
    fn extract_hour(&self, col: &str) -> String;
    fn extract_day_of_week(&self, col: &str) -> String;
    fn extract_year(&self, col: &str) -> String;
    fn extract_month(&self, col: &str) -> String;
    fn extract_week(&self, col: &str) -> String;
    fn extract_quarter(&self, col: &str) -> String;

    // String ops
    fn string_concat(&self, parts: &[&str]) -> String;

    // CTE building
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

---

## `DatabaseBackend` Trait

Async I/O. Extends `SqlDialect`. Has an associated `Credentials` type — parsed from `serde_json::Value` at the `AnyBackend` boundary.

```rust
// connectors/backend.rs

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

    async fn get_table_columns(
        &self,
        conn: &mut BackendConnection,
        table: &str,
    ) -> Result<Vec<ColumnInfo>>;

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

---

## `AnyBackend` Trait & Registry

Object-safe (no associated types). `open_any` deserializes credentials from `serde_json::Value`. A blanket impl converts every `DatabaseBackend` to `AnyBackend` automatically.

```rust
// connectors/any_backend.rs

#[async_trait]
pub trait AnyBackend: Send + Sync {
    // Dialect (pure, sync)
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

    // I/O (async, type-erased credentials)
    async fn open_any(&self, raw: serde_json::Value) -> Result<BackendConnection>;
    async fn execute_any(
        &self, conn: &mut BackendConnection,
        query: &str, params: Vec<SqlValue>,
    ) -> Result<Vec<Row>>;
    async fn get_tables(&self, conn: &mut BackendConnection) -> Result<Vec<String>>;
    async fn get_table_columns(
        &self, conn: &mut BackendConnection, table: &str,
    ) -> Result<Vec<ColumnInfo>>;
    async fn detect_schema(
        &self, conn: &mut BackendConnection, hint: Option<&str>,
    ) -> Result<SchemaInfo>;
    async fn browse(
        &self, conn: &mut BackendConnection,
        catalog: Option<&str>, schema: Option<&str>,
    ) -> Result<Vec<BrowseNode>>;
    fn is_connection_error(&self, err: &anyhow::Error) -> bool;
}

// Blanket impl
#[async_trait]
impl<B> AnyBackend for B
where
    B: DatabaseBackend + Send + Sync,
    B::Credentials: DeserializeOwned + Send + Sync,
{
    fn dialect_name(&self) -> &'static str { SqlDialect::dialect_name(self) }
    // ... all dialect methods delegate to self via SqlDialect ...

    async fn open_any(&self, raw: serde_json::Value) -> Result<BackendConnection> {
        let creds = serde_json::from_value::<B::Credentials>(raw)?;
        self.open(&creds).await
    }
    // ... all I/O methods delegate to self via DatabaseBackend ...
}
```

```rust
// connectors/mod.rs

pub struct BackendRegistry {
    backends: HashMap<String, Box<dyn AnyBackend>>,
}

impl BackendRegistry {
    pub fn default() -> Self {
        let mut r = Self { backends: HashMap::new() };
        r.register("duckdb",      DuckDbBackend::new());
        r.register("sqlite",      SqliteBackend::new());
        r.register("postgres",    PostgresBackend::new());
        r.register("snowflake",   SnowflakeBackend::new());
        r.register("clickhouse",  ClickHouseBackend::new());
        r.register("databricks",  DatabricksBackend::new());
        r
    }

    pub fn register<B: AnyBackend + 'static>(&mut self, name: &str, backend: B) {
        self.backends.insert(name.to_string(), Box::new(backend));
    }

    pub fn get(&self, db_type: &str) -> Result<&dyn AnyBackend> {
        self.backends.get(db_type)
            .map(|b| b.as_ref())
            .ok_or_else(|| anyhow!("Unsupported db_type: {db_type}"))
    }
}
```

---

## `BackendConnection` Enum

```rust
// connectors/mod.rs

pub enum BackendConnection {
    DuckDb(duckdb::Connection),
    Sqlite(rusqlite::Connection),
    Postgres(sqlx::pool::PoolConnection<sqlx::Postgres>),
    Snowflake(SnowflakeConnection),     // from snowflake-connector-rs or HTTP client
    ClickHouse(clickhouse::Client),     // from clickhouse-rs
    Databricks(DatabricksConnection),   // HTTP client wrapping Databricks SQL REST API
}
```

---

## Driver Design Notes

### DuckDB & SQLite — sync drivers

`duckdb-rs` and `rusqlite` are synchronous. All calls must go through `tokio::task::spawn_blocking` to avoid blocking the async runtime.

```rust
async fn open(&self, creds: &DuckDbCredentials) -> Result<BackendConnection> {
    let path = creds.resolved_path()?.to_owned();
    let conn = tokio::task::spawn_blocking(move || {
        duckdb::Connection::open(&path)
    }).await??;
    Ok(BackendConnection::DuckDb(conn))
}
```

Note: `duckdb::Connection` is not `Send` — it must be created and used within the same `spawn_blocking` closure or pinned to a dedicated thread. Each query spawns its own blocking task with a fresh or cloned connection handle.

### PostgreSQL — sqlx

`PostgresBackend` holds a `sqlx::PgPool` internally, initialized at `new()` time or lazily on first `open()`. `open()` checks out a connection from the pool.

### Snowflake, ClickHouse, Databricks

No mature pure-Rust drivers exist for all of these. Use HTTP-based clients:
- **Snowflake** — Snowflake SQL REST API (HTTP + JWT auth)
- **ClickHouse** — `clickhouse-rs` crate (native protocol) or HTTP interface
- **Databricks** — Databricks SQL REST API (HTTP + token auth)

These are async natively (reqwest-based). `BackendConnection` for these holds the HTTP client + session state.

---

## Key Dependencies

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
anyhow = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
duckdb = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-rustls"] }
reqwest = { version = "0.11", features = ["json"] }
```

---

## Testing Strategy

### Unit tests — `SqlDialect` (no DB required)

Every dialect method gets a unit test asserting the generated SQL string. These live in `connectors/drivers/<driver>.rs` under `#[cfg(test)]`.

```rust
#[test]
fn duckdb_date_trunc() {
    let b = DuckDbBackend::new();
    assert_eq!(b.date_trunc("day", "ts"), "DATE_TRUNC('day', ts)");
}

#[test]
fn duckdb_json_extract() {
    let b = DuckDbBackend::new();
    assert_eq!(
        b.json_extract_string("props", "plan"),
        "json_extract_string(props, '$.plan')"
    );
}
```

### Integration tests — I/O methods

Live DB or testcontainer per driver. Test `open`, `get_tables`, `execute`, `detect_schema`. These are gated behind a feature flag or env var so CI can run unit tests only without DB infrastructure.

### Registry test

Verify all 6 drivers are registered and `get()` returns the correct `dialect_name`.

---

## Out of Scope

- Credential encryption — handled by crypto subsystem (sub-project 1)
- SQL builder — separate sub-project that consumes `SqlDialect`
- API routes — separate sub-project
- Auth / JWT — separate sub-project
- Migration tooling for product DB
