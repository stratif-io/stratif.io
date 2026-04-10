# backend/main.py
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from scalar_fastapi import get_scalar_api_reference
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.middleware import AccessLogMiddleware, RequestIdMiddleware
from backend.core.rate_limit import limiter

log = structlog.get_logger(__name__)


class APITrailingSlashMiddleware(BaseHTTPMiddleware):
    """Rewrite the specific API collection paths that are registered with a trailing slash."""

    _TRAILING_SLASH_PATHS = {"/api/connections"}

    async def dispatch(self, request: Request, call_next):
        if request.scope["path"] in self._TRAILING_SLASH_PATHS:
            request.scope["path"] += "/"
        return await call_next(request)


from backend.api import (  # noqa: E402
    connections_router,
    conversion_router,
    events_router,
    mission_control_router,
    paths_router,
    people_router,
    pivot_router,
    query_studio_router,
    retention_router,
    sessions_router,
)
from backend.config import settings  # noqa: E402
from backend.core.logging import setup_logging  # noqa: E402
from backend.product_db import close_product_db, init_product_db  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level, settings.log_format)
    await init_product_db()
    try:
        yield
    finally:
        await close_product_db()


app = FastAPI(
    title="stratif.io Analytics",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json",  # always available — OSS product, spec is public
    lifespan=lifespan,
)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.error(
        "unhandled_exception",
        path=request.url.path,
        error=str(exc),
        traceback=traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal server error"},
    )


app.add_middleware(AccessLogMiddleware)  # type: ignore[arg-type]  # outermost — logs all responses including 429s
app.add_middleware(SlowAPIMiddleware)  # type: ignore[arg-type]
app.add_middleware(APITrailingSlashMiddleware)  # type: ignore[arg-type]
app.add_middleware(RequestIdMiddleware)  # type: ignore[arg-type]
app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(retention_router)
app.include_router(events_router)
app.include_router(paths_router)
app.include_router(conversion_router)
app.include_router(pivot_router)
app.include_router(sessions_router)
app.include_router(connections_router)
app.include_router(mission_control_router)
app.include_router(query_studio_router)
app.include_router(people_router)


@app.get("/api/reference", include_in_schema=False)
async def scalar_html():
    return get_scalar_api_reference(
        openapi_url="/openapi.json",
        title="stratif.io API Reference",
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# SPA fallback (production) — /docs/* is handled upstream by Caddy
dist_path = Path(__file__).parent.parent / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")

    @app.get("/")
    async def root_redirect():
        return RedirectResponse(
            url="/dashboard",
            status_code=302,
            headers={"Cache-Control": "no-cache, must-revalidate"},
        )

    @app.get("/{filename}.svg")
    async def serve_svg(filename: str):
        svg_path = dist_path / f"{filename}.svg"
        if not svg_path.exists():
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(svg_path, media_type="image/svg+xml")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(
            dist_path / "index.html",
            headers={"Cache-Control": "no-cache, must-revalidate"},
        )


def main():
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
