# Rust Backend Connector System — Design Spec

**Date:** 2026-03-22

## Goal

Design and implement the database connector subsystem for the stratif.io Rust backend. This replaces the Python `DatabaseBackend` Protocol and its 6 driver implementations with idiomatic Rust: two traits (`SqlDialect` + `DatabaseBackend`), an object-safe `AnyBackend` trait for the registry, and concrete drivers for DuckDB, SQLite, PostgreSQL, Snowflake, ClickHouse, and Databricks.

This is sub-project 2 of the stratif.io Rust backend rewrite. It assumes no other Rust backend subsystems exist yet. The output is a standalone `connectors` module within `backend/src/`.

---

## Scope

**In scope:**
- Core types (`SqlValue`, `Row`, `ColumnInfo`, `SchemaInfo`, `CustomProperty`, `BrowseNode`, `BrowseKind`)
- `SqlDialect` trait — pure, sync, dialect-specific SQL generation
- `DatabaseBackend` trait — async I/O (extends `SqlDialect`)
- `AnyBackend` trait — object-safe, used by registry
- Blanket impl converting `DatabaseBackend` → `AnyBackend`
- `BackendConnection` enum — wraps all concrete connection types
- `BackendRegistry` — `HashMap<String, Box<dyn AnyBackend>>`
- 6 driver implementations: DuckDB, SQLite, PostgreSQL, Snowflake, ClickHouse, Databricks
- Unit tests for all `SqlDialect` implementations (no DB required)
- Integration tests for `execute`, `get_tables`, `detect_schema`, `table_exists` per driver

**Out of scope:**
- Credential encryption (crypto subsystem, separate sub-project)
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BrowseKind { Schema, Table }

#[derive(Debug, Clone, Serialize)]
pub struct BrowseNode {
    pub name: String,
    pub full_name: String,
    pub kind: BrowseKind,
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

Async I/O. Extends `SqlDialect`. Has an associated `Credentials` type — parsed from `serde_json::Value` at the `AnyBackend` boundary. Credential validation is the responsibility of the `Deserialize` impl on each `Credentials` type; there is no separate `parse_credentials` method (unlike Python).

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

    /// Returns column names for a given table, used during browse.
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

---

## `AnyBackend` Trait & Registry

Object-safe (no associated types). `open_any` deserializes credentials from `serde_json::Value`. A blanket impl converts every `DatabaseBackend` to `AnyBackend` automatically. All `SqlDialect` methods in `AnyBackend` forward via `<Self as SqlDialect>::method_name(self, ...)`.

```rust
// connectors/any_backend.rs

#[async_trait]
pub trait AnyBackend: Send + Sync {
    // Dialect (pure, sync) — all forward to SqlDialect impl
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
    async fn table_exists(&self, conn: &mut BackendConnection, table_name: &str) -> Result<bool>;
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

// Blanket impl — all methods delegate to DatabaseBackend / SqlDialect
#[async_trait]
impl<B> AnyBackend for B
where
    B: DatabaseBackend + Send + Sync,
    B::Credentials: DeserializeOwned + Send + Sync,
{
    fn dialect_name(&self) -> &'static str {
        <Self as SqlDialect>::dialect_name(self)
    }
    // ... all other SqlDialect methods forward the same way ...

    async fn open_any(&self, raw: serde_json::Value) -> Result<BackendConnection> {
        let creds = serde_json::from_value::<B::Credentials>(raw)?;
        self.open(&creds).await
    }
    // ... all other DatabaseBackend methods forward directly ...
}
```

---

## `BackendConnection` Enum

```rust
// connectors/mod.rs

pub enum BackendConnection {
    DuckDb(DuckDbHandle),           // actor handle — see Driver Design Notes
    Sqlite(SqliteHandle),           // actor handle — see Driver Design Notes
    Postgres(sqlx::pool::PoolConnection<sqlx::Postgres>),
    Snowflake(SnowflakeClient),     // HTTP client + session
    ClickHouse(clickhouse::Client), // from clickhouse-rs
    Databricks(DatabricksClient),   // HTTP client + token
}
```

`BackendConnection` is `Send + Sync` because `DuckDbHandle` and `SqliteHandle` are actor handles (channels), not raw driver connections (see below).

---

## Driver Design Notes

### DuckDB & SQLite — actor pattern for non-`Send` connections

`duckdb::Connection` and `rusqlite::Connection` are not `Send`. They cannot be placed directly in `BackendConnection` or passed across async boundaries.

**Solution: dedicated thread actor.** Each `DuckDbBackend::open()` spawns a single OS thread that owns the `duckdb::Connection` for the lifetime of that connection. The actor receives query requests over a `tokio::sync::oneshot` channel and sends results back. The handle exposed to the async layer is `DuckDbHandle` — a `tokio::sync::mpsc::Sender` that is `Send + Sync`.

```rust
// Conceptual shape
pub struct DuckDbHandle {
    tx: mpsc::Sender<DbRequest>,
}

enum DbRequest {
    Execute { query: String, params: Vec<SqlValue>, reply: oneshot::Sender<Result<Vec<Row>>> },
    GetTables { reply: oneshot::Sender<Result<Vec<String>>> },
    // ...
}

impl DuckDbBackend {
    async fn open(&self, creds: &DuckDbCredentials) -> Result<BackendConnection> {
        let path = creds.resolved_path()?.to_owned();
        let (tx, rx) = mpsc::channel(32);
        std::thread::spawn(move || {
            let conn = duckdb::Connection::open(&path).expect("open");
            // drive the rx loop, execute requests, send back results
            run_actor(conn, rx);
        });
        Ok(BackendConnection::DuckDb(DuckDbHandle { tx }))
    }
}
```

This pattern keeps non-`Send` connections on a dedicated thread, gives back a `Send` handle, and avoids `spawn_blocking` (which would require re-opening the connection on every query).

**Connection lifetime:** The actor thread exits when all `DuckDbHandle` senders are dropped. Pooling for DuckDB/SQLite is not needed — each connection is a single-file database; the Python backend also sets `use_pool = False` for these.

### PostgreSQL — internal sqlx pool

`PostgresBackend` holds a `sqlx::PgPool` internally. `open()` checks out a connection from the pool (`pool.acquire().await`). The pool is initialized lazily on first call using `tokio::sync::OnceCell`. No external pooling management needed.

**Connection lifetime / pool_key:** The `PgPool` is keyed by the full connection string derived from credentials. The `BackendRegistry` holds one `PostgresBackend` per registered driver type, not per connection — the internal pool handles per-credential multiplexing. The connection management layer (future sub-project) passes credentials to `open_any` each time; the pool deduplicates internally.

### Snowflake, ClickHouse, Databricks — HTTP clients

No mature native Rust drivers exist. These use HTTP-based clients:
- **Snowflake** — Snowflake SQL REST API (reqwest + JWT auth)
- **ClickHouse** — `clickhouse-rs` crate (native binary protocol, async)
- **Databricks** — Databricks SQL Statement REST API (reqwest + token auth)

These are async natively. `BackendConnection` variants for these hold the HTTP client + any session state. All are `Send + Sync`.

### Registry keys

Registry keys match the Python backend exactly to preserve API contract:

| Driver     | Key           |
|------------|---------------|
| DuckDB     | `"duckdb"`    |
| SQLite     | `"sqlite"`    |
| PostgreSQL | `"postgresql"`|
| Snowflake  | `"snowflake"` |
| ClickHouse | `"clickhouse"`|
| Databricks | `"databricks"`|

---

## `BackendRegistry`

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
        r.register("postgresql",  PostgresBackend::new());
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

## Key Dependencies

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
anyhow = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
duckdb = "1"
rusqlite = { version = "0.32", features = ["bundled"] }
sqlx = { version = "0.8", features = ["postgres", "runtime-tokio-rustls"] }
reqwest = { version = "0.12", features = ["json"] }
clickhouse = "0.11"
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

Test `open`, `execute`, `get_tables`, `table_exists`, `detect_schema` per driver.

**DuckDB and SQLite:** Use an in-memory or temp-file database — no external infrastructure needed. Always run in CI.

**PostgreSQL:** Use a `testcontainers` Docker container. Run in CI when Docker is available. Gated by env var `STRATIFIO_TEST_POSTGRES=1`.

**Snowflake, ClickHouse, Databricks:** Cloud-only, no container available. Gated by env var `STRATIFIO_TEST_<DRIVER>=1` (e.g. `STRATIFIO_TEST_SNOWFLAKE=1`). These run only in dedicated integration CI jobs with real credentials, never in standard unit CI. A minimal smoke test (connect + `SELECT 1`) is sufficient.

### Registry test

Verify all 6 drivers are registered and `get()` returns the correct `dialect_name`.

```rust
#[test]
fn registry_has_all_drivers() {
    let reg = BackendRegistry::default();
    let cases = [
        ("duckdb",      "duckdb"),
        ("sqlite",      "sqlite"),
        ("postgresql",  "postgres"),   // registry key differs from dialect name
        ("snowflake",   "snowflake"),
        ("clickhouse",  "clickhouse"),
        ("databricks",  "databricks"),
    ];
    for (key, expected_dialect) in cases {
        let b = reg.get(key).expect(key);
        assert_eq!(b.dialect_name(), expected_dialect, "dialect_name mismatch for {key}");
    }
}
```

---

## Intentional Departures from Python

- **`read_only` parameter dropped** — Python's `open(credentials, read_only=True)` is omitted. All connections are treated as read-only for analytics queries. If write access is ever needed (e.g. materializing intermediate results in DuckDB), the trait can be extended then. YAGNI.

- **`string_concat` variadic → slice** — Python uses `*parts: str` (variadic). Rust uses `parts: &[&str]` (slice), which is idiomatically equivalent and avoids macros. Callers pass `&[a, b, c]`.

- **`parse_credentials` removed** — Python exposes this as a protocol method. In Rust, credential parsing is handled by `serde_json::from_value::<B::Credentials>(raw)` inside `open_any`. Validation lives in the `Deserialize` impl of each `Credentials` type.

---

## Out of Scope

- Credential encryption — handled by crypto subsystem (sub-project 1)
- SQL builder — separate sub-project that consumes `SqlDialect`
- API routes — separate sub-project
- Auth / JWT — separate sub-project
- Migration tooling for product DB
