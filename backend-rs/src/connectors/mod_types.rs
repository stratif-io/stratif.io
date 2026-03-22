use crate::connectors::drivers::duckdb::DuckDbHandle;
use crate::connectors::drivers::sqlite::SqliteHandle;

pub enum BackendConnection {
    DuckDb(DuckDbHandle),
    Sqlite(SqliteHandle),
    Postgres(sqlx::pool::PoolConnection<sqlx::Postgres>),
    Snowflake(SnowflakeClient),
    ClickHouse(ClickHouseClient),
    Databricks(DatabricksClient),
}

// Snowflake — reqwest-based HTTP client
pub struct SnowflakeClient {
    pub http: reqwest::Client,
    pub account: String,
    pub token: String,
}

// ClickHouse — from clickhouse crate
pub type ClickHouseClient = clickhouse::Client;

// Databricks — reqwest-based HTTP client
pub struct DatabricksClient {
    pub http: reqwest::Client,
    pub host: String,
    pub token: String,
}
