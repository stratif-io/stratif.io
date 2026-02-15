"""Paths API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.core import verify_api_key
from openflow.db import get_db, Database
from openflow.services import transpile_sql

router = APIRouter(prefix="/api", tags=["paths"])


@router.get("/paths")
def get_paths(
    target_event: str = Query(..., description="Target event to analyze paths to"),
    device_type: Optional[str] = Query(
        None, description="Filter by device type (Mobile/Desktop)"
    ),
    limit: int = Query(5, description="Number of top paths to return", ge=1, le=20),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """
    Get popular paths leading to a target event.
    Returns the most common 3-event sequences that preceded the target.
    """
    # Build WHERE clause
    where_clauses = ["target_event = ?"]
    params = [target_event]

    if device_type:
        where_clauses.append("device_type = ?")
        params.append(device_type)

    # Date filters
    date_subquery = ""
    date_params = []
    if start_date or end_date:
        date_conditions = []
        if start_date:
            date_conditions.append("timestamp >= ?")
            date_params.append(f"{start_date} 00:00:00")
        if end_date:
            date_conditions.append("timestamp <= ?")
            date_params.append(f"{end_date} 23:59:59")
        date_filter = " AND ".join(date_conditions)
        date_subquery = f"""AND user_id IN (
            SELECT DISTINCT user_id FROM events WHERE {date_filter}
        )"""

    where_clause = " AND ".join(where_clauses) + date_subquery
    params = params + date_params

    query = transpile_sql(f"""
        SELECT 
            COALESCE(step_minus_3, 'Start') as step_3,
            COALESCE(step_minus_2, 'Start') as step_2,
            COALESCE(step_minus_1, 'Start') as step_1,
            target_event,
            device_type,
            COUNT(*) as path_count
        FROM derived_path_analysis
        WHERE {where_clause}
        GROUP BY step_minus_3, step_minus_2, step_minus_1, target_event, device_type
        ORDER BY path_count DESC
        LIMIT ?
    """)
    params.append(str(limit))

    result = db.execute(query, params)

    # Get total count for this target event
    total_query = transpile_sql(f"""
        SELECT COUNT(*) 
        FROM derived_path_analysis 
        WHERE {where_clause}
    """)
    total = db.execute(total_query, params[:-1])[0][0]

    return {
        "target_event": target_event,
        "device_type": device_type,
        "total_occurrences": total,
        "data": [
            {
                "path": f"{row[0]} → {row[1]} → {row[2]} → {row[3]}",
                "step_3": row[0],
                "step_2": row[1],
                "step_1": row[2],
                "target": row[3],
                "device_type": row[4],
                "count": row[5],
                "percentage": round((row[5] / total) * 100, 1) if total > 0 else 0,
            }
            for row in result
        ],
    }
