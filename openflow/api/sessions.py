"""Sessions API endpoints."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from openflow.db.views import session_ctes
from openflow.services import get_analytics_db
from openflow.services.connection_executor import AnalyticsDatabase

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/sessions/summary")
def get_sessions_summary(
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    if db:
        """Return session summary stats for the given date range, respecting dimension filters."""
        event_where: list[str] = []
        params: list = []

        if start_date:
            event_where.append("timestamp >= ?")
            params.append(f"{start_date} 00:00:00")
        if end_date:
            event_where.append("timestamp <= ?")
            params.append(f"{end_date} 23:59:59")

        filter_clauses: list[str] = []
        if filters:
            filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
            event_where.extend(filter_clauses)
            params.extend(filter_params)

        event_where_sql = "WHERE " + " AND ".join(event_where) if event_where else ""

        # Session date window: restrict to sessions that started in the date range.
        session_where: list[str] = []
        session_params: list = []
        if start_date:
            session_where.append("ds.start_time >= ?")
            session_params.append(f"{start_date} 00:00:00")
        if end_date:
            session_where.append("ds.start_time <= ?")
            session_params.append(f"{end_date} 23:59:59")

        if filters and filter_clauses:
            session_where.append(
                f"ds.user_id IN (SELECT DISTINCT user_id FROM events {event_where_sql})"
            )

        session_where_sql = (
            "WHERE " + " AND ".join(session_where) if session_where else ""
        )
        all_params = session_params + (params if filters and filter_clauses else [])

        timeout = db.get_session_timeout_minutes()
        dialect = db.get_dialect()

        rows = db.execute(
            f"""
            WITH {session_ctes(timeout, dialect)}
            SELECT
                COUNT(*) AS total_sessions,
                AVG(ds.duration_sec) AS avg_duration_sec,
                AVG(ds.event_count) AS avg_events_per_session
            FROM derived_sessions ds
            {session_where_sql}
            """,
            all_params or None,
        )

        row = rows[0] if rows else (0, 0.0, 0.0)
        return {
            "data": [
                {
                    "total_sessions": row[0] or 0,
                    "avg_duration_sec": round(row[1] or 0.0, 2),
                    "avg_events_per_session": round(row[2] or 0.0, 2),
                }
            ]
        }
    else:
        raise ValueError("db cannot be None")
