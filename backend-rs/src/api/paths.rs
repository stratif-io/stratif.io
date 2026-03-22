use axum::{extract::State, http::StatusCode};
use super::state::AppState;
pub async fn get_paths(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn get_path_analysis(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn get_path_funnel(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
