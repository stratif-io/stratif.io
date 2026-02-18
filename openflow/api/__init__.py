"""API package for OpenFlow Analytics."""

from .auth import router as auth_router
from .events import router as events_router
from .trend import router as trend_router
from .retention import router as retention_router
from .paths import router as paths_router
from .conversion import router as conversion_router
from .pivot import router as pivot_router
from .connections import router as connections_router
from .sessions import router as sessions_router
from .ws import router as ws_router

__all__ = [
    "auth_router",
    "events_router",
    "trend_router",
    "retention_router",
    "paths_router",
    "conversion_router",
    "pivot_router",
    "connections_router",
    "sessions_router",
    "ws_router",
]
