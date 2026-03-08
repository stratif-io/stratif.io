# backend/api/connections.py
from fastapi import APIRouter
from backend.config import settings

router = APIRouter(tags=["connections"])


@router.get("/connection")
async def get_connection():
    """Return the current connection config (read-only, no credentials)."""
    return {
        "db_type": settings.db_type,
        "db_url": settings.db_url,
        "connected": True,
    }
