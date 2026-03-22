use std::sync::Arc;

use stratifio_backend::api::{build_router, state::AppState};
use stratifio_backend::connectors::BackendRegistry;
use stratifio_backend::connectors::drivers::sqlite::{SqliteBackend, SqliteCredentials};
use stratifio_backend::connectors::backend::DatabaseBackend;
use stratifio_backend::connectors::mod_types::BackendConnection;

use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,stratifio_backend=debug".parse().unwrap()),
        )
        .init();
    // Read configuration from environment
    let host = std::env::var("STRATIFIO_HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let port: u16 = std::env::var("STRATIFIO_PORT")
        .unwrap_or_else(|_| "8001".into())
        .parse()
        .expect("STRATIFIO_PORT must be a valid u16");
    let encryption_key = std::env::var("STRATIFIO_ENCRYPTION_KEY")
        .unwrap_or_else(|_| "dev-key-change-in-production-please".into());
    let product_db_path = std::env::var("STRATIFIO_PRODUCT_DB_PATH")
        .unwrap_or_else(|_| "stratifio_product.db".into());

    // Open product database (SQLite)
    let sqlite_backend = SqliteBackend::new();
    let product_conn = DatabaseBackend::open(
        &sqlite_backend,
        &SqliteCredentials {
            file_path: product_db_path.clone(),
        },
    )
    .await
    .expect("failed to open product database");

    let product_handle = match product_conn {
        BackendConnection::Sqlite(h) => h,
        _ => panic!("expected Sqlite connection for product DB"),
    };

    // Build app state
    let state = AppState {
        registry: Arc::new(BackendRegistry::default()),
        product_db: product_handle,
        encryption_key: Arc::new(encryption_key),
    };

    // CORS layer — allow all origins in dev mode
    let cors_origins = std::env::var("STRATIFIO_CORS_ORIGINS").unwrap_or_default();
    let cors = if cors_origins.is_empty() || cors_origins == "*" {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        let origins: Vec<axum::http::HeaderValue> = cors_origins
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let app = build_router(state).layer(cors).layer(TraceLayer::new_for_http());

    let addr = format!("{host}:{port}");
    tracing::info!("stratifio-backend listening on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind");
    axum::serve(listener, app).await.expect("server error");
}
