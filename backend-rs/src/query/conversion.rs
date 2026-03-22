use crate::connectors::AnyBackend;

/// Entry -> goal conversion rate query.
/// Returns one row: (entry_count INT, converted_count INT).
pub fn build_conversion_query(
    _backend: &dyn AnyBackend,
    entry_event: &str,
    goal_event: &str,
    start_date: &str,
    end_date: &str,
) -> String {
    let entry_esc = entry_event.replace('\'', "''");
    let goal_esc = goal_event.replace('\'', "''");
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "WITH entry_users AS (
            SELECT DISTINCT user_id FROM events
            WHERE event_name = '{entry_esc}'
              AND timestamp >= '{safe_start}' AND timestamp < '{safe_end}'
        ),
        converted AS (
            SELECT DISTINCT e.user_id FROM entry_users e
            WHERE EXISTS (
                SELECT 1 FROM events g
                WHERE g.user_id = e.user_id
                  AND g.event_name = '{goal_esc}'
                  AND g.timestamp > (
                      SELECT MIN(timestamp) FROM events
                      WHERE user_id = e.user_id AND event_name = '{entry_esc}'
                  )
            )
        )
        SELECT
            (SELECT COUNT(*) FROM entry_users) AS entry_count,
            (SELECT COUNT(*) FROM converted) AS converted_count"
    )
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

    #[tokio::test]
    async fn test_conversion_query() {
        let (mut conn, backend) = make_duckdb().await;
        backend.execute_any(&mut conn,
            "CREATE TABLE events (user_id TEXT, event_name TEXT, timestamp TIMESTAMP, properties TEXT)",
            vec![]).await.unwrap();
        for sql in [
            "INSERT INTO events VALUES ('u1', 'landing', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'purchase', '2024-01-15 10:05:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'landing', '2024-01-15 11:00:00', '{}')",
        ] { backend.execute_any(&mut conn, sql, vec![]).await.unwrap(); }

        let sql = build_conversion_query(backend, "landing", "purchase", "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
        match &rows[0][0] { SqlValue::Int(n) => assert_eq!(*n, 2), other => panic!("{other:?}") }
        match &rows[0][1] { SqlValue::Int(n) => assert_eq!(*n, 1), other => panic!("{other:?}") }
    }
}
