use axum::{extract::State, http::StatusCode};
use super::state::AppState;
pub async fn get_retention(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
