use crate::connectors::AnyBackend;
use crate::query::sessions::build_session_cte;

/// Build the 8-metric aggregate query for one period.
/// Returns one row with columns: total_events, unique_users, total_sessions,
/// avg_session_duration_sec, avg_events_per_session, new_users, returning_users, dau_mau_ratio
pub fn build_mission_control_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
) -> String {
    let session_cte = build_session_cte(backend, start_date, end_date);
    format!(
        "WITH {session_cte},
        event_stats AS (
            SELECT
                COUNT(*) AS total_events,
                COUNT(DISTINCT user_id) AS unique_users
            FROM events
            WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}'
        ),
        session_stats AS (
            SELECT
                COUNT(*) AS total_sessions,
                AVG(duration_sec) AS avg_duration_sec,
                AVG(event_count) AS avg_events_per_session
            FROM sessions
        ),
        new_user_stats AS (
            SELECT user_id
            FROM events
            GROUP BY user_id
            HAVING MIN(timestamp) >= '{start_date}' AND MIN(timestamp) < '{end_date}'
        )
        SELECT
            e.total_events,
            e.unique_users,
            s.total_sessions,
            s.avg_duration_sec,
            s.avg_events_per_session,
            (SELECT COUNT(*) FROM new_user_stats) AS new_users,
            e.unique_users - (SELECT COUNT(*) FROM new_user_stats) AS returning_users,
            0 AS dau_mau_ratio
        FROM event_stats e, session_stats s"
    )
}

/// Build the mission control trend query for a single metric.
/// Returns rows: (date TEXT, value FLOAT)
pub fn build_mission_control_trend_query(
    backend: &dyn AnyBackend,
    metric: &str,
    start_date: &str,
    end_date: &str,
) -> Option<String> {
    let date_expr = backend.date_trunc("day", "timestamp");
    let agg_expr = match metric {
        "total_events" => "COUNT(*)",
        "unique_users" => "COUNT(DISTINCT user_id)",
        _ => return None,
    };
    Some(format!(
        "SELECT {date_expr} AS date, {agg_expr} AS value
         FROM events
         WHERE timestamp >= '{start_date}' AND timestamp < '{end_date}'
         GROUP BY 1 ORDER BY 1"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{AnyBackend, BackendRegistry};
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
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-15 11:00:00', '{}')",
        ] { backend.execute_any(conn, sql, vec![]).await.unwrap(); }
    }

    #[tokio::test]
    async fn test_mission_control_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_mission_control_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match &rows[0][0] { SqlValue::Int(n) => assert_eq!(*n, 3), other => panic!("{other:?}") }
        match &rows[0][1] { SqlValue::Int(n) => assert_eq!(*n, 2), other => panic!("{other:?}") }
    }

    #[tokio::test]
    async fn test_mission_control_trend_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_mission_control_trend_query(backend, "total_events", "2024-01-01", "2024-02-01").unwrap();
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert!(!rows.is_empty());
    }
}
