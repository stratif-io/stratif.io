use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};
use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::pivot::{
    build_pivot_options_events_query, build_pivot_query,
    build_filter_values_query, build_pivot_grid_rows_query, build_pivot_grid_rows_count_query,
};

// --- GET /api/pivot/options ---
#[derive(Deserialize)]
pub struct PivotOptionsParams {
    pub connection_id: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Serialize)]
pub struct PivotOptions { pub dimensions: Vec<String>, pub metrics: Vec<String> }

pub async fn get_pivot_options(
    State(state): State<AppState>,
    Query(params): Query<PivotOptionsParams>,
) -> Result<Json<DataResponse<PivotOptions>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let start = params.start_date.as_deref().unwrap_or("1970-01-01");
    let end = params.end_date.as_deref().unwrap_or("9999-12-31");
    let sql = build_pivot_options_events_query(backend, start, end);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let dimensions: Vec<String> = rows.into_iter()
        .filter_map(|r| match &r[0] { SqlValue::Text(s) => Some(s.clone()), _ => None })
        .collect();
    let metrics = vec!["count".to_string(), "unique_users".to_string(), "session_count".to_string()];
    Ok(Json(DataResponse { data: PivotOptions { dimensions, metrics } }))
}

// --- GET /api/pivot ---
#[derive(Deserialize)]
pub struct PivotParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default)]
    pub rows: Option<String>, // JSON array
    #[serde(default)]
    pub cols: Option<String>, // JSON array
    #[serde(default)]
    pub values: Option<String>, // JSON array
    #[serde(default = "default_agg")]
    pub agg_func: String,
}
fn default_agg() -> String { "count".into() }

pub type PivotRow = serde_json::Value;

fn rows_to_json(db_rows: Vec<Vec<SqlValue>>) -> Vec<PivotRow> {
    db_rows.into_iter().map(|r| {
        let obj: serde_json::Map<String, serde_json::Value> = r.into_iter().enumerate().map(|(i, v)| {
            let val = match v {
                SqlValue::Int(n) => serde_json::json!(n),
                SqlValue::Float(f) => serde_json::json!(f),
                SqlValue::Text(s) => serde_json::json!(s),
                _ => serde_json::Value::Null,
            };
            (format!("col{i}"), val)
        }).collect();
        serde_json::Value::Object(obj)
    }).collect()
}

pub async fn get_pivot(
    State(state): State<AppState>,
    Query(params): Query<PivotParams>,
) -> Result<Json<DataResponse<Vec<PivotRow>>>, ApiError> {
    let rows_dims: Vec<String> = params.rows.as_deref()
        .and_then(|s| serde_json::from_str(s).ok()).unwrap_or_default();
    let cols_dims: Vec<String> = params.cols.as_deref()
        .and_then(|s| serde_json::from_str(s).ok()).unwrap_or_default();
    let values: Vec<String> = params.values.as_deref()
        .and_then(|s| serde_json::from_str(s).ok()).unwrap_or_default();
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_pivot_query(backend, &rows_dims, &cols_dims, &values, &params.agg_func, &params.start_date, &params.end_date);
    let db_rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    Ok(Json(DataResponse { data: rows_to_json(db_rows) }))
}

// --- GET /api/pivot/grid ---
#[derive(Serialize)]
pub struct PivotGridData {
    pub columns: Vec<String>,
    pub rows: Vec<PivotRow>,
}

pub async fn get_pivot_grid(
    State(state): State<AppState>,
    Query(params): Query<PivotParams>,
) -> Result<Json<DataResponse<PivotGridData>>, ApiError> {
    let rows_dims: Vec<String> = params.rows.as_deref()
        .and_then(|s| serde_json::from_str(s).ok()).unwrap_or_default();
    let cols_dims: Vec<String> = params.cols.as_deref()
        .and_then(|s| serde_json::from_str(s).ok()).unwrap_or_default();
    let values: Vec<String> = params.values.as_deref()
        .and_then(|s| serde_json::from_str(s).ok()).unwrap_or_default();
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_pivot_query(backend, &rows_dims, &cols_dims, &values, &params.agg_func, &params.start_date, &params.end_date);
    let db_rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    // Derive column names from rows + cols + values params
    let mut columns: Vec<String> = rows_dims.iter().chain(cols_dims.iter()).cloned().collect();
    if values.is_empty() {
        columns.push("count".to_string());
    } else {
        for v in &values {
            columns.push(format!("{v}_agg"));
        }
    }
    if columns.is_empty() {
        columns.push("event_name".to_string());
        columns.push("count".to_string());
    }

    let rows = rows_to_json(db_rows);
    Ok(Json(DataResponse { data: PivotGridData { columns, rows } }))
}

// --- GET /api/pivot/grid/filter-values ---
#[derive(Deserialize)]
pub struct FilterValuesParams {
    pub connection_id: String,
    pub field: String,
    pub start_date: String,
    pub end_date: String,
}

pub async fn get_pivot_filter_values(
    State(state): State<AppState>,
    Query(params): Query<FilterValuesParams>,
) -> Result<Json<DataResponse<Vec<String>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_filter_values_query(backend, &params.field, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let values: Vec<String> = rows.into_iter()
        .filter_map(|r| match &r[0] { SqlValue::Text(s) => Some(s.clone()), _ => None })
        .collect();
    Ok(Json(DataResponse { data: values }))
}

// --- POST /api/pivot/grid/rows ---
#[derive(Deserialize)]
pub struct PivotGridRowsRequest {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default)]
    pub rows: Vec<String>,
    #[serde(default)]
    pub cols: Vec<String>,
    #[serde(default)]
    pub values: Vec<String>,
    #[serde(default = "default_agg")]
    pub agg_func: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}
fn default_limit() -> u32 { 100 }

#[derive(Serialize)]
pub struct PivotGridRowsData {
    pub rows: Vec<PivotRow>,
    pub total: usize,
}

pub async fn post_pivot_grid_rows(
    State(state): State<AppState>,
    Json(req): Json<PivotGridRowsRequest>,
) -> Result<Json<DataResponse<PivotGridRowsData>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &req.connection_id).await?;
    let all_dims: Vec<String> = req.rows.iter().chain(req.cols.iter()).cloned().collect();
    // Get total count via a COUNT(*) wrapper query (avoids loading all rows)
    let count_sql = build_pivot_grid_rows_count_query(backend, &all_dims, &req.values, &req.agg_func, &req.start_date, &req.end_date);
    let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await?;
    let total = count_rows.first()
        .and_then(|r| r.first())
        .map(|v| match v { SqlValue::Int(n) => *n as usize, _ => 0 })
        .unwrap_or(0);
    let sql = build_pivot_grid_rows_query(backend, &all_dims, &req.values, &req.agg_func, &req.start_date, &req.end_date, req.limit, req.offset, req.sort_by.as_deref(), req.sort_dir.as_deref());
    let db_rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    Ok(Json(DataResponse { data: PivotGridRowsData { rows: rows_to_json(db_rows), total } }))
}
