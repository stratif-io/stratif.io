use axum::{extract::State, http::StatusCode};
use super::state::AppState;
pub async fn get_mission_control(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn get_mission_control_trend(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
