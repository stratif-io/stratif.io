"""FastAPI dependency for the analytics database."""
from backend.backends._utils import _to_named_params
from backend.services.analytics_db import (  # noqa: F401
    AnalyticsDatabase,
    open_analytics_db,
)
from fastapi import HTTPException, Query


async def get_analytics_db(
    connection_id: str | None = Query(None, description="Active connection ID"),
):
    """FastAPI dependency: yields the analytics DB for the active connection."""
    from backend.product_db import SQLiteProductDB
    from backend.config import settings
    resolved_id = connection_id
    if not resolved_id:
        product_db = SQLiteProductDB(settings.product_db_path)
        row = product_db.fetchone("SELECT id FROM connections ORDER BY created_at ASC LIMIT 1")
        if row:
            resolved_id = row["id"]
    if not resolved_id:
        raise HTTPException(status_code=503, detail="No analytics connection configured.")
    db = open_analytics_db(resolved_id)
    try:
        yield db
    finally:
        db.close()
