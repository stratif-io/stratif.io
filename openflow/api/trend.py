"""Trend API endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.core import verify_api_key
from openflow.db import get_db, Database
from openflow.services import transpile_sql

router = APIRouter(prefix="/api", tags=["trends"])


@router.get("/trend")
def get_trend(
    event_name: Optional[str] = Query(None, description="Filter by event name"),
    granularity: str = Query("day", description="day or week"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """
    Return trend data: Date vs Count and Unique Users.
    """
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

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    date_trunc = (
        "DATE_TRUNC('day', timestamp)"
        if granularity == "day"
        else "DATE_TRUNC('week', timestamp)"
    )

    query = transpile_sql(f"""
        SELECT 
            {date_trunc} as date,
            COUNT(*) as count,
            COUNT(DISTINCT user_id) as unique_users
        FROM events
        {where_clause}
        GROUP BY {date_trunc}
        ORDER BY date
    """)

    result = db.execute(query, params)

    total_unique_query = transpile_sql(f"""
        SELECT COUNT(DISTINCT user_id)
        FROM events
        {where_clause}
    """)
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
