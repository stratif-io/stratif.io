pub mod error;
pub mod state;
pub mod trend;
pub mod events;
pub mod sessions;
pub mod retention;
pub mod paths;
pub mod conversion;
pub mod pivot;
pub mod mission_control;

use axum::Router;
use state::AppState;

/// Build the complete Axum router with all API routes.
pub fn build_router(state: AppState) -> Router {
    use axum::routing::{get, post};

    Router::new()
        .route("/api/trend", get(trend::get_trend))
        .route("/api/events", get(events::get_events))
        .route("/api/events/top", get(events::get_top_events))
        .route("/api/raw/events", get(events::get_raw_events))
        .route("/api/users/:user_id/events", get(events::get_user_events))
        .route("/api/raw/sessions", get(sessions::get_raw_sessions))
        .route("/api/sessions/summary", get(sessions::get_sessions_summary))
        .route("/api/retention", get(retention::get_retention))
        .route("/api/paths", get(paths::get_paths))
        .route("/api/path-analysis", get(paths::get_path_analysis))
        .route("/api/path-funnel", get(paths::get_path_funnel))
        .route("/api/conversion", get(conversion::get_conversion))
        .route("/api/pivot/options", get(pivot::get_pivot_options))
        .route("/api/pivot", get(pivot::get_pivot))
        .route("/api/pivot/grid", get(pivot::get_pivot_grid))
        .route("/api/pivot/grid/filter-values", get(pivot::get_pivot_filter_values))
        .route("/api/pivot/grid/rows", post(pivot::post_pivot_grid_rows))
        .route("/api/mission-control", get(mission_control::get_mission_control))
        .route("/api/mission-control/trend", get(mission_control::get_mission_control_trend))
        .with_state(state)
}
