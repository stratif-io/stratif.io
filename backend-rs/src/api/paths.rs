use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};
use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::paths::{build_path_analysis_query, build_path_funnel_query, build_paths_query};

// --- GET /api/paths ---
#[derive(Deserialize)]
pub struct PathsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    pub start_event: Option<String>,
    pub end_event: Option<String>,
}
fn default_limit() -> u32 { 20 }

#[derive(Serialize)]
pub struct PathEntry { pub path: Vec<String>, pub count: i64 }

pub async fn get_paths(
    State(state): State<AppState>,
    Query(params): Query<PathsParams>,
) -> Result<Json<DataResponse<Vec<PathEntry>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_paths_query(backend, &params.start_date, &params.end_date, params.limit, params.start_event.as_deref(), params.end_event.as_deref());
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let data: Vec<PathEntry> = rows.into_iter().map(|r| {
        let e1 = match &r[0] { SqlValue::Text(s) => s.clone(), _ => String::new() };
        let e2 = match &r[1] { SqlValue::Text(s) => s.clone(), _ => String::new() };
        let e3 = match &r[2] { SqlValue::Text(s) => s.clone(), _ => String::new() };
        let count = match &r[3] { SqlValue::Int(n) => *n, _ => 0 };
        PathEntry { path: vec![e1, e2, e3], count }
    }).collect();
    Ok(Json(DataResponse { data }))
}

// --- GET /api/path-analysis ---
#[derive(Deserialize)]
pub struct PathAnalysisParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub event_name: String,
}

#[derive(Serialize)]
pub struct PathAnalysisEntry { pub event: String, pub count: i64 }

#[derive(Serialize)]
pub struct PathAnalysisResponse { pub before: Vec<PathAnalysisEntry>, pub after: Vec<PathAnalysisEntry> }

pub async fn get_path_analysis(
    State(state): State<AppState>,
    Query(params): Query<PathAnalysisParams>,
) -> Result<Json<DataResponse<PathAnalysisResponse>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_path_analysis_query(backend, &params.start_date, &params.end_date, &params.event_name);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let mut before = vec![];
    let mut after = vec![];
    for r in rows {
        let direction = match &r[0] { SqlValue::Text(s) => s.clone(), _ => String::new() };
        let event = match &r[1] { SqlValue::Text(s) => s.clone(), _ => String::new() };
        let count = match &r[2] { SqlValue::Int(n) => *n, _ => 0 };
        if direction == "before" { before.push(PathAnalysisEntry { event, count }); }
        else { after.push(PathAnalysisEntry { event, count }); }
    }
    Ok(Json(DataResponse { data: PathAnalysisResponse { before, after } }))
}

// --- GET /api/path-funnel ---
#[derive(Deserialize)]
pub struct PathFunnelParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub steps: String, // JSON array of step names
}

#[derive(Serialize)]
pub struct FunnelStep { pub step: String, pub count: i64, pub pct_of_prev: Option<f64> }

pub async fn get_path_funnel(
    State(state): State<AppState>,
    Query(params): Query<PathFunnelParams>,
) -> Result<Json<DataResponse<Vec<FunnelStep>>>, ApiError> {
    let steps: Vec<String> = serde_json::from_str(&params.steps)?;
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_path_funnel_query(backend, &steps, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    let counts: Vec<i64> = if let Some(row) = rows.first() {
        row.iter().map(|v| match v { SqlValue::Int(n) => *n, _ => 0 }).collect()
    } else { vec![] };

    let result: Vec<FunnelStep> = steps.iter().zip(counts.iter()).enumerate().map(|(i, (step, &count))| {
        let pct_of_prev = if i == 0 { None } else {
            let prev = counts[i-1];
            if prev > 0 { Some(count as f64 / prev as f64 * 100.0) } else { None }
        };
        FunnelStep { step: step.clone(), count, pct_of_prev }
    }).collect();

    Ok(Json(DataResponse { data: result }))
}
