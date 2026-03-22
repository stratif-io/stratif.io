use axum::{extract::State, http::StatusCode};
use super::state::AppState;
pub async fn get_pivot_options(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn post_pivot(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn post_pivot_grid(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn get_pivot_filter_values(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
pub async fn post_pivot_grid_rows(State(_state): State<AppState>) -> StatusCode { StatusCode::NOT_IMPLEMENTED }
