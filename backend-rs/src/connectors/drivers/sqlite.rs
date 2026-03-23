use tokio::sync::{mpsc, oneshot};
use crate::connectors::types::{BrowseNode, ColumnInfo, Row, SchemaInfo};
use anyhow::Result;
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;
use serde::Deserialize;
use async_trait::async_trait;
use crate::connectors::backend::DatabaseBackend;
use crate::connectors::mod_types::BackendConnection;
use crate::connectors::types::{SqlValue};

#[allow(dead_code)]
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

#[derive(Deserialize)]
pub struct SqliteCredentials {
    pub file_path: String,  // use ":memory:" for in-memory
}

fn map_sqlite_value(val: rusqlite::types::Value) -> SqlValue {
    match val {
        rusqlite::types::Value::Integer(i) => SqlValue::Int(i),
        rusqlite::types::Value::Real(f) => SqlValue::Float(f),
        rusqlite::types::Value::Text(s) => SqlValue::Text(s),
        rusqlite::types::Value::Blob(_) => SqlValue::Null,
        rusqlite::types::Value::Null => SqlValue::Null,
    }
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
            SqliteRequest::Execute { query, reply } => {
                let result = conn.prepare(&query)
                    .and_then(|mut stmt| {
                        let col_count = stmt.column_count();
                        let rows = stmt.query_map([], |row| {
                            let vals = (0..col_count)
                                .map(|i| {
                                    let v: rusqlite::types::Value = row.get(i).unwrap_or(rusqlite::types::Value::Null);
                                    Ok(map_sqlite_value(v))
                                })
                                .collect::<rusqlite::Result<Vec<_>>>()?;
                            Ok(vals)
                        })?;
                        rows.collect::<rusqlite::Result<Vec<_>>>()
                    })
                    .map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            SqliteRequest::GetTableColumns { table, reply } => {
                let result = conn.prepare(&format!("PRAGMA table_info(\"{}\")", table.replace('"', "")))
                    .and_then(|mut stmt| stmt.query_map([], |r| Ok(ColumnInfo {
                        name: r.get::<_, String>(1)?,
                        sql_type: r.get::<_, String>(2)?,
                    }))?.collect::<rusqlite::Result<Vec<_>>>())
                    .map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            SqliteRequest::DetectSchema { hint, reply } => {
                let tables_result: Result<Vec<String>> = conn.prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                ).and_then(|mut stmt| stmt.query_map([], |r| r.get::<_, String>(0))
                    .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>()))
                    .map_err(|e| anyhow::anyhow!("{e}"));

                let result = tables_result.and_then(|tables| {
                    let events_table = hint
                        .as_deref()
                        .filter(|h| tables.contains(&h.to_string()))
                        .map(|s| s.to_string())
                        .or_else(|| tables.iter().find(|t| matches!(t.to_lowercase().as_str(), "events" | "event" | "analytics")).cloned())
                        .or_else(|| tables.first().cloned())
                        .unwrap_or_default();

                    let columns: Vec<ColumnInfo> = if !events_table.is_empty() {
                        conn.prepare(&format!("PRAGMA table_info(\"{}\")", events_table.replace('"', "")))
                            .and_then(|mut stmt| stmt.query_map([], |r| Ok(ColumnInfo {
                                name: r.get::<_, String>(1)?,
                                sql_type: r.get::<_, String>(2)?,
                            }))?.collect::<rusqlite::Result<Vec<_>>>())
                            .unwrap_or_default()
                    } else { vec![] };

                    let mut suggestions = std::collections::HashMap::new();
                    let col_map: std::collections::HashMap<String, String> = columns.iter()
                        .map(|c| (c.name.to_lowercase(), c.name.clone())).collect();
                    for c in &["user_id", "userid", "user", "account_id", "customer_id", "uid"] {
                        if let Some(n) = col_map.get(*c) { suggestions.insert("user_id_field".to_string(), n.clone()); break; }
                    }
                    for c in &["timestamp", "ts", "created_at", "event_time", "time", "datetime", "date"] {
                        if let Some(n) = col_map.get(*c) { suggestions.insert("timestamp_field".to_string(), n.clone()); break; }
                    }
                    for c in &["event_name", "event", "action", "event_type", "name", "type"] {
                        if let Some(n) = col_map.get(*c) { suggestions.insert("event_name_field".to_string(), n.clone()); break; }
                    }
                    Ok(SchemaInfo { tables, events_table, columns, suggestions, proposed_custom_properties: vec![] })
                });
                let _ = reply.send(result);
            }
            SqliteRequest::Browse { reply, .. } => {
                let result = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                    .and_then(|mut stmt| stmt.query_map([], |r| r.get::<_, String>(0))
                        .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>()))
                    .map(|tables| tables.into_iter().map(|t| BrowseNode {
                        full_name: t.clone(), name: t,
                        kind: crate::connectors::types::BrowseKind::Table,
                    }).collect::<Vec<_>>())
                    .map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            SqliteRequest::GetColumnsForBrowse { table, reply } => {
                let result = conn.prepare(&format!("PRAGMA table_info(\"{}\")", table.replace('"', "")))
                    .and_then(|mut stmt| stmt.query_map([], |r| r.get::<_, String>(1))
                        .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>()))
                    .map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            _ => {}
        }
    }
}

pub struct SqliteBackend;
#[allow(clippy::new_without_default)]
impl SqliteBackend { pub fn new() -> Self { Self } }

#[async_trait]
impl DatabaseBackend for SqliteBackend {
    type Credentials = SqliteCredentials;

    async fn open(&self, creds: &SqliteCredentials) -> Result<BackendConnection> {
        let file_path = creds.file_path.clone();
        let (tx, rx) = tokio::sync::mpsc::channel(32);
        std::thread::spawn(move || {
            let conn = if file_path == ":memory:" {
                rusqlite::Connection::open_in_memory().expect("sqlite open_in_memory")
            } else {
                rusqlite::Connection::open(&file_path).expect("sqlite open")
            };
            run_sqlite_actor(conn, rx);
        });
        Ok(BackendConnection::Sqlite(SqliteHandle { tx }))
    }

    async fn execute(&self, conn: &mut BackendConnection, query: &str, _params: Vec<SqlValue>) -> Result<Vec<Row>> {
        let BackendConnection::Sqlite(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(SqliteRequest::Execute { query: query.to_owned(), reply: tx }).await?;
        rx.await?
    }

    async fn get_tables(&self, conn: &mut BackendConnection) -> Result<Vec<String>> {
        let BackendConnection::Sqlite(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(SqliteRequest::GetTables { reply: tx }).await?;
        rx.await?
    }

    async fn table_exists(&self, conn: &mut BackendConnection, table_name: &str) -> Result<bool> {
        let BackendConnection::Sqlite(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(SqliteRequest::TableExists { table_name: table_name.to_owned(), reply: tx }).await?;
        rx.await?
    }

    fn is_connection_error(&self, _err: &anyhow::Error) -> bool { false }

    async fn get_table_columns(&self, conn: &mut BackendConnection, table: &str) -> Result<Vec<ColumnInfo>> {
        let BackendConnection::Sqlite(h) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        h.tx.send(SqliteRequest::GetTableColumns { table: table.to_owned(), reply: tx }).await?;
        rx.await?
    }
    async fn get_columns_for_browse(&self, conn: &mut BackendConnection, table: &str) -> Result<Vec<String>> {
        let BackendConnection::Sqlite(h) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        h.tx.send(SqliteRequest::GetColumnsForBrowse { table: table.to_owned(), reply: tx }).await?;
        rx.await?
    }
    async fn detect_schema(&self, conn: &mut BackendConnection, hint: Option<&str>) -> Result<SchemaInfo> {
        let BackendConnection::Sqlite(h) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        h.tx.send(SqliteRequest::DetectSchema { hint: hint.map(|s| s.to_owned()), reply: tx }).await?;
        rx.await?
    }
    async fn browse(&self, conn: &mut BackendConnection, catalog: Option<&str>, schema: Option<&str>) -> Result<Vec<BrowseNode>> {
        let BackendConnection::Sqlite(h) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        h.tx.send(SqliteRequest::Browse { catalog: catalog.map(|s| s.to_owned()), schema: schema.map(|s| s.to_owned()), reply: tx }).await?;
        rx.await?
    }
}

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

/// Execute a query on a bare SqliteHandle (used for product DB queries in the API layer).
/// This avoids needing a full `BackendConnection` just to run a query on the product DB.
pub async fn execute_on_handle(
    handle: &SqliteHandle,
    sql: &str,
) -> anyhow::Result<Vec<crate::connectors::types::Row>> {
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

#[cfg(test)]
mod integration {
    use super::*;
    use crate::connectors::any_backend::AnyBackend;
    use crate::connectors::backend::DatabaseBackend;

    #[tokio::test]
    async fn open_and_get_tables_empty() {
        let b = SqliteBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = AnyBackend::open_any(&b, raw).await.unwrap();
        let tables = DatabaseBackend::get_tables(&b, &mut conn).await.unwrap();
        assert!(tables.is_empty());
    }

    #[tokio::test]
    async fn execute_select_1() {
        let b = SqliteBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = AnyBackend::open_any(&b, raw).await.unwrap();
        let rows = DatabaseBackend::execute(&b, &mut conn, "SELECT 1", vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
    }

    #[tokio::test]
    async fn table_exists_false() {
        let b = SqliteBackend::new();
        let raw = serde_json::json!({ "file_path": ":memory:" });
        let mut conn = AnyBackend::open_any(&b, raw).await.unwrap();
        assert!(!DatabaseBackend::table_exists(&b, &mut conn, "nope").await.unwrap());
    }
}
