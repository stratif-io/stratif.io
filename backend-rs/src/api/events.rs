use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse, Filter};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::events::{
    build_distinct_events_query, build_raw_events_queries,
    build_top_events_query, build_user_events_queries,
};

// --- GET /api/events ---

#[derive(Deserialize)]
pub struct EventsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
}

pub async fn get_events(
    State(state): State<AppState>,
    Query(params): Query<EventsParams>,
) -> Result<Json<DataResponse<Vec<String>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_distinct_events_query(backend, &params.start_date, &params.end_date);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let events: Vec<String> = rows.into_iter()
        .filter_map(|r| match &r[0] { SqlValue::Text(s) => Some(s.clone()), _ => None })
        .collect();
    Ok(Json(DataResponse { data: events }))
}

// --- GET /api/events/top ---

#[derive(Deserialize)]
pub struct TopEventsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 { 10 }

#[derive(Serialize)]
pub struct TopEvent {
    pub event_name: String,
    pub count: i64,
}

pub async fn get_top_events(
    State(state): State<AppState>,
    Query(params): Query<TopEventsParams>,
) -> Result<Json<DataResponse<Vec<TopEvent>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_top_events_query(backend, &params.start_date, &params.end_date, params.limit);
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let events: Vec<TopEvent> = rows.into_iter().map(|r| TopEvent {
        event_name: match &r[0] { SqlValue::Text(s) => s.clone(), _ => String::new() },
        count: match &r[1] { SqlValue::Int(n) => *n, _ => 0 },
    }).collect();
    Ok(Json(DataResponse { data: events }))
}

// --- GET /api/raw/events ---

#[derive(Deserialize)]
pub struct RawEventsParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    pub event_name: Option<String>,
    pub user_id: Option<String>,
    #[serde(default)]
    pub filters: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

#[derive(Serialize)]
pub struct RawEvent {
    pub timestamp: String,
    pub user_id: String,
    pub event_name: String,
    pub properties: String,
}

#[derive(Serialize)]
pub struct PaginatedEvents {
    pub data: Vec<RawEvent>,
    pub total: i64,
    pub limit: u32,
    pub offset: u32,
}

pub async fn get_raw_events(
    State(state): State<AppState>,
    Query(params): Query<RawEventsParams>,
) -> Result<Json<DataResponse<PaginatedEvents>>, ApiError> {
    let filters: Vec<Filter> = match &params.filters {
        Some(s) if !s.is_empty() => serde_json::from_str(s)?,
        _ => vec![],
    };
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let (data_sql, count_sql) = build_raw_events_queries(
        backend,
        &params.start_date, &params.end_date,
        params.event_name.as_deref(), params.user_id.as_deref(),
        &filters, params.limit, params.offset,
    );
    let rows = backend.execute_any(&mut conn, &data_sql, vec![]).await?;
    let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await?;
    let total = count_rows.first()
        .and_then(|r| match &r[0] { SqlValue::Int(n) => Some(*n), _ => None })
        .unwrap_or(0);
    let data: Vec<RawEvent> = rows.into_iter().map(|r| RawEvent {
        timestamp: match &r[0] { SqlValue::Text(s) => s.clone(), other => format!("{other:?}") },
        user_id: match &r[1] { SqlValue::Text(s) => s.clone(), _ => String::new() },
        event_name: match &r[2] { SqlValue::Text(s) => s.clone(), _ => String::new() },
        properties: match &r[3] { SqlValue::Text(s) => s.clone(), _ => String::new() },
    }).collect();
    Ok(Json(DataResponse { data: PaginatedEvents { data, total, limit: params.limit, offset: params.offset } }))
}

// --- GET /api/users/:user_id/events ---

#[derive(Deserialize)]
pub struct UserEventsParams {
    pub connection_id: String,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

pub async fn get_user_events(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Query(params): Query<UserEventsParams>,
) -> Result<Json<DataResponse<PaginatedEvents>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let (data_sql, count_sql) = build_user_events_queries(backend, &user_id, params.limit, params.offset);
    let rows = backend.execute_any(&mut conn, &data_sql, vec![]).await?;
    let count_rows = backend.execute_any(&mut conn, &count_sql, vec![]).await?;
    let total = count_rows.first()
        .and_then(|r| match &r[0] { SqlValue::Int(n) => Some(*n), _ => None })
        .unwrap_or(0);
    let data: Vec<RawEvent> = rows.into_iter().map(|r| RawEvent {
        timestamp: match &r[0] { SqlValue::Text(s) => s.clone(), other => format!("{other:?}") },
        user_id: match &r[1] { SqlValue::Text(s) => s.clone(), _ => String::new() },
        event_name: match &r[2] { SqlValue::Text(s) => s.clone(), _ => String::new() },
        properties: match &r[3] { SqlValue::Text(s) => s.clone(), _ => String::new() },
    }).collect();
    Ok(Json(DataResponse { data: PaginatedEvents { data, total, limit: params.limit, offset: params.offset } }))
}
