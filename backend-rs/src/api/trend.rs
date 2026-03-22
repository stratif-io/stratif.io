use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse, Filter};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::trend::{build_trend_query, build_trend_total_query};

#[derive(Deserialize)]
pub struct TrendParams {
    pub connection_id: String,
    pub event_name: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_granularity")]
    pub granularity: String,
    #[serde(default)]
    pub filters: Option<String>, // JSON-encoded Vec<Filter>
}

fn default_granularity() -> String { "day".into() }

#[derive(Serialize)]
pub struct TrendPoint {
    pub date: String,
    pub count: i64,
    pub unique_users: i64,
}

#[derive(Serialize)]
pub struct TrendResponse {
    pub data: Vec<TrendPoint>,
    pub total_unique_users: i64,
}

pub async fn get_trend(
    State(state): State<AppState>,
    Query(params): Query<TrendParams>,
) -> Result<Json<DataResponse<TrendResponse>>, ApiError> {
    let filters: Vec<Filter> = match &params.filters {
        Some(s) if !s.is_empty() => serde_json::from_str(s)?,
        _ => vec![],
    };

    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;

    // Time-series query
    let sql = build_trend_query(
        backend, &params.event_name, &params.granularity,
        &params.start_date, &params.end_date, &filters,
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let data: Vec<TrendPoint> = rows.into_iter().map(|row| TrendPoint {
        date: match &row[0] {
            SqlValue::Text(s) => s.clone(),
            other => format!("{other:?}"),
        },
        count: match &row[1] { SqlValue::Int(n) => *n, _ => 0 },
        unique_users: match &row[2] { SqlValue::Int(n) => *n, _ => 0 },
    }).collect();

    // Total unique users
    let total_sql = build_trend_total_query(
        backend, &params.event_name, &params.start_date, &params.end_date, &filters,
    );
    let total_rows = backend.execute_any(&mut conn, &total_sql, vec![]).await?;
    let total_unique_users = total_rows.first()
        .and_then(|r| match &r[0] { SqlValue::Int(n) => Some(*n), _ => None })
        .unwrap_or(0);

    Ok(Json(DataResponse { data: TrendResponse { data, total_unique_users } }))
}
