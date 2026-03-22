use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::sessions::{build_sessions_query, build_sessions_summary_query};

// --- GET /api/raw/sessions ---

#[derive(Deserialize)]
pub struct SessionsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

fn default_limit() -> u32 { 50 }

#[derive(Serialize)]
pub struct Session {
    pub session_id: String,
    pub user_id: String,
    pub start_time: String,
    pub end_time: String,
    pub event_count: i64,
    pub duration_sec: f64,
}

#[derive(Serialize)]
pub struct PaginatedSessions {
    pub data: Vec<Session>,
    pub total: i64,
}

pub async fn get_raw_sessions(
    State(state): State<AppState>,
    Query(params): Query<SessionsParams>,
) -> Result<Json<DataResponse<PaginatedSessions>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_sessions_query(backend, &params.start_date, &params.end_date, params.limit, params.offset);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    // Also get total count using summary query
    let summary_sql = build_sessions_summary_query(backend, &params.start_date, &params.end_date);
    let summary_rows = backend.execute_any(&mut conn, &summary_sql, vec![]).await?;
    let total = summary_rows.first()
        .and_then(|r| match &r[0] { SqlValue::Int(n) => Some(*n), _ => None })
        .unwrap_or(0);

    let data: Vec<Session> = rows.into_iter().map(|r| Session {
        session_id: match &r[0] { SqlValue::Text(s) => s.clone(), other => format!("{other:?}") },
        user_id: match &r[1] { SqlValue::Text(s) => s.clone(), _ => String::new() },
        start_time: match &r[2] { SqlValue::Text(s) => s.clone(), other => format!("{other:?}") },
        end_time: match &r[3] { SqlValue::Text(s) => s.clone(), other => format!("{other:?}") },
        event_count: match &r[4] { SqlValue::Int(n) => *n, _ => 0 },
        duration_sec: match &r[5] { SqlValue::Float(f) => *f, SqlValue::Int(n) => *n as f64, _ => 0.0 },
    }).collect();

    Ok(Json(DataResponse { data: PaginatedSessions { data, total } }))
}

// --- GET /api/sessions/summary ---

#[derive(Deserialize)]
pub struct SessionsSummaryParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize)]
pub struct SessionsSummary {
    pub total_sessions: i64,
    pub avg_duration_sec: f64,
    pub avg_events_per_session: f64,
}

pub async fn get_sessions_summary(
    State(state): State<AppState>,
    Query(params): Query<SessionsSummaryParams>,
) -> Result<Json<DataResponse<SessionsSummary>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_sessions_summary_query(backend, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let row = rows.into_iter().next().ok_or_else(|| anyhow::anyhow!("no session data"))?;
    Ok(Json(DataResponse { data: SessionsSummary {
        total_sessions: match &row[0] { SqlValue::Int(n) => *n, _ => 0 },
        avg_duration_sec: match &row[1] { SqlValue::Float(f) => *f, SqlValue::Int(n) => *n as f64, _ => 0.0 },
        avg_events_per_session: match &row[2] { SqlValue::Float(f) => *f, SqlValue::Int(n) => *n as f64, _ => 0.0 },
    }}))
}
