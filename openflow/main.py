"""Main application entry point for OpenFlow Analytics."""

import os
import warnings
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from openflow import __version__
from openflow.config import get_settings
from openflow.db import get_db, create_views, seed_database
from openflow.product_db import init_product_db
from openflow.api import (
    auth_router,
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
    # Warn if JWT secret is the insecure default
    if settings.jwt_secret == "dev-jwt-secret-change-in-production":
        warnings.warn(
            "\n\n"
            "⚠️  WARNING: JWT secret is set to the default development value.\n"
            "   Set OPENFLOW_JWT_SECRET to a strong random secret before deploying!\n",
            stacklevel=1,
        )

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

    print("🚀 Analytics API ready!")

    yield  # Application runs here

    # Shutdown
    print("👋 Shutting down...")


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
    app.include_router(auth_router)
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
                "auth": "/api/auth/login",
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
