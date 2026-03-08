"""Conversion API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from openflow.services import get_analytics_db
from openflow.services.connection_executor import AnalyticsDatabase
from openflow.services.validators import parse_date

router = APIRouter(prefix="/api", tags=["conversion"])


@router.get("/conversion")
def get_conversion(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    entry_event: str = Query("Home", description="Entry event name"),
    goal_event: str = Query("Purchase", description="Goal/conversion event name"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
) -> dict:
    """Calculate conversion rate from entry_event to goal_event.

    Returns total unique users, converted users, and conversion rate percentage.
    Uses standard ANSI SQL (EXISTS, correlated subqueries) compatible with
    DuckDB, SQLite, PostgreSQL, MySQL, and most other engines.
    """
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    date_clauses: list[str] = []
    date_params: list = []

    if start_date:
        date_clauses.append("timestamp >= ?")
        date_params.append(f"{start_date} 00:00:00")
    if end_date:
        date_clauses.append("timestamp <= ?")
        date_params.append(f"{end_date} 23:59:59")

    date_filter = (" AND " + " AND ".join(date_clauses)) if date_clauses else ""

    # The query has three parameterised event_name bindings (entry, goal, entry)
    # each followed by the same date filter params.
    all_params = (
        [entry_event]
        + date_params
        + [goal_event]
        + date_params
        + [entry_event]
        + date_params
    )

    query = f"""
        WITH entry_users AS (
            SELECT DISTINCT user_id
            FROM events
            WHERE event_name = ?{date_filter}
        ),
        converted_users AS (
            SELECT DISTINCT h.user_id
            FROM entry_users h
            WHERE EXISTS (
                SELECT 1 FROM events e
                WHERE e.user_id = h.user_id
                AND e.event_name = ?{date_filter}
                AND e.timestamp > (
                    SELECT MIN(e2.timestamp)
                    FROM events e2
                    WHERE e2.user_id = h.user_id
                        AND e2.event_name = ?{date_filter}
                        AND e2.timestamp IS NOT NULL
                )
            )
        )
        SELECT
            (SELECT COUNT(*) FROM entry_users)     AS total_users,
            (SELECT COUNT(*) FROM converted_users) AS converted_users
    """

    result = db.execute(query, all_params)
    total_users = result[0][0]
    converted_users = result[0][1]
    conversion_rate = (converted_users / total_users * 100) if total_users > 0 else 0

    return {
        "entry_event": entry_event,
        "goal_event": goal_event,
        "data": [
            {
                "total_users": total_users,
                "converted_users": converted_users,
                "conversion_rate_percent": round(conversion_rate, 2),
            }
        ],
    }
