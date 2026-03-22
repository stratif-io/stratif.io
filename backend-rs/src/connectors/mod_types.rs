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

// Stub client types — will be replaced in Task 14
pub struct SnowflakeClient;
pub struct ClickHouseClient;
pub struct DatabricksClient;
