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
