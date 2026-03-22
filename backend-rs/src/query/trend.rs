use crate::api::error::{filters_to_sql, Filter};
use crate::connectors::AnyBackend;

/// Build time-series trend query.
/// Returns SQL producing rows: (date TEXT, count INT, unique_users INT).
pub fn build_trend_query(
    backend: &dyn AnyBackend,
    event_name: &str,
    granularity: &str,
    start_date: &str,
    end_date: &str,
    filters: &[Filter],
) -> String {
    let date_expr = backend.date_trunc(granularity, "timestamp");
    let q = backend.identifier_quote_char();
    let filter_sql = filters_to_sql(filters, q);
    let event_escaped = event_name.replace('\'', "''");
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");

    format!(
        "SELECT {date_expr} AS date, \
         COUNT(*) AS count, \
         COUNT(DISTINCT user_id) AS unique_users \
         FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         AND event_name = '{event_escaped}'\
         {filter_sql} \
         GROUP BY 1 ORDER BY 1"
    )
}

/// Build aggregate totals query.
/// Returns SQL producing one row: (total_unique_users INT).
pub fn build_trend_total_query(
    backend: &dyn AnyBackend,
    event_name: &str,
    start_date: &str,
    end_date: &str,
    filters: &[Filter],
) -> String {
    let q = backend.identifier_quote_char();
    let filter_sql = filters_to_sql(filters, q);
    let event_escaped = event_name.replace('\'', "''");
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");

    format!(
        "SELECT COUNT(DISTINCT user_id) AS total_unique_users \
         FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         AND event_name = '{event_escaped}'\
         {filter_sql}"
    )
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
        let conn = backend
            .open_any(serde_json::json!({"file_path": ":memory:"}))
            .await
            .unwrap();
        (conn, backend)
    }

    async fn seed_events(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend.execute_any(conn,
            "CREATE TABLE events (user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT)",
            vec![]).await.unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-16 09:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u3', 'page_view', '2024-01-17 14:00:00', '{}')",
        ] {
            backend.execute_any(conn, sql, vec![]).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_build_trend_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed_events(&mut conn, backend).await;
        let sql = build_trend_query(backend, "page_view", "day", "2024-01-01", "2024-02-01", &[]);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 3); // 3 distinct days
    }

    #[tokio::test]
    async fn test_build_trend_total_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed_events(&mut conn, backend).await;
        let sql = build_trend_total_query(backend, "page_view", "2024-01-01", "2024-02-01", &[]);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match &rows[0][0] {
            SqlValue::Int(n) => assert_eq!(*n, 3),
            other => panic!("expected Int, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_trend_with_filter() {
        let (mut conn, backend) = make_duckdb().await;
        seed_events(&mut conn, backend).await;
        let filters = vec![Filter { property: "user_id".into(), operator: "equals".into(), value: "u1".into() }];
        let sql = build_trend_query(backend, "page_view", "day", "2024-01-01", "2024-02-01", &filters);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2); // u1 has page_view on Jan 15 and Jan 16
    }
}
