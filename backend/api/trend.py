"""Trend API endpoints."""

import json
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.sql_builder import date_trunc
from backend.services.validators import parse_date

router = APIRouter(prefix="/api", tags=["trends"])


@router.get("/trend")
def get_trend(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    event_name: str | None = Query(None, description="Filter by event name"),
    granularity: str = Query("day", description="day or week"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description='JSON dict of active dimension filters, e.g. {"country":"US"}'
    ),
) -> dict:
    """Return trend data: Date vs Count and Unique Users."""
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    dialect = db.get_dialect()
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

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    unit = granularity if granularity in ("day", "week") else "day"
    date_col = date_trunc(unit, "timestamp", dialect)

    query = f"""
        SELECT
            {date_col} AS date,
            COUNT(*) AS count,
            COUNT(DISTINCT user_id) AS unique_users
        FROM events
        {where_clause}
        GROUP BY {date_col}
        ORDER BY date
    """
    result = db.execute(query, params)

    total_unique_query = f"""
        SELECT COUNT(DISTINCT user_id)
        FROM events
        {where_clause}
    """
    total_unique = db.execute(total_unique_query, params)[0][0]

    return {
        "total_unique_users": total_unique,
        "data": [
            {
                "date": row[0].isoformat()
                if isinstance(row[0], datetime)
                else str(row[0]),
                "count": row[1],
                "unique_users": row[2],
            }
            for row in result
        ],
    }
