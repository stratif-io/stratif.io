use crate::connectors::AnyBackend;

/// Top 3-event sequences (dialect-portable self-join approach).
/// Returns rows: (e1 TEXT, e2 TEXT, e3 TEXT, count INT)
pub fn build_paths_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    limit: u32,
    start_event: Option<&str>,
    end_event: Option<&str>,
) -> String {
    let start_filter = match start_event {
        Some(e) => {
            let escaped = e.replace('\'', "''");
            format!(" AND e1.event_name = '{escaped}'")
        }
        None => String::new(),
    };
    let end_filter = match end_event {
        Some(e) => {
            let escaped = e.replace('\'', "''");
            format!(" AND e3.event_name = '{escaped}'")
        }
        None => String::new(),
    };
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "WITH e AS (
            SELECT user_id, timestamp, event_name
            FROM events
            WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}'
        )
        SELECT e1.event_name AS e1, e2.event_name AS e2, e3.event_name AS e3, COUNT(*) AS count
        FROM e e1
        JOIN e e2 ON e1.user_id = e2.user_id AND e2.timestamp > e1.timestamp
        JOIN e e3 ON e2.user_id = e3.user_id AND e3.timestamp > e2.timestamp
        WHERE NOT EXISTS (
            SELECT 1 FROM e ex
            WHERE ex.user_id = e1.user_id AND ex.timestamp > e1.timestamp AND ex.timestamp < e2.timestamp
        )
        AND NOT EXISTS (
            SELECT 1 FROM e ex
            WHERE ex.user_id = e2.user_id AND ex.timestamp > e2.timestamp AND ex.timestamp < e3.timestamp
        ){start_filter}{end_filter}
        GROUP BY e1.event_name, e2.event_name, e3.event_name ORDER BY count DESC LIMIT {limit}"
    )
}

/// Events before and after a target event.
/// Returns rows: (direction TEXT, event_name TEXT, count INT)
pub fn build_path_analysis_query(
    _backend: &dyn AnyBackend,
    start_date: &str,
    end_date: &str,
    event_name: &str,
) -> String {
    let escaped = event_name.replace('\'', "''");
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "SELECT 'before' AS direction, prev.event_name, COUNT(*) AS count
        FROM events curr
        JOIN events prev ON curr.user_id = prev.user_id AND prev.timestamp < curr.timestamp
        WHERE curr.event_name = '{escaped}'
          AND curr.timestamp >= '{safe_start}' AND curr.timestamp < '{safe_end}'
        GROUP BY prev.event_name
        UNION ALL
        SELECT 'after' AS direction, nxt.event_name, COUNT(*) AS count
        FROM events curr
        JOIN events nxt ON curr.user_id = nxt.user_id AND nxt.timestamp > curr.timestamp
        WHERE curr.event_name = '{escaped}'
          AND curr.timestamp >= '{safe_start}' AND curr.timestamp < '{safe_end}'
        GROUP BY nxt.event_name
        ORDER BY direction, count DESC"
    )
}

/// Funnel query for a sequence of steps.
/// Returns rows: (step TEXT, count INT)
/// For n steps, builds n CTEs (step0 ... stepN-1) and returns a single row with counts per step.
pub fn build_path_funnel_query(
    _backend: &dyn AnyBackend,
    steps: &[String],
    start_date: &str,
    end_date: &str,
) -> String {
    if steps.is_empty() {
        return "SELECT 'no_steps' AS step, 0 AS count".to_string();
    }

    let mut cte_parts = Vec::new();
    let mut select_cols = Vec::new();
    let mut join_parts = Vec::new();
    let mut prev_alias = String::new();

    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    for (i, step) in steps.iter().enumerate() {
        let escaped = step.replace('\'', "''");
        let alias = format!("step{i}");

        if i == 0 {
            cte_parts.push(format!(
                "{alias} AS (
                    SELECT user_id, MIN(timestamp) AS ts
                    FROM events
                    WHERE event_name = '{escaped}'
                      AND timestamp >= '{safe_start}' AND timestamp < '{safe_end}'
                    GROUP BY user_id
                )"
            ));
        } else {
            let prev = &prev_alias;
            cte_parts.push(format!(
                "{alias} AS (
                    SELECT s.user_id, MIN(e.timestamp) AS ts
                    FROM {prev} s
                    JOIN events e ON s.user_id = e.user_id
                    WHERE e.event_name = '{escaped}' AND e.timestamp > s.ts
                    GROUP BY s.user_id
                )"
            ));
            join_parts.push(format!("LEFT JOIN {alias} ON step0.user_id = {alias}.user_id"));
        }

        select_cols.push(format!("COUNT(DISTINCT {alias}.user_id) AS step{i}_count"));
        prev_alias = alias;
    }

    format!(
        "WITH {} SELECT {} FROM step0 {}",
        cte_parts.join(", "),
        select_cols.join(", "),
        join_parts.join(" ")
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::{AnyBackend, BackendRegistry};
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
        for sql in [
            "INSERT INTO events VALUES ('u1', 'home', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'pricing', '2024-01-15 10:01:00', '{}')",
            "INSERT INTO events VALUES ('u1', 'sign_up', '2024-01-15 10:02:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'home', '2024-01-15 11:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'pricing', '2024-01-15 11:01:00', '{}')",
        ] { backend.execute_any(conn, sql, vec![]).await.unwrap(); }
    }

    #[tokio::test]
    async fn test_paths_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_paths_query(backend, "2024-01-01", "2024-02-01", 10, None, None);
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
    }

    #[tokio::test]
    async fn test_path_analysis_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_path_analysis_query(backend, "2024-01-01", "2024-02-01", "pricing");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert!(!rows.is_empty());
    }

    #[tokio::test]
    async fn test_path_funnel_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let steps = vec!["home".to_string(), "pricing".to_string(), "sign_up".to_string()];
        let sql = build_path_funnel_query(backend, &steps, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 1);
    }
}
