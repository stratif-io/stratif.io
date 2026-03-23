pub mod connections;
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
        // connections
        .route("/api/connections", get(connections::list_connections).post(connections::create_connection))
        .route("/api/connections/:conn_id", get(connections::get_connection).patch(connections::update_connection).delete(connections::delete_connection))
        .route("/api/connections/:conn_id/test", post(connections::test_connection))
        .route("/api/connections/:conn_id/schema/detect", get(connections::detect_schema))
        .route("/api/connections/:conn_id/schema", get(connections::get_schema_config).put(connections::upsert_schema_config))
        .route("/api/connections/:conn_id/filters", get(connections::get_filter_config).put(connections::upsert_filter_config))
        .route("/api/connections/:conn_id/filter-options", get(connections::get_filter_options))
        .route("/api/connections/:conn_id/field-options", get(connections::get_field_options))
        .route("/api/connections/:conn_id/credentials", get(connections::get_credentials))
        .route("/api/connections/:conn_id/string", get(connections::get_connection_string))
        .route("/api/connections/:conn_id/browse", get(connections::browse_connection))
        .route("/api/connections/:conn_id/tables", get(connections::list_tables))
        // analytics
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
