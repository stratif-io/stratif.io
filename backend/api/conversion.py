"""Conversion API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.core.auth import get_current_user
from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.validators import parse_date, to_sql_datetime

router = APIRouter(prefix="/api", tags=["conversion"], dependencies=[Depends(get_current_user)])


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
        date_params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        date_clauses.append("timestamp <= ?")
        date_params.append(to_sql_datetime(end_date, "23:59:59"))

    date_filter = (" AND " + " AND ".join(date_clauses)) if date_clauses else ""

    # Two parameterised event_name bindings (entry, goal), each followed by date params.
    # Uses JOIN on a pre-aggregated CTE instead of correlated subqueries for broad
    # dialect compatibility — ClickHouse rejects correlated references to outer columns.
    all_params = (
        [entry_event]
        + date_params
        + [goal_event]
        + date_params
    )

    query = f"""
        WITH entry_times AS (
            SELECT user_id, MIN(timestamp) AS first_entry
            FROM events
            WHERE event_name = ?{date_filter}
            GROUP BY user_id
        ),
        converted_users AS (
            SELECT DISTINCT e.user_id
            FROM events e
            JOIN entry_times et ON e.user_id = et.user_id
            WHERE e.event_name = ?{date_filter}
            AND e.timestamp > et.first_entry
        )
        SELECT
            (SELECT COUNT(*) FROM entry_times)     AS total_users,
            (SELECT COUNT(*) FROM converted_users) AS converted_users
    """

    result = db.execute(query, all_params)
    total_users = result[0][0]
    converted_users = result[0][1]
    conversion_rate = (converted_users / total_users * 100) if total_users > 0 else 0

    return {
        "sql": query.strip(),
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
