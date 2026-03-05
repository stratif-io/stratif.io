"""Events API endpoints."""

import json
from datetime import datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query
from structlog.stdlib import BoundLogger

from openflow.services import get_analytics_db
from openflow.services.connection_executor import AnalyticsDatabase
from openflow.services.validators import parse_date

log: BoundLogger = structlog.get_logger(__name__)


router = APIRouter(prefix="/api", tags=["events"])


@router.get("/events")
def get_events(
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    if db:
        """Get distinct event names for filtering."""
        result = db.execute(
            "SELECT DISTINCT event_name FROM events ORDER BY event_name"
        )
        return {"events": [row[0] for row in result]}
    else:
        raise ValueError("db cannot be None")


@router.get("/events/top")
def get_top_events(
    limit: int = Query(5, description="Number of top events to return", ge=1, le=20),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    """Get top events by occurrence count within date range."""
    if db:
        start_date = parse_date(start_date)
        end_date = parse_date(end_date)
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
    else:
        raise ValueError("db cannot be None")


@router.get("/raw/events")
def get_raw_events(
    limit: int = Query(100, description="Number of rows to return", ge=1, le=1000),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    event_name: str | None = Query(None, description="Filter by event name"),
    user_id: str | None = Query(None, description="Filter by user ID"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    sort_field: str = Query(
        "timestamp", description="Field to sort by: timestamp, user_id, or event_name"
    ),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    """Get raw events data with optional filtering."""
    if db:
        start_date = parse_date(start_date)
        end_date = parse_date(end_date)
        where_clauses = []
        params = []
        if event_name:
            event_names = [v for v in event_name.split("|") if v]
            if len(event_names) > 1:
                placeholders = ", ".join("?" * len(event_names))
                where_clauses.append(f"event_name IN ({placeholders})")
                params.extend(event_names)
            else:
                where_clauses.append("event_name = ?")
                params.append(event_name)
        if user_id:
            user_ids = [v for v in user_id.split("|") if v]
            if len(user_ids) > 1:
                placeholders = ", ".join("?" * len(user_ids))
                where_clauses.append(f"user_id IN ({placeholders})")
                params.extend(user_ids)
            else:
                where_clauses.append("user_id LIKE ?")
                params.append(f"%{user_id}%")
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

        where_clause = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        order_dir = "ASC" if sort_order.lower() == "asc" else "DESC"
        allowed_sort_fields = {"timestamp", "user_id", "event_name"}
        order_field = sort_field if sort_field in allowed_sort_fields else "timestamp"

        total = db.execute(f"SELECT COUNT(*) FROM events {where_clause}", params)[0][0]

        props_col = (
            "properties" if db.has_column("properties") else "NULL AS properties"
        )
        result = db.execute(
            f"""
            SELECT user_id, event_name, timestamp, {props_col}
            FROM events
            {where_clause}
            ORDER BY {order_field} {order_dir}
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
    else:
        raise ValueError("db cannot be None")


@router.get("/users/{user_id}/events")
def get_user_events(
    user_id: str,
    limit: int = Query(300, description="Max events to return", ge=1, le=1000),
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    """Get all events for a specific user, sorted chronologically (ASC)."""
    if db:
        props_col = (
            "properties" if db.has_column("properties") else "NULL AS properties"
        )
        result = db.execute(
            f"""
            SELECT user_id, event_name, timestamp, {props_col}
            FROM events
            WHERE user_id = ?
            ORDER BY timestamp DESC
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
    else:
        raise ValueError("db cannot be None")
