"""Sessions API endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.services import transpile_sql, get_analytics_db

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/raw/sessions")
def get_raw_sessions(
    limit: int = Query(100, description="Number of rows to return", ge=1, le=1000),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    db=Depends(get_analytics_db),
) -> dict:
    """Get derived session data."""
    # Get total count
    total = db.execute("SELECT COUNT(*) FROM derived_sessions")[0][0]

    # Get data
    query = transpile_sql("""
        SELECT 
            session_id,
            user_id,
            start_time,
            duration_sec,
            event_count
        FROM derived_sessions
        ORDER BY start_time DESC
        LIMIT ? OFFSET ?
    """)
    result = db.execute(query, [limit, offset])

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "session_id": row[0],
                "user_id": row[1],
                "start_time": row[2].isoformat()
                if isinstance(row[2], datetime)
                else str(row[2]),
                "duration_sec": row[3],
                "event_count": row[4],
            }
            for row in result
        ],
    }


@router.get("/sessions/summary")
def get_sessions_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db=Depends(get_analytics_db),
) -> dict:
    """
    Get summary statistics for sessions.
    Returns average session duration, total sessions, and average events per session.
    """
    where_clauses = []
    params = []

    if start_date:
        where_clauses.append("start_time >= ?")
        params.append(f"{start_date} 00:00:00")

    if end_date:
        where_clauses.append("start_time <= ?")
        params.append(f"{end_date} 23:59:59")

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    query = transpile_sql(f"""
        SELECT 
            AVG(duration_sec) as avg_duration_sec,
            COUNT(*) as total_sessions,
            AVG(event_count) as avg_events_per_session
        FROM derived_sessions
        {where_clause}
    """)

    result = db.execute(query, params)

    return {
        "data": [
            {
                "avg_duration_sec": round(result[0][0], 2) if result[0][0] else 0,
                "total_sessions": result[0][1],
                "avg_events_per_session": round(result[0][2], 2) if result[0][2] else 0,
            }
        ]
    }
