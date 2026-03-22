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
