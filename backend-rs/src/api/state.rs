use std::sync::Arc;
use crate::connectors::BackendRegistry;
use crate::connectors::drivers::sqlite::SqliteHandle;

/// Shared application state, passed to every handler via `State<AppState>`.
#[derive(Clone)]
pub struct AppState {
    pub registry: Arc<BackendRegistry>,
    pub product_db: SqliteHandle,
    pub encryption_key: Arc<String>,
}
