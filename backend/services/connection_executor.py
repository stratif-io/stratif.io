"""FastAPI dependency for the analytics database."""
from typing import Annotated

from fastapi import Depends, HTTPException, Query

from backend.backends._utils import _to_named_params  # noqa: F401 (re-exported for callers)
from backend.backends.deps import BackendRegistryDep
from backend.product_db import ProductDBDep
from backend.services.analytics_db import AnalyticsDatabase, open_analytics_db


async def get_analytics_db(
    product_db: ProductDBDep,
    registry: BackendRegistryDep,
    connection_id: str | None = Query(None, description="Active connection ID"),
):
    """FastAPI dependency: yields the analytics DB for the active connection."""
    resolved_id = connection_id
    if not resolved_id:
        row = product_db.fetchone("SELECT id FROM connections ORDER BY created_at ASC LIMIT 1")
        if row:
            resolved_id = row["id"]
    if not resolved_id:
        raise HTTPException(status_code=503, detail="No analytics connection configured.")
    db = open_analytics_db(resolved_id, product_db, registry)
    try:
        yield db
    finally:
        db.close()
