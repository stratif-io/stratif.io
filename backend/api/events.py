"""Events API endpoints."""

import json
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


router = APIRouter(
    prefix="/api", tags=["events"], dependencies=[Depends(get_current_user)]
)


@router.get("/events")
def get_events(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
) -> dict:
    """Get distinct event names for filtering."""
    query = "SELECT DISTINCT event_name FROM events ORDER BY event_name"
    result = db.execute(query)
    return {"sql": query.strip(), "events": [row[0] for row in result]}


@router.get("/events/top")
def get_top_events(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    limit: int = Query(5, description="Number of top events to return", ge=1, le=20),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
) -> dict:
    """Get top events by occurrence count within date range."""
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

    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        where_clauses.extend(filter_clauses)
        params.extend(filter_params)

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    params.append(limit)

    query = f"""
        SELECT event_name, COUNT(*) AS count
        FROM events
        {where_clause}
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT ?
        """
    result = db.execute(query, params)
    return {
        "sql": interpolate_sql(query, params),
        "data": [{"name": row[0], "count": row[1]} for row in result],
    }


@router.get("/raw/events")
def get_raw_events(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
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
) -> dict:
    """Get raw events data with optional filtering."""
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
        params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        where_clauses.append("timestamp <= ?")
        params.append(to_sql_datetime(end_date, "23:59:59"))

    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        where_clauses.extend(filter_clauses)
        params.extend(filter_params)

    where_clause = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    order_dir = "ASC" if sort_order.lower() == "asc" else "DESC"
    allowed_sort_fields = {"timestamp", "user_id", "event_name"}
    order_field = sort_field if sort_field in allowed_sort_fields else "timestamp"

    count_query = f"SELECT COUNT(*) FROM events {where_clause}"
    total = db.execute(count_query, params)[0][0]

    props_col = "properties" if db.has_column("properties") else "NULL"
    custom_exprs = db.get_custom_prop_exprs()
    # Exclude custom exprs that duplicate the props_col to avoid double-selecting
    # the same column (which causes Row namedtuple issues in some backends).
    filtered_exprs = (
        {k: v for k, v in custom_exprs.items() if k != "properties"}
        if props_col == "properties"
        else custom_exprs
    )
    # Also select filter field expressions for direct columns not already covered
    # by custom_prop_exprs (e.g. a `country` column that is a filter field but not
    # a custom property will otherwise be missing from event.properties).
    filter_exprs = db.get_filter_exprs()
    ff_extra = {
        k: v
        for k, v in filter_exprs.items()
        if k not in filtered_exprs and k not in ("properties", props_col)
    }
    all_extra = {**filtered_exprs, **ff_extra}
    custom_names = list(all_extra.keys())
    extra_cols = (", " + ", ".join(all_extra.values())) if all_extra else ""
    data_query = f"""
        SELECT user_id, event_name, timestamp, {props_col}{extra_cols}
        FROM events
        {where_clause}
        ORDER BY {order_field} {order_dir}
        LIMIT ? OFFSET ?
        """
    result = db.execute(data_query, params + [limit, offset])

    def _build_props(row: tuple) -> dict:
        base = json.loads(row[3]) if isinstance(row[3], str) else (row[3] or {})
        if not isinstance(base, dict):
            base = {}
        for i, name in enumerate(custom_names):
            val = row[4 + i]
            if val is not None:
                base[name] = val
        return base

    return {
        "sql": [
            interpolate_sql(count_query, params),
            interpolate_sql(data_query, params + [limit, offset]),
        ],
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
                "properties": _build_props(row),
            }
            for row in result
        ],
    }


@router.get("/users/{user_id}/events")
def get_user_events(
    user_id: str,
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    limit: int = Query(100, description="Max events to return", ge=1, le=500),
    offset: int = Query(0, description="Offset for pagination", ge=0),
) -> dict:
    """Get all events for a specific user, sorted chronologically (ASC)."""
    props_col = "properties" if db.has_column("properties") else "NULL"
    custom_exprs = db.get_custom_prop_exprs()
    filtered_exprs = (
        {k: v for k, v in custom_exprs.items() if k != "properties"}
        if props_col == "properties"
        else custom_exprs
    )
    filter_exprs = db.get_filter_exprs()
    ff_extra = {
        k: v
        for k, v in filter_exprs.items()
        if k not in filtered_exprs and k not in ("properties", props_col)
    }
    all_extra = {**filtered_exprs, **ff_extra}
    custom_names = list(all_extra.keys())
    extra_cols = (", " + ", ".join(all_extra.values())) if all_extra else ""
    user_events_query = f"""
        SELECT user_id, event_name, timestamp, {props_col}{extra_cols}
        FROM events
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
        """
    result = db.execute(user_events_query, [user_id, limit, offset])

    def _build_props(row: tuple) -> dict:
        base = json.loads(row[3]) if isinstance(row[3], str) else (row[3] or {})
        if not isinstance(base, dict):
            base = {}
        for i, name in enumerate(custom_names):
            val = row[4 + i]
            if val is not None:
                base[name] = val
        return base

    return {
        "sql": interpolate_sql(user_events_query, [user_id, limit, offset]),
        "user_id": user_id,
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "user_id": row[0],
                "event_name": row[1],
                "timestamp": row[2].isoformat()
                if isinstance(row[2], datetime)
                else str(row[2]),
                "properties": _build_props(row),
            }
            for row in result
        ],
    }
