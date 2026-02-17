"""Conversion API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.services import transpile_sql, get_analytics_db

router = APIRouter(prefix="/api", tags=["conversion"])


@router.get("/conversion")
def get_conversion(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db=Depends(get_analytics_db),
) -> dict:
    """
    Calculate conversion rate for Home -> Purchase funnel.
    Returns total unique users, converted users, and conversion rate percentage.
    """
    date_filter = ""
    params = []

    if start_date:
        date_filter += " AND timestamp >= ?"
        params.append(f"{start_date} 00:00:00")

    if end_date:
        date_filter += " AND timestamp <= ?"
        params.append(f"{end_date} 23:59:59")

    query = transpile_sql(f"""
        WITH home_users AS (
            SELECT DISTINCT user_id
            FROM events
            WHERE event_name = 'Home'{date_filter}
        ),
        converted_users AS (
            SELECT DISTINCT h.user_id
            FROM home_users h
            WHERE EXISTS (
                SELECT 1 FROM events e
                WHERE e.user_id = h.user_id
                AND e.event_name = 'Purchase'
                AND e.timestamp > (
                    SELECT MIN(e2.timestamp)
                    FROM events e2
                    WHERE e2.user_id = h.user_id
                    AND e2.event_name = 'Home'
                    AND e2.timestamp IS NOT NULL
                )
            )
        )
        SELECT 
            (SELECT COUNT(*) FROM home_users) as total_users,
            (SELECT COUNT(*) FROM converted_users) as converted_users
    """)

    result = db.execute(query, params)

    total_users = result[0][0]
    converted_users = result[0][1]
    conversion_rate = (converted_users / total_users * 100) if total_users > 0 else 0

    return {
        "data": [
            {
                "total_users": total_users,
                "converted_users": converted_users,
                "conversion_rate_percent": round(conversion_rate, 2),
            }
        ]
    }
