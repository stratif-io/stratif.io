use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};
use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::conversion::build_conversion_query;

#[derive(Deserialize)]
pub struct ConversionParams {
    pub connection_id: String,
    pub entry_event: String,
    pub goal_event: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Serialize)]
pub struct ConversionResponse {
    pub entry_count: i64,
    pub converted_count: i64,
    pub conversion_rate: f64,
}

pub async fn get_conversion(
    State(state): State<AppState>,
    Query(params): Query<ConversionParams>,
) -> Result<Json<DataResponse<ConversionResponse>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_conversion_query(backend, &params.entry_event, &params.goal_event, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let row = rows.into_iter().next().ok_or_else(|| anyhow::anyhow!("no conversion data"))?;
    let entry_count = match &row[0] { SqlValue::Int(n) => *n, _ => 0 };
    let converted_count = match &row[1] { SqlValue::Int(n) => *n, _ => 0 };
    let conversion_rate = if entry_count > 0 { converted_count as f64 / entry_count as f64 * 100.0 } else { 0.0 };
    Ok(Json(DataResponse { data: ConversionResponse { entry_count, converted_count, conversion_rate } }))
}
