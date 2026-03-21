"""Mission Control API endpoints."""

import json
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.views import session_ctes
from backend.services.validators import parse_date

router = APIRouter(prefix="/api", tags=["mission-control"])


def _compute_previous_period(start: date, end: date) -> tuple[date, date]:
    duration = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = start - timedelta(days=duration)
    return prev_start, prev_end


def _fetch_period_metrics(
    db: AnalyticsDatabase,
    period_start: date,
    period_end: date,
    filter_clauses: list[str],
    filter_params: list,
) -> dict:
    ps = f"{period_start} 00:00:00"
    pe = f"{period_end} 23:59:59"

    # --- 1. Events aggregate ---
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    ev_rows = db.execute(
        f"SELECT COUNT(*), COUNT(DISTINCT user_id) FROM events {ev_where_sql}",
        ev_params,
    )
    total_events = ev_rows[0][0] if ev_rows else 0
    unique_users = ev_rows[0][1] if ev_rows else 0

    # --- 2. Sessions summary ---
    sess_where: list[str] = ["ds.start_time >= ?", "ds.start_time <= ?"]
    sess_params: list = [ps, pe]
    if filter_clauses:
        sess_where.append(
            f"ds.user_id IN (SELECT DISTINCT user_id FROM events {ev_where_sql})"
        )
        sess_params.extend(ev_params)

    sess_where_sql = "WHERE " + " AND ".join(sess_where)
    timeout = db.get_session_timeout_minutes()
    dialect = db.get_dialect()

    sess_rows = db.execute(
        f"""
        WITH {session_ctes(timeout, dialect)}
        SELECT COUNT(*), AVG(ds.duration_sec), AVG(ds.event_count)
        FROM derived_sessions ds
        {sess_where_sql}
        """,
        sess_params,
    )
    sess_row = sess_rows[0] if sess_rows else (0, 0.0, 0.0)
    total_sessions = sess_row[0] or 0
    avg_session_duration_sec = round(sess_row[1] or 0.0, 2)
    avg_events_per_session = round(sess_row[2] or 0.0, 2)

    # --- 3. New vs returning users ---
    # new_users: users whose DATE(MIN(timestamp over all history)) is in period
    new_rows = db.execute(
        """
        SELECT COUNT(*)
        FROM (
            SELECT user_id
            FROM events
            GROUP BY user_id
            HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
        ) t
        """,
        [str(period_start), str(period_end)],
    )
    new_users = new_rows[0][0] if new_rows else 0
    returning_users = max(0, unique_users - new_users)

    # --- 4. DAU/MAU ratio ---
    mau_start = period_end - timedelta(days=27)
    mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    mau_params: list = [f"{mau_start} 00:00:00", pe]
    mau_where.extend(filter_clauses)
    mau_params.extend(filter_params)
    mau_where_sql = "WHERE " + " AND ".join(mau_where)

    mau_rows = db.execute(
        f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}",
        mau_params,
    )
    mau = mau_rows[0][0] if mau_rows else 0

    dau_rows = db.execute(
        f"""
        SELECT AVG(daily_count)
        FROM (
            SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) AS daily_count
            FROM events
            {ev_where_sql}
            GROUP BY DATE(timestamp)
        ) t
        """,
        ev_params,
    )
    dau = dau_rows[0][0] if dau_rows else 0.0
    dau_mau_ratio = round(dau / mau, 4) if mau else 0.0

    return {
        "total_events": total_events,
        "unique_users": unique_users,
        "total_sessions": total_sessions,
        "avg_session_duration_sec": avg_session_duration_sec,
        "avg_events_per_session": avg_events_per_session,
        "new_users": new_users,
        "returning_users": returning_users,
        "dau_mau_ratio": dau_mau_ratio,
    }


@router.get("/mission-control")
def get_mission_control(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return current and previous period KPI metrics."""
    # parse_date validates format and raises HTTP 400; then convert to date for arithmetic
    parse_date(start_date)
    parse_date(end_date)
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date.")

    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        try:
            filters_dict = json.loads(filters)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid filters JSON.")
        filter_clauses, filter_params = db.build_filter_clauses(filters_dict)

    prev_start, prev_end = _compute_previous_period(start, end)

    current = _fetch_period_metrics(db, start, end, filter_clauses, filter_params)
    previous = _fetch_period_metrics(db, prev_start, prev_end, filter_clauses, filter_params)

    return {
        "period": {"start_date": str(start), "end_date": str(end)},
        "previous_period": {"start_date": str(prev_start), "end_date": str(prev_end)},
        "current": current,
        "previous": previous,
    }
