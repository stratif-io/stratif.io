use axum::{extract::State, http::StatusCode};
use super::state::AppState;
pub async fn get_events(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn get_top_events(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn get_raw_events(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn get_user_events(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
