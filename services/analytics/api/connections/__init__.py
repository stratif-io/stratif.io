"""Connections API — manage database connections and their schema/filter configs."""

from fastapi import APIRouter

from .browse import router as _browse_router
from .crud import router as _crud_router

# Re-export models so SaaS can import from services.analytics.api.connections
from .models import (
    ConnectionCreate,
    ConnectionResponse,
    ConnectionUpdate,
    CustomProperty,
    FilterConfigBody,
    FilterConfigResponse,
    FilterField,
    SchemaConfigBody,
    SchemaConfigResponse,
)

# Also re-export detect_schema for SaaS to call directly
from .schema_detect import detect_schema
from .schema_detect import router as _detect_router

# Single assembled router — same interface as before
connections_router = APIRouter(prefix="/api/connections", tags=["connections"])
# Alias so `from services.analytics.api.connections import router` continues to work
router = connections_router
connections_router.include_router(_crud_router)
connections_router.include_router(_detect_router)
connections_router.include_router(_browse_router)

__all__ = [
    "connections_router",
    "detect_schema",
    "ConnectionCreate",
    "ConnectionResponse",
    "ConnectionUpdate",
    "CustomProperty",
    "FilterConfigBody",
    "FilterConfigResponse",
    "FilterField",
    "SchemaConfigBody",
    "SchemaConfigResponse",
]
