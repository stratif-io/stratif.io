"""FastAPI dependency for the analytics database."""

from fastapi import HTTPException, Query
from sqlalchemy import select

from services.analytics.backends._utils import (
    _to_named_params,  # noqa: F401 (re-exported for callers)
)
from services.analytics.backends.deps import BackendRegistryDep
from services.analytics.product_db.deps import DBSession
from services.analytics.product_db.models import Connection
from services.analytics.services.analytics_db import (  # noqa: F401 (AnalyticsDatabase re-exported for callers)
    AnalyticsDatabase,
    open_analytics_db,
)


async def get_analytics_db(
    session: DBSession,
    registry: BackendRegistryDep,
    connection_id: str | None = Query(None, description="Active connection ID"),
):
    """FastAPI dependency: yields the analytics DB for the active connection."""
    resolved_id = connection_id
    if not resolved_id:
        result = await session.execute(
            select(Connection).order_by(Connection.created_at.asc()).limit(1)
        )
        conn = result.scalar_one_or_none()
        if conn:
            resolved_id = conn.id
    if not resolved_id:
        raise HTTPException(
            status_code=503, detail="No analytics connection configured."
        )
    db = await open_analytics_db(resolved_id, session, registry)
    try:
        yield db
    finally:
        db.close()
