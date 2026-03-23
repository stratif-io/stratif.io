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
pub(crate) enum DuckDbRequest {
    Execute {
        query: String,
        params: Vec<String>,
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

fn run_duckdb_actor(conn: duckdb::Connection, mut rx: mpsc::Receiver<DuckDbRequest>) {
    while let Some(req) = rx.blocking_recv() {
        match req {
            DuckDbRequest::Execute { query, params: _, reply } => {
                let result = conn.prepare(&query)
                    .and_then(|mut stmt| {
                        let rows = stmt.query_map([], |row| {
                            let col_count = row.as_ref().column_count();
                            let vals = (0..col_count)
                                .map(|i| map_value(row.get_ref(i).unwrap_or(duckdb::types::ValueRef::Null)))
                                .collect();
                            Ok(vals)
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
                let exists = conn.query_row(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
                    [&table_name],
                    |r| r.get::<_, i64>(0),
                ).map(|n| n > 0).unwrap_or(false);
                let _ = reply.send(Ok(exists));
            }
            DuckDbRequest::GetTableColumns { table, reply } => {
                let result = conn.prepare(
                    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position"
                ).and_then(|mut stmt| {
                    stmt.query_map([&table], |r| Ok(ColumnInfo {
                        name: r.get::<_, String>(0)?,
                        sql_type: r.get::<_, String>(1)?,
                    }))?.collect::<Result<Vec<_>, _>>()
                }).map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            DuckDbRequest::DetectSchema { hint, reply } => {
                let tables_result: Result<Vec<String>> = conn.prepare(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY 1"
                ).and_then(|mut stmt| {
                    stmt.query_map([], |r| r.get::<_, String>(0))?.collect::<Result<Vec<_>, _>>()
                }).map_err(|e| anyhow::anyhow!("{e}"));

                let result = tables_result.and_then(|tables| {
                    let events_table = hint
                        .as_deref()
                        .filter(|h| tables.contains(&h.to_string()))
                        .map(|s| s.to_string())
                        .or_else(|| tables.iter().find(|t| matches!(t.to_lowercase().as_str(), "events" | "event" | "analytics")).cloned())
                        .or_else(|| tables.first().cloned())
                        .unwrap_or_default();

                    let columns: Vec<ColumnInfo> = if !events_table.is_empty() {
                        conn.prepare(
                            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position"
                        ).and_then(|mut stmt| {
                            stmt.query_map([&events_table], |r| Ok(ColumnInfo {
                                name: r.get::<_, String>(0)?,
                                sql_type: r.get::<_, String>(1)?,
                            }))?.collect::<Result<Vec<_>, _>>()
                        }).unwrap_or_default()
                    } else {
                        vec![]
                    };

                    let mut suggestions = std::collections::HashMap::new();
                    let col_map: std::collections::HashMap<String, String> = columns.iter()
                        .map(|c| (c.name.to_lowercase(), c.name.clone()))
                        .collect();
                    for candidate in &["user_id", "userid", "user", "account_id", "customer_id", "uid"] {
                        if let Some(name) = col_map.get(*candidate) {
                            suggestions.insert("user_id_field".to_string(), name.clone());
                            break;
                        }
                    }
                    for candidate in &["timestamp", "ts", "created_at", "event_time", "time", "datetime", "date"] {
                        if let Some(name) = col_map.get(*candidate) {
                            suggestions.insert("timestamp_field".to_string(), name.clone());
                            break;
                        }
                    }
                    for candidate in &["event_name", "event", "action", "event_type", "name", "type"] {
                        if let Some(name) = col_map.get(*candidate) {
                            suggestions.insert("event_name_field".to_string(), name.clone());
                            break;
                        }
                    }

                    // For JSON/STRUCT columns, sample keys and propose as custom properties
                    let mut proposed: Vec<CustomProperty> = vec![];
                    for col in &columns {
                        let upper = col.sql_type.to_uppercase();
                        if upper == "JSON" || upper == "JSONB" {
                            let safe_table = events_table.replace('"', "");
                            let safe_col = col.name.replace('"', "");
                            let sql = format!(
                                "SELECT DISTINCT unnest(json_keys(\"{safe_col}\")) FROM \"{safe_table}\" WHERE \"{safe_col}\" IS NOT NULL LIMIT 500"
                            );
                            if let Ok(mut stmt) = conn.prepare(&sql) {
                                if let Ok(keys) = stmt.query_map([], |r| r.get::<_, String>(0))
                                    .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
                                {
                                    for key in keys {
                                        proposed.push(CustomProperty {
                                            name: key.clone(),
                                            path: format!("{}.{}", col.name, key),
                                            prop_type: "string".to_string(),
                                            category: None,
                                        });
                                    }
                                }
                            }
                        }
                    }

                    Ok(SchemaInfo { tables, events_table, columns, suggestions, proposed_custom_properties: proposed })
                });
                let _ = reply.send(result);
            }
            DuckDbRequest::Browse { catalog: _, schema, reply } => {
                let schema_filter = schema.as_deref().unwrap_or("main");
                let result = conn.prepare(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY 1"
                ).and_then(|mut stmt| {
                    stmt.query_map([schema_filter], |r| r.get::<_, String>(0))?.collect::<Result<Vec<_>, _>>()
                }).map(|tables| {
                    tables.into_iter().map(|t| BrowseNode {
                        full_name: t.clone(),
                        name: t,
                        kind: crate::connectors::types::BrowseKind::Table,
                    }).collect::<Vec<_>>()
                }).map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            DuckDbRequest::GetColumnsForBrowse { table, reply } => {
                let result = conn.prepare(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position"
                ).and_then(|mut stmt| {
                    stmt.query_map([&table], |r| r.get::<_, String>(0))?.collect::<Result<Vec<_>, _>>()
                }).map_err(|e| anyhow::anyhow!("{e}"));
                let _ = reply.send(result);
            }
            _ => {}
        }
    }
}

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

fn map_value(val: duckdb::types::ValueRef<'_>) -> SqlValue {
    use duckdb::types::ValueRef;
    match val {
        ValueRef::Null => SqlValue::Null,
        ValueRef::Boolean(b) => SqlValue::Bool(b),
        ValueRef::TinyInt(i) => SqlValue::Int(i as i64),
        ValueRef::SmallInt(i) => SqlValue::Int(i as i64),
        ValueRef::Int(i) => SqlValue::Int(i as i64),
        ValueRef::BigInt(i) => SqlValue::Int(i),
        ValueRef::Float(f) => SqlValue::Float(f as f64),
        ValueRef::Double(f) => SqlValue::Float(f),
        ValueRef::Text(s) => SqlValue::Text(String::from_utf8_lossy(s).into_owned()),
        other => SqlValue::Text(format!("{other:?}")),
    }
}

pub struct DuckDbBackend;

#[allow(clippy::new_without_default)]
impl DuckDbBackend {
    pub fn new() -> Self {
        Self
    }
}

impl SqlDialect for DuckDbBackend {
    fn dialect_name(&self) -> &'static str {
        "duckdb"
    }

    fn identifier_quote_char(&self) -> char {
        '"'
    }

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

#[async_trait]
impl DatabaseBackend for DuckDbBackend {
    type Credentials = DuckDbCredentials;

    async fn open(&self, creds: &DuckDbCredentials) -> anyhow::Result<BackendConnection> {
        let path = creds.resolved_path()?.to_owned();
        let (tx, rx) = tokio::sync::mpsc::channel(32);
        std::thread::spawn(move || {
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

    fn is_connection_error(&self, _err: &anyhow::Error) -> bool { false }

    async fn get_table_columns(&self, conn: &mut BackendConnection, table: &str) -> anyhow::Result<Vec<ColumnInfo>> {
        let BackendConnection::DuckDb(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(DuckDbRequest::GetTableColumns { table: table.to_owned(), reply: tx }).await?;
        rx.await?
    }
    async fn get_columns_for_browse(&self, conn: &mut BackendConnection, table: &str) -> anyhow::Result<Vec<String>> {
        let BackendConnection::DuckDb(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(DuckDbRequest::GetColumnsForBrowse { table: table.to_owned(), reply: tx }).await?;
        rx.await?
    }
    async fn detect_schema(&self, conn: &mut BackendConnection, hint: Option<&str>) -> anyhow::Result<SchemaInfo> {
        let BackendConnection::DuckDb(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(DuckDbRequest::DetectSchema { hint: hint.map(|s| s.to_owned()), reply: tx }).await?;
        rx.await?
    }
    async fn browse(&self, conn: &mut BackendConnection, catalog: Option<&str>, schema: Option<&str>) -> anyhow::Result<Vec<BrowseNode>> {
        let BackendConnection::DuckDb(handle) = conn else { anyhow::bail!("wrong connection type") };
        let (tx, rx) = tokio::sync::oneshot::channel();
        handle.tx.send(DuckDbRequest::Browse { catalog: catalog.map(|s| s.to_owned()), schema: schema.map(|s| s.to_owned()), reply: tx }).await?;
        rx.await?
    }
}

#[cfg(test)]
mod integration {
    use super::*;
    use crate::connectors::any_backend::AnyBackend;
    use crate::connectors::backend::DatabaseBackend;

    #[tokio::test]
    async fn open_and_get_tables() {
        let b = DuckDbBackend::new();
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

#[cfg(test)]
mod tests {
    use super::*;

    fn b() -> DuckDbBackend {
        DuckDbBackend::new()
    }

    #[test]
    fn dialect_name() {
        assert_eq!(b().dialect_name(), "duckdb");
    }

    #[test]
    fn identifier_quote_char() {
        assert_eq!(b().identifier_quote_char(), '"');
    }

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
        assert_eq!(
            b().epoch_diff_seconds("a", "b"),
            "EXTRACT(EPOCH FROM (b - a))"
        );
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
        assert_eq!(
            b().json_extract_string("props", "plan"),
            "json_extract_string(props, '$.plan')"
        );
    }

    #[test]
    fn json_extract_string_nested() {
        assert_eq!(
            b().json_extract_string("props", "a.b"),
            "json_extract_string(props, '$.a.b')"
        );
    }

    #[test]
    fn extract_hour() {
        assert_eq!(
            b().extract_hour("ts"),
            "CAST(EXTRACT(HOUR FROM ts) AS INTEGER)"
        );
    }

    #[test]
    fn extract_day_of_week() {
        assert_eq!(
            b().extract_day_of_week("ts"),
            "CAST(EXTRACT(DAYOFWEEK FROM ts) AS INTEGER)"
        );
    }

    #[test]
    fn extract_year() {
        assert_eq!(b().extract_year("ts"), "CAST(EXTRACT(YEAR FROM ts) AS INTEGER)");
    }

    #[test]
    fn extract_month() {
        assert_eq!(
            b().extract_month("ts"),
            "CAST(EXTRACT(MONTH FROM ts) AS INTEGER)"
        );
    }

    #[test]
    fn extract_week() {
        assert_eq!(
            b().extract_week("ts"),
            "CAST(EXTRACT(WEEK FROM ts) AS INTEGER)"
        );
    }

    #[test]
    fn extract_quarter() {
        assert_eq!(
            b().extract_quarter("ts"),
            "CAST(EXTRACT(QUARTER FROM ts) AS INTEGER)"
        );
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
        let result =
            b().prepend_events_cte("(SELECT * FROM tbl)", "SELECT * FROM events");
        assert!(result.starts_with("WITH events AS (SELECT * FROM tbl)"));
    }
}
