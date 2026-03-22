// Query builder for /api/retention

use crate::connectors::AnyBackend;

pub fn build_retention_query(
    backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    granularity: &str,
    event_name: Option<&str>,
) -> String {
    let days_per_unit: u32 = match granularity {
        "week" => 7,
        "month" => 30,
        _ => 1, // day
    };

    let event_filter = if let Some(en) = event_name {
        format!(" AND event_name = '{}'", en.replace('\'', "''"))
    } else {
        String::new()
    };

    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    let cohort_date_expr = backend.date_trunc(granularity, "MIN(timestamp)");
    let active_date_expr = backend.date_trunc(granularity, "timestamp");
    let diff_days = backend.date_diff_days("f.cohort_date", "a.active_date");

    format!(
        "WITH first_seen AS (
            SELECT user_id, {cohort_date_expr} AS cohort_date
            FROM events
            WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}'{event_filter}
            GROUP BY user_id
        ),
        activity AS (
            SELECT DISTINCT user_id, {active_date_expr} AS active_date
            FROM events
            WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}'{event_filter}
        ),
        cohort_activity AS (
            SELECT f.user_id, f.cohort_date,
                CAST(FLOOR(CAST({diff_days} AS DOUBLE) / {days_per_unit}) AS INTEGER) AS period
            FROM first_seen f
            JOIN activity a ON f.user_id = a.user_id
            WHERE a.active_date >= f.cohort_date
        ),
        cohort_sizes AS (
            SELECT cohort_date, COUNT(DISTINCT user_id) AS cohort_size
            FROM first_seen
            GROUP BY cohort_date
        ),
        retention AS (
            SELECT cohort_date, period, COUNT(DISTINCT user_id) AS retained
            FROM cohort_activity
            GROUP BY cohort_date, period
        )
        SELECT cs.cohort_date, cs.cohort_size, r.period, r.retained
        FROM cohort_sizes cs
        LEFT JOIN retention r ON cs.cohort_date = r.cohort_date
        ORDER BY cs.cohort_date, r.period"
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{BackendRegistry, AnyBackend};
    use crate::connectors::mod_types::BackendConnection;

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
        // u1 and u2 appear in Jan cohort; u1 returns in Feb, u2 does not
        for sql in [
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-05 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'page_view', '2024-01-10 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-02-01 09:00:00', '{}')",
        ] { backend.execute_any(conn, sql, vec![]).await.unwrap(); }
    }

    #[tokio::test]
    async fn test_retention_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_retention_query(backend, "2024-01-01", "2024-03-01", "month", None);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        // Should return at least 1 row (cohort Jan with period 0)
        assert!(!rows.is_empty(), "expected at least 1 row from retention query, got 0; sql={sql}");
    }

    #[tokio::test]
    async fn test_retention_with_event_filter() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_retention_query(backend, "2024-01-01", "2024-03-01", "month", Some("page_view"));
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert!(!rows.is_empty());
    }
}
