"""People API — user list endpoint."""

from datetime import datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query
from structlog.stdlib import BoundLogger

from backend.core.auth import get_current_user
from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.validators import interpolate_sql, parse_date, to_sql_datetime

log: BoundLogger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api", tags=["people"], dependencies=[Depends(get_current_user)])


@router.get("/users")
def list_users(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    """List users with event count and first/last seen, filtered by date range."""
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    where_clauses = []
    params = []
    if start_date:
        where_clauses.append("timestamp >= ?")
        params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        where_clauses.append("timestamp <= ?")
        params.append(to_sql_datetime(end_date, "23:59:59"))

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    query = f"""
        SELECT
            user_id,
            COUNT(*) AS event_count,
            MIN(timestamp) AS first_seen,
            MAX(timestamp) AS last_seen
        FROM events
        {where_clause}
        GROUP BY user_id
        ORDER BY last_seen DESC
        LIMIT ? OFFSET ?
    """

    def _fmt(val: object) -> str:
        if isinstance(val, datetime):
            return val.isoformat()
        return str(val)

    result = db.execute(query, params + [limit, offset])
    return {
        "sql": interpolate_sql(query, params + [limit, offset]),
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "user_id": row[0],
                "event_count": row[1],
                "first_seen": _fmt(row[2]),
                "last_seen": _fmt(row[3]),
            }
            for row in result
        ],
    }
