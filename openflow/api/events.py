"""Events API endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.core import verify_api_key
from openflow.db import get_db, Database
from openflow.services import transpile_sql

router = APIRouter(prefix="/api", tags=["events"])


@router.get("/events")
def get_events(
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """Get distinct event names for filtering."""
    result = db.execute("SELECT DISTINCT event_name FROM events ORDER BY event_name")
    return {"events": [row[0] for row in result]}


@router.get("/raw/events")
def get_raw_events(
    limit: int = Query(100, description="Number of rows to return", ge=1, le=1000),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    event_name: Optional[str] = Query(None, description="Filter by event name"),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """Get raw events data with optional filtering."""
    where_clause = ""
    params = []
    if event_name:
        where_clause = "WHERE event_name = ?"
        params.append(event_name)

    # Get total count
    count_query = transpile_sql(f"SELECT COUNT(*) FROM events {where_clause}")
    total = db.execute(count_query, params)[0][0]

    # Get data
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
