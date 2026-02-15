"""Retention API endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.core import verify_api_key
from openflow.db import get_db, Database
from openflow.services import transpile_sql

router = APIRouter(prefix="/api", tags=["retention"])


@router.get("/retention")
def get_retention(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """
    Calculate N-Day Retention Cohorts.
    Users who did 'Sign Up' -> Returned to do Any Event on Day 1, Day 7, etc.
    """
    # Build WHERE clauses
    signup_where = "WHERE event_name = 'Sign Up'"
    activity_where = ""
    signup_params = []
    activity_params = []

    if start_date:
        signup_where += " AND timestamp >= ?"
        activity_where = "WHERE timestamp >= ?"
        signup_params.append(f"{start_date} 00:00:00")
        activity_params.append(f"{start_date} 00:00:00")

    if end_date:
        signup_where += " AND timestamp <= ?"
        if activity_where:
            activity_where += " AND timestamp <= ?"
        else:
            activity_where = "WHERE timestamp <= ?"
        signup_params.append(f"{end_date} 23:59:59")
        activity_params.append(f"{end_date} 23:59:59")

    # Combine params: signups first, then activity
    params = signup_params + activity_params

    query = transpile_sql(f"""
        WITH signups AS (
            -- First Sign Up event per user defines their cohort
            SELECT 
                user_id,
                MIN(DATE_TRUNC('day', timestamp)) as cohort_date
            FROM events
            {signup_where}
            GROUP BY user_id
        ),
        user_activity AS (
            -- All user activity dates
            SELECT DISTINCT
                user_id,
                DATE_TRUNC('day', timestamp) as activity_date
            FROM events
            {activity_where}
        ),
        cohort_activity AS (
            -- Join signups with their subsequent activity
            SELECT 
                s.user_id,
                s.cohort_date,
                a.activity_date,
                DATE_DIFF('day', s.cohort_date, a.activity_date) as days_since_signup
            FROM signups s
            LEFT JOIN user_activity a ON s.user_id = a.user_id
            WHERE a.activity_date >= s.cohort_date
        ),
        cohort_sizes AS (
            -- Size of each cohort
            SELECT 
                cohort_date,
                COUNT(DISTINCT user_id) as cohort_size
            FROM signups
            GROUP BY cohort_date
        ),
        retention_counts AS (
            -- Count returning users for each day offset
            SELECT 
                cohort_date,
                days_since_signup,
                COUNT(DISTINCT user_id) as returning_users
            FROM cohort_activity
            GROUP BY cohort_date, days_since_signup
        )
        SELECT 
            c.cohort_date,
            c.cohort_size,
            COALESCE(
                MAX(CASE WHEN r.days_since_signup = 0 THEN r.returning_users END), 
                c.cohort_size
            ) as day_0,
            COALESCE(
                MAX(CASE WHEN r.days_since_signup = 1 THEN r.returning_users END), 
                0
            ) as day_1,
            COALESCE(
                MAX(CASE WHEN r.days_since_signup = 7 THEN r.returning_users END), 
                0
            ) as day_7,
            COALESCE(
                MAX(CASE WHEN r.days_since_signup = 14 THEN r.returning_users END), 
                0
            ) as day_14,
            COALESCE(
                MAX(CASE WHEN r.days_since_signup = 30 THEN r.returning_users END), 
                0
            ) as day_30
        FROM cohort_sizes c
        LEFT JOIN retention_counts r ON c.cohort_date = r.cohort_date
        GROUP BY c.cohort_date, c.cohort_size
        ORDER BY c.cohort_date DESC
        LIMIT 10
    """)

    result = db.execute(query, params)

    return {
        "data": [
            {
                "cohort_date": row[0].isoformat()
                if isinstance(row[0], datetime)
                else str(row[0]),
                "cohort_size": row[1],
                "day_0_percent": round((row[2] / row[1]) * 100, 1) if row[1] > 0 else 0,
                "day_1_percent": round((row[3] / row[1]) * 100, 1) if row[1] > 0 else 0,
                "day_7_percent": round((row[4] / row[1]) * 100, 1) if row[1] > 0 else 0,
                "day_14_percent": round((row[5] / row[1]) * 100, 1)
                if row[1] > 0
                else 0,
                "day_30_percent": round((row[6] / row[1]) * 100, 1)
                if row[1] > 0
                else 0,
            }
            for row in result
        ]
    }
