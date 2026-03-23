use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};
use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::mission_control::{build_mission_control_query, build_mission_control_trend_query};

#[derive(Deserialize)]
pub struct MissionControlParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize, Clone)]
pub struct PeriodMetrics {
    pub total_events: i64,
    pub unique_users: i64,
    pub total_sessions: i64,
    pub avg_session_duration_sec: f64,
    pub avg_events_per_session: f64,
    pub new_users: i64,
    pub returning_users: i64,
    pub dau_mau_ratio: f64,
}

fn default_metrics() -> PeriodMetrics {
    PeriodMetrics {
        total_events: 0, unique_users: 0, total_sessions: 0,
        avg_session_duration_sec: 0.0, avg_events_per_session: 0.0,
        new_users: 0, returning_users: 0, dau_mau_ratio: 0.0,
    }
}

fn extract_metrics(row: &[SqlValue]) -> PeriodMetrics {
    PeriodMetrics {
        total_events: match &row[0] { SqlValue::Int(n) => *n, _ => 0 },
        unique_users: match &row[1] { SqlValue::Int(n) => *n, _ => 0 },
        total_sessions: match &row[2] { SqlValue::Int(n) => *n, _ => 0 },
        avg_session_duration_sec: match &row[3] { SqlValue::Float(f) => *f, SqlValue::Int(n) => *n as f64, _ => 0.0 },
        avg_events_per_session: match &row[4] { SqlValue::Float(f) => *f, SqlValue::Int(n) => *n as f64, _ => 0.0 },
        new_users: match &row[5] { SqlValue::Int(n) => *n, _ => 0 },
        returning_users: match &row[6] { SqlValue::Int(n) => *n, _ => 0 },
        dau_mau_ratio: match &row[7] { SqlValue::Float(f) => *f, SqlValue::Int(n) => *n as f64, _ => 0.0 },
    }
}

#[derive(Serialize)]
pub struct DateRange {
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize)]
pub struct MissionControlResponse {
    pub period: DateRange,
    pub previous_period: DateRange,
    pub current: PeriodMetrics,
    pub previous: PeriodMetrics,
}

fn previous_period(start_date: &str, end_date: &str) -> Result<(String, String), anyhow::Error> {
    let start = chrono::NaiveDate::parse_from_str(start_date, "%Y-%m-%d")
        .map_err(|e| anyhow::anyhow!("invalid start_date: {e}"))?;
    let end = chrono::NaiveDate::parse_from_str(end_date, "%Y-%m-%d")
        .map_err(|e| anyhow::anyhow!("invalid end_date: {e}"))?;
    let duration = end.signed_duration_since(start);
    let prev_end = start;
    let prev_start = prev_end - duration;
    Ok((prev_start.to_string(), prev_end.to_string()))
}

pub async fn get_mission_control(
    State(state): State<AppState>,
    Query(params): Query<MissionControlParams>,
) -> Result<Json<MissionControlResponse>, ApiError> {
    let (prev_start, prev_end) = previous_period(&params.start_date, &params.end_date)?;
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;

    let current_sql = build_mission_control_query(backend, &params.start_date, &params.end_date);
    let current_rows = backend.execute_any(&mut conn, &current_sql, vec![]).await?;
    let current = current_rows.first().map(|r| extract_metrics(r)).unwrap_or_else(default_metrics);

    let prev_sql = build_mission_control_query(backend, &prev_start, &prev_end);
    let prev_rows = backend.execute_any(&mut conn, &prev_sql, vec![]).await?;
    let previous = prev_rows.first().map(|r| extract_metrics(r)).unwrap_or_else(default_metrics);

    Ok(Json(MissionControlResponse {
        period: DateRange { start_date: params.start_date.clone(), end_date: params.end_date.clone() },
        previous_period: DateRange { start_date: prev_start, end_date: prev_end },
        current,
        previous,
    }))
}

// --- GET /api/mission-control/trend ---

#[derive(Deserialize)]
pub struct MissionControlTrendParams {
    pub connection_id: String,
    pub metric: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize)]
pub struct TrendPoint { pub date: String, pub value: f64 }

pub async fn get_mission_control_trend(
    State(state): State<AppState>,
    Query(params): Query<MissionControlTrendParams>,
) -> Result<Json<DataResponse<Vec<TrendPoint>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_mission_control_trend_query(backend, &params.metric, &params.start_date, &params.end_date)
        .ok_or_else(|| anyhow::anyhow!("unsupported metric for trend: {}", params.metric))?;
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let data: Vec<TrendPoint> = rows.into_iter().map(|r| TrendPoint {
        date: match &r[0] { SqlValue::Text(s) => s.clone(), other => format!("{other:?}") },
        value: match &r[1] { SqlValue::Float(f) => *f, SqlValue::Int(n) => *n as f64, _ => 0.0 },
    }).collect();
    Ok(Json(DataResponse { data }))
}
