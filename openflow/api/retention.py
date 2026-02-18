"""Retention API endpoints."""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from openflow.services import get_analytics_db
from openflow.services.sql_builder import date_trunc, date_diff_days

router = APIRouter(prefix="/api", tags=["retention"])


@router.get("/retention")
def get_retention(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    filters: Optional[str] = Query(None, description='JSON dict of active dimension filters'),
    db=Depends(get_analytics_db),
) -> dict:
    """Calculate N-Day Retention Cohorts.

    Users who performed 'Sign Up' → returned to do any event on Day 1, Day 7, etc.
    """
    dialect = db.get_dialect()
    day_col = date_trunc("day", "timestamp", dialect)
    days_diff = date_diff_days("s.cohort_date", "a.activity_date", dialect)

    signup_where = "WHERE event_name = 'Sign Up'"
    activity_where = ""
    signup_params: list = []
    activity_params: list = []

    if start_date:
        signup_where += " AND timestamp >= ?"
        activity_where = "WHERE timestamp >= ?"
        signup_params.append(f"{start_date} 00:00:00")
        activity_params.append(f"{start_date} 00:00:00")

    if end_date:
        signup_where += " AND timestamp <= ?"
        activity_where += (" AND " if activity_where else "WHERE ") + "timestamp <= ?"
        signup_params.append(f"{end_date} 23:59:59")
        activity_params.append(f"{end_date} 23:59:59")

    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        for clause in filter_clauses:
            signup_where += f" AND {clause}"
        signup_params.extend(filter_params)

    params = signup_params + activity_params

    query = f"""
        WITH signups AS (
            SELECT
                user_id,
                MIN({day_col}) AS cohort_date
            FROM events
            {signup_where}
            GROUP BY user_id
        ),
        user_activity AS (
            SELECT DISTINCT
                user_id,
                {day_col} AS activity_date
            FROM events
            {activity_where}
        ),
        cohort_activity AS (
            SELECT
                s.user_id,
                s.cohort_date,
                a.activity_date,
                {days_diff} AS days_since_signup
            FROM signups s
            LEFT JOIN user_activity a ON s.user_id = a.user_id
            WHERE a.activity_date >= s.cohort_date
        ),
        cohort_sizes AS (
            SELECT
                cohort_date,
                COUNT(DISTINCT user_id) AS cohort_size
            FROM signups
            GROUP BY cohort_date
        ),
        retention_counts AS (
            SELECT
                cohort_date,
                days_since_signup,
                COUNT(DISTINCT user_id) AS returning_users
            FROM cohort_activity
            GROUP BY cohort_date, days_since_signup
        )
        SELECT
            c.cohort_date,
            c.cohort_size,
            COALESCE(MAX(CASE WHEN r.days_since_signup = 0  THEN r.returning_users END), c.cohort_size) AS day_0,
            COALESCE(MAX(CASE WHEN r.days_since_signup = 1  THEN r.returning_users END), 0) AS day_1,
            COALESCE(MAX(CASE WHEN r.days_since_signup = 7  THEN r.returning_users END), 0) AS day_7,
            COALESCE(MAX(CASE WHEN r.days_since_signup = 14 THEN r.returning_users END), 0) AS day_14,
            COALESCE(MAX(CASE WHEN r.days_since_signup = 30 THEN r.returning_users END), 0) AS day_30
        FROM cohort_sizes c
        LEFT JOIN retention_counts r ON c.cohort_date = r.cohort_date
        GROUP BY c.cohort_date, c.cohort_size
        ORDER BY c.cohort_date DESC
        LIMIT 10
    """

    result = db.execute(query, params)

    return {
        "data": [
            {
                "cohort_date": row[0].isoformat() if isinstance(row[0], datetime) else str(row[0]),
                "cohort_size": row[1],
                "day_0_percent":  round((row[2] / row[1]) * 100, 1) if row[1] > 0 else 0,
                "day_1_percent":  round((row[3] / row[1]) * 100, 1) if row[1] > 0 else 0,
                "day_7_percent":  round((row[4] / row[1]) * 100, 1) if row[1] > 0 else 0,
                "day_14_percent": round((row[5] / row[1]) * 100, 1) if row[1] > 0 else 0,
                "day_30_percent": round((row[6] / row[1]) * 100, 1) if row[1] > 0 else 0,
            }
            for row in result
        ]
    }
