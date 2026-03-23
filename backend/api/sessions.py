"""Sessions API endpoints."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.services.views import session_ctes
from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.validators import parse_date, to_sql_datetime

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/raw/sessions")
def get_raw_sessions(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    limit: int = Query(20, description="Number of rows to return", ge=1, le=200),
    offset: int = Query(0, description="Offset for pagination", ge=0),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
) -> dict:
    """Return paginated list of sessions with basic stats."""
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    timeout = db.get_session_timeout_minutes()
    dialect = db.get_dialect()
    where: list[str] = []
    params: list = []
    if start_date:
        where.append("ds.start_time >= ?")
        params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        where.append("ds.start_time <= ?")
        params.append(to_sql_datetime(end_date, "23:59:59"))
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    ctes = session_ctes(timeout, dialect)
    total_row = db.execute(
        f"WITH {ctes} SELECT COUNT(*) FROM derived_sessions ds {where_sql}",
        params or None,
    )
    total = total_row[0][0] if total_row else 0

    rows = db.execute(
        f"""
        WITH {ctes}
        SELECT
            ds.session_id,
            ds.user_id,
            ds.start_time,
            ds.duration_sec,
            ds.event_count
        FROM derived_sessions ds
        {where_sql}
        ORDER BY ds.start_time DESC
        LIMIT ? OFFSET ?
        """,
        (params or []) + [limit, offset],
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "session_id": row[0],
                "user_id": row[1],
                "start_time": row[2].isoformat()
                if hasattr(row[2], "isoformat")
                else str(row[2]),
                "duration_sec": round(row[3] or 0, 2),
                "event_count": row[4] or 0,
                "device_type": None,
            }
            for row in rows
        ],
    }


@router.get("/sessions/summary")
def get_sessions_summary(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
) -> dict:
    """Return session summary stats for the given date range, respecting dimension filters."""
    event_where: list[str] = []
    params: list = []

    if start_date:
        event_where.append("timestamp >= ?")
        params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        event_where.append("timestamp <= ?")
        params.append(to_sql_datetime(end_date, "23:59:59"))

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
        session_params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        session_where.append("ds.start_time <= ?")
        session_params.append(to_sql_datetime(end_date, "23:59:59"))

    if filters and filter_clauses:
        session_where.append(
            f"ds.user_id IN (SELECT DISTINCT user_id FROM events {event_where_sql})"
        )

    session_where_sql = "WHERE " + " AND ".join(session_where) if session_where else ""
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
