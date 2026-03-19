# backend/main.py
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware


class APITrailingSlashMiddleware(BaseHTTPMiddleware):
    """Rewrite the specific API collection paths that are registered with a trailing slash."""
    _TRAILING_SLASH_PATHS = {"/api/connections"}

    async def dispatch(self, request: Request, call_next):
        if request.scope["path"] in self._TRAILING_SLASH_PATHS:
            request.scope["path"] += "/"
        return await call_next(request)

from backend.config import settings
from backend.core.logging import setup_logging
from backend.product_db import init_product_db
from backend.api import (
    connections_router,
    conversion_router,
    events_router,
    paths_router,
    pivot_router,
    retention_router,
    sessions_router,
    trend_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level, settings.log_format)
    init_product_db()
    yield


app = FastAPI(
    title="stratif.io Analytics",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

app.add_middleware(APITrailingSlashMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trend_router)
app.include_router(retention_router)
app.include_router(events_router)
app.include_router(paths_router)
app.include_router(conversion_router)
app.include_router(pivot_router)
app.include_router(sessions_router)
app.include_router(connections_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# SPA fallback (production)
dist_path = Path(__file__).parent.parent / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")

    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/dashboard", status_code=302)

    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(dist_path / "favicon.svg", media_type="image/svg+xml")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(dist_path / "index.html")


def create_analytics_app() -> FastAPI:
    """Create an stratif.io analytics FastAPI sub-application for embedding in a SaaS wrapper."""
    router_app = FastAPI(title="stratif.io Analytics")
    router_app.include_router(trend_router)
    router_app.include_router(retention_router)
    router_app.include_router(events_router)
    router_app.include_router(paths_router)
    router_app.include_router(conversion_router)
    router_app.include_router(pivot_router)
    router_app.include_router(sessions_router)
    router_app.include_router(connections_router)
    return router_app


def main():
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
