"""API package for OpenFlow Analytics."""

from .events import router as events_router
from .trend import router as trend_router
from .retention import router as retention_router
from .sessions import router as sessions_router
from .paths import router as paths_router
from .conversion import router as conversion_router

__all__ = [
    "events_router",
    "trend_router",
    "retention_router",
    "sessions_router",
    "paths_router",
    "conversion_router",
]
