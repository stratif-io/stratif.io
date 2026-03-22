use crate::connectors::AnyBackend;

/// Distinct event names for pivot dimension options.
pub fn build_pivot_options_events_query(_backend: &dyn AnyBackend, start_date: &str, end_date: &str) -> String {
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "SELECT DISTINCT event_name FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         ORDER BY event_name LIMIT 100"
    )
}

/// Pivot/grid query: GROUP BY row dimensions, aggregate value columns.
pub fn build_pivot_query(
    backend: &dyn AnyBackend,
    rows_dims: &[String],
    cols_dims: &[String],
    values: &[String],
    agg_func: &str,
    start_date: &str,
    end_date: &str,
) -> String {
    let q = backend.identifier_quote_char();
    let safe_agg = match agg_func { "avg" | "min" | "max" | "sum" => agg_func, _ => "count" };

    let all_dims: Vec<&String> = rows_dims.iter().chain(cols_dims.iter()).collect();
    let group_cols = if all_dims.is_empty() {
        "event_name".to_string()
    } else {
        all_dims.iter().map(|d| {
            let safe_d = d.replace(q, "");
            format!("{q}{safe_d}{q}")
        }).collect::<Vec<_>>().join(", ")
    };

    let value_exprs = if values.is_empty() {
        "COUNT(*) AS count".to_string()
    } else {
        values.iter().map(|v| {
            let safe_v = v.replace(q, "");
            format!("{safe_agg}({q}{safe_v}{q}) AS {q}{safe_v}_agg{q}")
        }).collect::<Vec<_>>().join(", ")
    };

    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "SELECT {group_cols}, {value_exprs} \
         FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         GROUP BY {group_cols} ORDER BY 1 LIMIT 1000"
    )
}

/// Distinct values for a dimension field (for filter autocomplete).
pub fn build_filter_values_query(backend: &dyn AnyBackend, field: &str, start_date: &str, end_date: &str) -> String {
    let q = backend.identifier_quote_char();
    let safe_field = field.replace(q, "");
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "SELECT DISTINCT {q}{safe_field}{q} FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         AND {q}{safe_field}{q} IS NOT NULL ORDER BY 1 LIMIT 100"
    )
}

/// Paginated pivot grid rows.
pub fn build_pivot_grid_rows_query(
    backend: &dyn AnyBackend,
    rows_dims: &[String],
    values: &[String],
    agg_func: &str,
    start_date: &str,
    end_date: &str,
    limit: u32,
    offset: u32,
    sort_by: Option<&str>,
    sort_dir: Option<&str>,
) -> String {
    let q = backend.identifier_quote_char();
    let safe_agg = match agg_func { "avg" | "min" | "max" | "sum" => agg_func, _ => "count" };
    let group_cols = if rows_dims.is_empty() {
        "event_name".to_string()
    } else {
        rows_dims.iter().map(|d| {
            let safe_d = d.replace(q, "");
            format!("{q}{safe_d}{q}")
        }).collect::<Vec<_>>().join(", ")
    };
    let value_exprs = if values.is_empty() {
        "COUNT(*) AS count".to_string()
    } else {
        values.iter().map(|v| {
            let safe_v = v.replace(q, "");
            format!("{safe_agg}({q}{safe_v}{q}) AS {q}{safe_v}_agg{q}")
        }).collect::<Vec<_>>().join(", ")
    };
    let order_clause = match sort_by {
        Some(col) => {
            let safe_col = col.replace(q, "");
            let dir = match sort_dir { Some("desc") => "DESC", _ => "ASC" };
            format!("{q}{safe_col}{q} {dir}")
        }
        None => "1".to_string(),
    };
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    format!(
        "SELECT {group_cols}, {value_exprs} \
         FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         GROUP BY {group_cols} ORDER BY {order_clause} LIMIT {limit} OFFSET {offset}"
    )
}

/// Count query for pivot grid rows (wraps the GROUP BY in a COUNT(*)).
pub fn build_pivot_grid_rows_count_query(
    backend: &dyn AnyBackend,
    rows_dims: &[String],
    values: &[String],
    agg_func: &str,
    start_date: &str,
    end_date: &str,
) -> String {
    let q = backend.identifier_quote_char();
    let safe_agg = match agg_func { "avg" | "min" | "max" | "sum" => agg_func, _ => "count" };
    let group_cols = if rows_dims.is_empty() {
        "event_name".to_string()
    } else {
        rows_dims.iter().map(|d| {
            let safe_d = d.replace(q, "");
            format!("{q}{safe_d}{q}")
        }).collect::<Vec<_>>().join(", ")
    };
    let value_exprs = if values.is_empty() {
        "COUNT(*) AS count".to_string()
    } else {
        values.iter().map(|v| {
            let safe_v = v.replace(q, "");
            format!("{safe_agg}({q}{safe_v}{q}) AS {q}{safe_v}_agg{q}")
        }).collect::<Vec<_>>().join(", ")
    };
    let safe_start = start_date.replace('\'', "''");
    let safe_end = end_date.replace('\'', "''");
    let inner = format!(
        "SELECT {group_cols}, {value_exprs} \
         FROM events \
         WHERE timestamp >= '{safe_start}' AND timestamp < '{safe_end}' \
         GROUP BY {group_cols}"
    );
    format!("SELECT COUNT(*) AS total FROM ({inner}) AS _pivot_count")
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
            "INSERT INTO events VALUES ('u1', 'page_view', '2024-01-15 10:00:00', '{}')",
            "INSERT INTO events VALUES ('u2', 'purchase', '2024-01-15 11:00:00', '{}')",
        ] { backend.execute_any(conn, sql, vec![]).await.unwrap(); }
    }

    #[tokio::test]
    async fn test_pivot_options_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_pivot_options_events_query(backend, "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
    }

    #[tokio::test]
    async fn test_pivot_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_pivot_query(backend, &[], &[], &[], "count", "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
    }

    #[tokio::test]
    async fn test_filter_values_query_runs() {
        let (mut conn, backend) = make_duckdb().await;
        seed(&mut conn, backend).await;
        let sql = build_filter_values_query(backend, "event_name", "2024-01-01", "2024-02-01");
        let rows = backend.execute_any(&mut conn, &sql, vec![]).await.unwrap();
        assert_eq!(rows.len(), 2);
    }
}
