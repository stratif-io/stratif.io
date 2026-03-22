use crate::api::error::{filters_to_sql, Filter};
use crate::connectors::AnyBackend;

/// Distinct event names in the date range.
pub fn build_distinct_events_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "SELECT DISTINCT event_name FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         ORDER BY event_name"
    )
}

/// Top N events by count.
pub fn build_top_events_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    limit: u32,
) -> String {
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "SELECT event_name, COUNT(*) AS count FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         GROUP BY event_name ORDER BY count DESC LIMIT {limit}"
    )
}

/// Raw events with optional filters. Returns (data_query, count_query).
pub fn build_raw_events_queries(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    event_name: Option<&str>,
    user_id: Option<&str>,
    filters: &[Filter],
    limit: u32,
    offset: u32,
) -> (String, String) {
    let q = backend.identifier_quote_char();
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    let mut where_parts = vec![
        format!("timestamp >= '{safe_start}' AND timestamp < '{safe_end}'"),
    ];
    if let Some(en) = event_name {
        where_parts.push(format!("event_name = '{}'", en.replace('\'', "''")));
    }
    if let Some(uid) = user_id {
        where_parts.push(format!("user_id = '{}'", uid.replace('\'', "''")));
    }
    let filter_suffix = filters_to_sql(filters, q);
    let where_clause = format!("{}{}", where_parts.join(" AND "), filter_suffix);

    let data = format!(
        "SELECT timestamp, user_id, event_name, properties \
         FROM events WHERE {where_clause} \
         ORDER BY timestamp DESC LIMIT {limit} OFFSET {offset}"
    );
    let count = format!("SELECT COUNT(*) AS total FROM events WHERE {where_clause}");
    (data, count)
}

/// Events for a specific user (paginated). Returns (data_query, count_query).
pub fn build_user_events_queries(
    _backend: &dyn AnyBackend,
    user_id: &str,
    limit: u32,
    offset: u32,
) -> (String, String) {
    let escaped = user_id.replace('\'', "''");
    let data = format!(
        "SELECT timestamp, user_id, event_name, properties \
         FROM events WHERE user_id = '{escaped}' \
         ORDER BY timestamp DESC LIMIT {limit} OFFSET {offset}"
    );
    let count = format!("SELECT COUNT(*) AS total FROM events WHERE user_id = '{escaped}'");
    (data, count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;
    use crate::connectors::types::SqlValue;

    async fn make_duckdb() -> (BackendConnection, &'static dyn AnyBackend) {
        let reg = Box::leak(Box::new(BackendRegistry::default()));
        let backend = reg.get("duckdb").unwrap();
        let conn = backend.open_any(serde_json::json!({"file_path": ":memory:"})).await.unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend.execute_any(conn,
            "CREATE TABLE events (user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT)",
            vec![]).await.unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'purchase', '2024-01-16 14:00:00', '{}')",
        ] { backend.execute_any(conn, sql, vec![]).await.unwrap(); }
    }

    #[tokio::test]
    async fn test_distinct_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_distinct_events_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 3); // page_view, purchase, sign_up
    }

    #[tokio::test]
    async fn test_top_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_top_events_query(backend, "2024-01-01", "2024-02-01", 2);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
        match &rows[0][0] {
            SqlValue::Text(s) => assert_eq!(s, "page_view"),
            other => panic!("expected Text, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_raw_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let (data_sql, count_sql) = build_raw_events_queries(backend, "2024-01-01", "2024-02-01", Some("page_view"), None, &[], 10, 0);
        let rows = backend.execute_any(&mut conn, &data_sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
        let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await.unwrap();
        match &count_rows[0][0] { SqlValue::Int(n) => assert_eq!(*n, 2), other => panic!("{other:?}") }
    }

    #[tokio::test]
    async fn test_user_events() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let (data_sql, count_sql) = build_user_events_queries(backend, "u1", 10, 0);
        let rows = backend.execute_any(&mut conn, &data_sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
        let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await.unwrap();
        match &count_rows[0][0] { SqlValue::Int(n) => assert_eq!(*n, 2), other => panic!("{other:?}") }
    }
}
