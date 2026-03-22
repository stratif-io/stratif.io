use serde::Deserialize;
use async_trait::async_trait;
use anyhow::{Result, anyhow};
use crate::connectors::backend::DatabaseBackend;
use crate::connectors::dialect::SqlDialect;
use crate::connectors::mod_types::{BackendConnection, SnowflakeClient};
use crate::connectors::types::{BrowseNode, ColumnInfo, CustomProperty, Row, SchemaInfo, SqlValue};

pub struct SnowflakeBackend;
impl SnowflakeBackend { pub fn new() -> Self { Self } }

#[derive(Deserialize)]
pub struct SnowflakeCredentials {
    pub account: String,
    pub user: String,
    pub password: String,
    pub warehouse: Option<String>,
    pub database: Option<String>,
    pub schema: Option<String>,
}

#[async_trait]
impl DatabaseBackend for SnowflakeBackend {
    type Credentials = SnowflakeCredentials;

    async fn open(&self, creds: &SnowflakeCredentials) -> Result<BackendConnection> {
        let http = reqwest::Client::new();
        Ok(BackendConnection::Snowflake(SnowflakeClient {
            http,
            account: creds.account.clone(),
            token: String::new(),
        }))
    }

    async fn execute(&self, _conn: &mut BackendConnection, _query: &str, _params: Vec<SqlValue>) -> Result<Vec<Row>> {
        Err(anyhow!("Snowflake execute: not yet implemented"))
    }
    async fn get_tables(&self, _conn: &mut BackendConnection) -> Result<Vec<String>> {
        Err(anyhow!("Snowflake get_tables: not yet implemented"))
    }
    async fn table_exists(&self, _conn: &mut BackendConnection, _table_name: &str) -> Result<bool> {
        Err(anyhow!("Snowflake table_exists: not yet implemented"))
    }
    async fn get_table_columns(&self, _conn: &mut BackendConnection, _table: &str) -> Result<Vec<ColumnInfo>> {
        Err(anyhow!("Snowflake get_table_columns: not yet implemented"))
    }
    async fn get_columns_for_browse(&self, _conn: &mut BackendConnection, _table: &str) -> Result<Vec<String>> {
        Err(anyhow!("Snowflake get_columns_for_browse: not yet implemented"))
    }
    async fn detect_schema(&self, _conn: &mut BackendConnection, _hint: Option<&str>) -> Result<SchemaInfo> {
        Err(anyhow!("Snowflake detect_schema: not yet implemented"))
    }
    async fn browse(&self, _conn: &mut BackendConnection, _catalog: Option<&str>, _schema: Option<&str>) -> Result<Vec<BrowseNode>> {
        Err(anyhow!("Snowflake browse: not yet implemented"))
    }
    fn is_connection_error(&self, err: &anyhow::Error) -> bool {
        let msg = err.to_string();
        msg.contains("401") || msg.contains("403") || msg.contains("connection")
    }
}

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
