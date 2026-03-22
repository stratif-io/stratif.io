use tokio::sync::{mpsc, oneshot};
use crate::connectors::types::{BrowseNode, ColumnInfo, Row, SchemaInfo};
use anyhow::Result;
use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

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
                        let rows = stmt.query_map([], |_row| Ok(vec![]))?;
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
            _ => {}
        }
    }
}

pub struct DuckDbBackend;

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
