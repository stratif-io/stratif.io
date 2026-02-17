"""Events API endpoints."""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.services import transpile_sql, get_analytics_db

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
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    filters: Optional[str] = Query(None, description='JSON dict of active dimension filters'),
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

    query = transpile_sql(f"""
        SELECT
            event_name,
            COUNT(*) as count
        FROM events
        {where_clause}
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT ?
    """)
    params.append(limit)

    result = db.execute(query, params)
    return {"data": [{"name": row[0], "count": row[1]} for row in result]}


@router.get("/raw/events")
def get_raw_events(
    limit: int = Query(100, description="Number of rows to return", ge=1, le=1000),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    event_name: Optional[str] = Query(None, description="Filter by event name"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    filters: Optional[str] = Query(None, description='JSON dict of active dimension filters'),
    db=Depends(get_analytics_db),
) -> dict:
    """Get raw events data with optional filtering."""
    where_clauses = []
    params = []
    if event_name:
        where_clauses.append("event_name = ?")
        params.append(event_name)
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

    count_query = transpile_sql(f"SELECT COUNT(*) FROM events {where_clause}")
    total = db.execute(count_query, params)[0][0]

    query = transpile_sql(f"""
        SELECT
            user_id,
            event_name,
            timestamp,
            properties
        FROM events
        {where_clause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    """)
    params.extend([limit, offset])

    result = db.execute(query, params)

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
                "properties": row[3],
            }
            for row in result
        ],
    }
