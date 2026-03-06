"""Main application entry point for OpenFlow Analytics."""

import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse

from openflow import __version__
from openflow.api import (
    auth_router,
    connections_router,
    conversion_router,
    events_router,
    paths_router,
    pivot_router,
    retention_router,
    sessions_router,
    trend_router,
    ws_router,
)
from openflow.config import get_settings
from openflow.core.logging import setup_logging
from openflow.core.rate_limit import limiter
from openflow.product_db import init_product_db, run_migrations

settings = get_settings()
setup_logging(log_level=settings.log_level, log_format=settings.log_format)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next) -> StarletteResponse:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "0"
        return response


log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Warn if JWT secret is the insecure default
    if settings.jwt_secret == "dev-jwt-secret-change-in-production":
        log.warning(
            "insecure_jwt_secret",
            hint="Set OPENFLOW_JWT_SECRET to a strong random secret before deploying",
        )

    # Ensure db directory exists before opening any connection
    for db_file in settings.product_db_path:
        db_dir = os.path.dirname(db_file)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    init_product_db()
    run_migrations()

    log.info("api_ready", version=__version__, log_sql=settings.log_sql)

    yield  # Application runs here

    # Shutdown
    log.info("shutting_down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="OpenFlow Analytics",
        version=__version__,
        description="Bare Metal Product Analytics API",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)  # type: ignore[arg-type]

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,  # type: ignore[arg-type]
        allow_origins=settings.cors_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    )

    # Register routers
    app.include_router(auth_router)
    app.include_router(events_router)
    app.include_router(trend_router)
    app.include_router(retention_router)
    app.include_router(paths_router)
    app.include_router(conversion_router)
    app.include_router(pivot_router)
    app.include_router(connections_router)
    app.include_router(sessions_router)
    app.include_router(ws_router)

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

    uvicorn.run(
        "openflow.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["openflow"],
    )


if __name__ == "__main__":
    main()
