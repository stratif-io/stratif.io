# backend/main.py
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.core.logging import setup_logging
from backend.db import init_db
from backend.api import (
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level, settings.log_format)
    await init_db()
    yield


app = FastAPI(
    title="OpenFlow Analytics",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

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
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# SPA fallback (production)
dist_path = Path(__file__).parent.parent / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(dist_path / "index.html")


def main():
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
