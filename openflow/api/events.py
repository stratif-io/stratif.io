"""Events API endpoints."""

import json
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, Query
from structlog.stdlib import BoundLogger

from openflow.services import get_analytics_db
from openflow.services.connection_executor import AnalyticsDatabase

log: BoundLogger = structlog.get_logger(__name__)


router = APIRouter(prefix="/api", tags=["events"])


@router.get("/events")
def get_events(
    db=Depends(get_analytics_db),
) -> dict:
    """Get distinct event names for filtering."""
    result = db.execute("SELECT DISTINCT event_name FROM events ORDER BY event_name")
    return {"events": [row[0] for row in result]}


@router.get("/events/top")
def get_top_events(
    limit: int = Query(5, description="Number of top events to return", ge=1, le=20),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
    db=Depends(get_analytics_db),
) -> dict:
    """Get top events by occurrence count within date range."""
    where_clauses = []
    params = []
    if start_date:
        where_clauses.append("timestamp >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        where_clauses.append("timestamp <= ?")
        params.append(f"{end_date} 23:59:59")

    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        where_clauses.extend(filter_clauses)
        params.extend(filter_params)

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    params.append(limit)

    result = db.execute(
        f"""
        SELECT event_name, COUNT(*) AS count
        FROM events
        {where_clause}
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT ?
        """,
        params,
    )
    return {"data": [{"name": row[0], "count": row[1]} for row in result]}


@router.get("/raw/events")
def get_raw_events(
    limit: int = Query(100, description="Number of rows to return", ge=1, le=1000),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    event_name: str | None = Query(None, description="Filter by event name"),
    user_id: str | None = Query(None, description="Filter by user ID"),
    sort_order: str = Query(
        "desc", description="Sort order for timestamp: asc or desc"
    ),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
    db: AnalyticsDatabase = Depends(get_analytics_db),
) -> dict:
    """Get raw events data with optional filtering."""
    where_clauses = []
    params = []
    if event_name:
        where_clauses.append("event_name = ?")
        params.append(event_name)
    if user_id:
        where_clauses.append("user_id = ?")
        params.append(user_id)
    if start_date:
        where_clauses.append("timestamp >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        where_clauses.append("timestamp <= ?")
        params.append(f"{end_date} 23:59:59")

    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        log.debug(filter_clauses)
        where_clauses.extend(filter_clauses)
        params.extend(filter_params)

    where_clause = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    order_dir = "ASC" if sort_order.lower() == "asc" else "DESC"

    total = db.execute(f"SELECT COUNT(*) FROM events {where_clause}", params)[0][0]

    result = db.execute(
        f"""
        SELECT user_id, event_name, timestamp, properties
        FROM events
        {where_clause}
        ORDER BY timestamp {order_dir}
        LIMIT ? OFFSET ?
        """,
        params + [limit, offset],
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "user_id": row[0],
                "event_name": row[1],
                "timestamp": row[2].isoformat()
                if isinstance(row[2], datetime)
                else str(row[2]),
                "properties": json.loads(row[3])
                if isinstance(row[3], str)
                else (row[3] or {}),
            }
            for row in result
        ],
    }


@router.get("/users/{user_id}/events")
def get_user_events(
    user_id: str,
    limit: int = Query(300, description="Max events to return", ge=1, le=1000),
    db=Depends(get_analytics_db),
) -> dict:
    """Get all events for a specific user, sorted chronologically (ASC)."""
    result = db.execute(
        """
        SELECT user_id, event_name, timestamp, properties
        FROM events
        WHERE user_id = ?
        ORDER BY timestamp ASC
        LIMIT ?
        """,
        [user_id, limit],
    )
    return {
        "user_id": user_id,
        "data": [
            {
                "user_id": row[0],
                "event_name": row[1],
                "timestamp": row[2].isoformat()
                if isinstance(row[2], datetime)
                else str(row[2]),
                "properties": json.loads(row[3])
                if isinstance(row[3], str)
                else (row[3] or {}),
            }
            for row in result
        ],
    }
