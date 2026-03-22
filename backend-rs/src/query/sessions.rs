use crate::connectors::AnyBackend;

/// Build the session derivation CTE.
/// Creates a `sessions` CTE with columns: session_id, user_id, start_time, end_time, event_count, duration_sec.
pub fn build_session_cte(backend: &dyn AnyBackend, start_date: &str, end_date: &str) -> String {
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    let epoch_gap = backend.epoch_diff_seconds("prev_ts", "timestamp");
    let epoch_dur = backend.epoch_diff_seconds("MIN(timestamp)", "MAX(timestamp)");
    let concat = backend.string_concat(&["user_id", "'-'", "CAST(session_num AS VARCHAR)"]);

    format!(
        "lagged AS (
            SELECT user_id, timestamp, event_name,
                LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_ts
            FROM events
            WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}'
        ),
        boundaries AS (
            SELECT *,
                CASE WHEN prev_ts IS NULL OR {epoch_gap} > 1800 THEN 1 ELSE 0 END AS is_new
            FROM lagged
        ),
        numbered AS (
            SELECT *,
                SUM(is_new) OVER (PARTITION BY user_id ORDER BY timestamp ROWS UNBOUNDED PRECEDING) AS session_num
            FROM boundaries
        ),
        sessions AS (
            SELECT
                {concat} AS session_id,
                user_id,
                MIN(timestamp) AS start_time,
                MAX(timestamp) AS end_time,
                COUNT(*) AS event_count,
                {epoch_dur} AS duration_sec
            FROM numbered
            GROUP BY user_id, session_num
        )"
    )
}

/// Paginated sessions query.
pub fn build_sessions_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    limit: u32,
    offset: u32,
) -> String {
    let cte = build_session_cte(backend, start_date, end_date);
    format!(
        "WITH {cte} \
         SELECT session_id, user_id, start_time, end_time, event_count, duration_sec \
         FROM sessions ORDER BY start_time DESC LIMIT {limit} OFFSET {offset}"
    )
}

/// Session summary aggregates.
pub fn build_sessions_summary_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    let cte = build_session_cte(backend, start_date, end_date);
    format!(
        "WITH {cte} \
         SELECT \
             COUNT(*) AS total_sessions, \
             AVG(duration_sec) AS avg_duration_sec, \
             AVG(event_count) AS avg_events_per_session \
         FROM sessions"
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
        let conn = backend.open_any(serde_json::json!({"file_path": ":memory:"})).await.unwrap();
        (conn, backend)
    }

    async fn seed(conn: &mut BackendConnection, backend: &dyn AnyBackend) {
        backend.execute_any(conn,
            "CREATE TABLE events (user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT)",
            vec![]).await.unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'click', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:10:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'purchase', '2024-01-15 11:15:00', '{}')",
        ] { backend.execute_any(conn, sql, vec![]).await.unwrap(); }
    }

    #[tokio::test]
    async fn test_sessions_query_returns_rows() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_sessions_query(backend, "2024-01-01", "2024-02-01", 10, 0);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2, "expected 2 sessions, got {}: sql={sql}", rows.len());
    }

    #[tokio::test]
    async fn test_sessions_summary_returns_aggregates() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_sessions_summary_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match &rows[0][0] {
            SqlValue::Int(n) => assert_eq!(*n, 2),
            other => panic!("expected Int for total_sessions, got {other:?}"),
        }
    }
}
