"""Main application entry point for OpenFlow Analytics."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from openflow import __version__
from openflow.config import get_settings
from openflow.db import get_db, create_views, seed_database
from openflow.product_db import init_product_db, get_product_db
from openflow.core.auth import derive_user_id
from openflow.services.crypto import encrypt_credentials
from openflow.api import (
    events_router,
    trend_router,
    retention_router,
    sessions_router,
    paths_router,
    conversion_router,
    pivot_router,
    connections_router,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    db = get_db()
    needs_seeding = False

    if not os.path.exists(settings.db_path):
        needs_seeding = True
    else:
        if not db.table_exists("events"):
            needs_seeding = True

    if needs_seeding:
        seed_database(db)

    # Create analytics views
    create_views(db)

    # Initialize product DB schema
    init_product_db()

    # Auto-register the seeded openflow.duckdb as the default connection
    _auto_register_default_connection()

    print("🚀 Analytics API ready!")

    yield  # Application runs here

    # Shutdown
    print("👋 Shutting down...")


def _auto_register_default_connection() -> None:
    """Register openflow.duckdb as the default connection if none exists."""
    import uuid as _uuid
    import os as _os

    product_db = get_product_db()
    user_id = derive_user_id(settings.api_key)

    # Ensure the default user exists
    key_hash = __import__("hashlib").sha256(settings.api_key.encode()).hexdigest()
    existing_user = product_db.fetchone("SELECT id FROM users WHERE id = ?", (user_id,))
    if not existing_user:
        product_db.execute(
            "INSERT INTO users (id, api_key_hash) VALUES (?, ?)",
            (user_id, key_hash),
        )

    # Check if this user already has connections
    count_row = product_db.fetchone(
        "SELECT COUNT(*) as n FROM connections WHERE user_id = ?", (user_id,)
    )
    if count_row and count_row["n"] > 0:
        return  # Already registered

    # Register openflow.duckdb as the built-in default connection
    conn_id = str(_uuid.uuid4())
    db_path = _os.path.abspath(settings.db_path)
    encrypted = encrypt_credentials({"file_path": db_path})
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    product_db.execute(
        "INSERT INTO connections (id, user_id, name, db_type, credentials_encrypted, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (conn_id, user_id, "OpenFlow Demo (DuckDB)", "duckdb", encrypted, now, now),
    )

    # Create default schema config (identity mapping — standard column names)
    schema_id = str(_uuid.uuid4())
    # Default schema: identity mapping + default custom properties for common dimensions
    default_custom_props = __import__("json").dumps([
        {"name": "country", "path": "properties.country", "type": "string", "flatten": False},
        {"name": "browser", "path": "properties.browser", "type": "string", "flatten": False},
        {"name": "device_type", "path": "properties.device_type", "type": "string", "flatten": False},
        {"name": "os", "path": "properties.os", "type": "string", "flatten": False},
    ])
    product_db.execute(
        "INSERT INTO connection_schema_configs "
        "(id, connection_id, user_id_field, timestamp_field, event_name_field, custom_properties, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (schema_id, conn_id, "user_id", "timestamp", "event_name", default_custom_props, now),
    )

    # Default filter config: enable country and browser as global filters
    filter_id = str(_uuid.uuid4())
    default_filter_fields = __import__("json").dumps([
        {"field": "country", "label": "Country", "icon": "Globe"},
        {"field": "browser", "label": "Browser", "icon": "Chrome"},
    ])
    product_db.execute(
        "INSERT INTO connection_filter_configs "
        "(id, connection_id, user_id, filter_fields, updated_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (filter_id, conn_id, user_id, default_filter_fields, now),
    )

    print(f"📦 Default connection registered: {db_path} (id={conn_id})")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="OpenFlow Analytics",
        version=__version__,
        description="Bare Metal Product Analytics API",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(events_router)
    app.include_router(trend_router)
    app.include_router(retention_router)
    app.include_router(sessions_router)
    app.include_router(paths_router)
    app.include_router(conversion_router)
    app.include_router(pivot_router)
    app.include_router(connections_router)

    @app.get("/")
    def root():
        """Root endpoint with API info."""
        return {
            "name": "OpenFlow Analytics API",
            "version": __version__,
            "endpoints": {
                "docs": "/docs",
                "trend": "/api/trend?event_name={event}&granularity={day|week}",
                "retention": "/api/retention",
                "events": "/api/events",
                "paths": "/api/paths?target_event=Purchase&device_type=Mobile",
                "raw_events": "/api/raw/events",
                "raw_sessions": "/api/raw/sessions",
                "sessions_summary": "/api/sessions/summary",
                "conversion": "/api/conversion",
            },
        }

    return app


# Create app instance
app = create_app()


# ============================================================================
# MAIN
# ============================================================================

def main():
    import uvicorn

    uvicorn.run("openflow.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
