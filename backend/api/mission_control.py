"""Mission Control API endpoints."""

import json
from datetime import date, datetime, timedelta
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


def _parse_request_params(
    start_date: str,
    end_date: str,
    filters: str | None,
    db: AnalyticsDatabase,
) -> tuple[date, date, list[str], list]:
    """Parse and validate common query params; raise HTTP 400 on invalid input."""
    parse_date(start_date)
    parse_date(end_date)
    start = datetime.fromisoformat(start_date).date()
    end = datetime.fromisoformat(end_date).date()
    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date.")

    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        try:
            filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid filters JSON.")

    return start, end, filter_clauses, filter_params


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


def _fetch_single_metric(
    db: AnalyticsDatabase,
    metric: str,
    period_start: date,
    period_end: date,
    filter_clauses: list[str],
    filter_params: list,
) -> float:
    """Run only the SQL needed for the requested metric; return a single scalar."""
    ps = f"{period_start} 00:00:00"
    pe = f"{period_end} 23:59:59"
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    if metric == "total_events":
        rows = db.execute(f"SELECT COUNT(*) FROM events {ev_where_sql}", ev_params)
        return rows[0][0] if rows else 0

    if metric == "unique_users":
        rows = db.execute(
            f"SELECT COUNT(DISTINCT user_id) FROM events {ev_where_sql}", ev_params
        )
        return rows[0][0] if rows else 0

    if metric in ("total_sessions", "avg_session_duration_sec", "avg_events_per_session"):
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

        if metric == "total_sessions":
            agg = "COUNT(*)"
        elif metric == "avg_session_duration_sec":
            agg = "AVG(ds.duration_sec)"
        else:
            agg = "AVG(ds.event_count)"

        rows = db.execute(
            f"""
            WITH {session_ctes(timeout, dialect)}
            SELECT {agg} FROM derived_sessions ds {sess_where_sql}
            """,
            sess_params,
        )
        return round(rows[0][0] or 0.0, 2) if rows else 0.0

    if metric == "new_users":
        rows = db.execute(
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
        return rows[0][0] if rows else 0

    if metric == "returning_users":
        uniq_rows = db.execute(
            f"SELECT COUNT(DISTINCT user_id) FROM events {ev_where_sql}", ev_params
        )
        unique_users = uniq_rows[0][0] if uniq_rows else 0
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
        return max(0, unique_users - new_users)

    # dau_mau_ratio
    if metric != "dau_mau_ratio":
        raise ValueError(f"Unknown metric: {metric}")

    dau_rows = db.execute(
        f"""
        SELECT AVG(daily_count)
        FROM (
            SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) AS daily_count
            FROM events {ev_where_sql}
            GROUP BY DATE(timestamp)
        ) t
        """,
        ev_params,
    )
    dau = dau_rows[0][0] if dau_rows else 0.0

    mau_start = period_end - timedelta(days=27)
    mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    mau_params: list = [f"{mau_start} 00:00:00", pe]
    mau_where.extend(filter_clauses)
    mau_params.extend(filter_params)
    mau_where_sql = "WHERE " + " AND ".join(mau_where)
    mau_rows = db.execute(
        f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}", mau_params
    )
    mau = mau_rows[0][0] if mau_rows else 0
    return round(dau / mau, 4) if mau else 0.0


SUPPORTED_METRICS = {
    "total_events",
    "unique_users",
    "total_sessions",
    "avg_session_duration_sec",
    "avg_events_per_session",
    "new_users",
    "returning_users",
    "dau_mau_ratio",
}


@router.get("/mission-control/metric")
def get_mission_control_metric(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    metric: str = Query(..., description="Metric name"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return current and previous period scalar for a single metric."""
    if metric not in SUPPORTED_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric '{metric}'. Supported: {sorted(SUPPORTED_METRICS)}",
        )

    start, end, filter_clauses, filter_params = _parse_request_params(start_date, end_date, filters, db)

    prev_start, prev_end = _compute_previous_period(start, end)

    current_value = _fetch_single_metric(db, metric, start, end, filter_clauses, filter_params)
    previous_value = _fetch_single_metric(db, metric, prev_start, prev_end, filter_clauses, filter_params)

    return {"metric": metric, "current": current_value, "previous": previous_value}


@router.get("/mission-control/trend")
def get_mission_control_trend(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    metric: str = Query(..., description="Metric name"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return daily time-series for a single metric."""
    if metric not in SUPPORTED_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric '{metric}'. Supported: {sorted(SUPPORTED_METRICS)}",
        )

    start, end, filter_clauses, filter_params = _parse_request_params(start_date, end_date, filters, db)

    ps = f"{start} 00:00:00"
    pe = f"{end} 23:59:59"
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    timeout = db.get_session_timeout_minutes()
    dialect = db.get_dialect()

    if metric == "total_events":
        rows = db.execute(
            f"SELECT DATE(timestamp), COUNT(*) FROM events {ev_where_sql} GROUP BY DATE(timestamp) ORDER BY 1",
            ev_params,
        )
        data = [{"date": str(r[0]), "value": r[1] or 0} for r in rows]

    elif metric == "unique_users":
        rows = db.execute(
            f"SELECT DATE(timestamp), COUNT(DISTINCT user_id) FROM events {ev_where_sql} GROUP BY DATE(timestamp) ORDER BY 1",
            ev_params,
        )
        data = [{"date": str(r[0]), "value": r[1] or 0} for r in rows]

    elif metric in ("total_sessions", "avg_session_duration_sec", "avg_events_per_session"):
        sess_where: list[str] = ["ds.start_time >= ?", "ds.start_time <= ?"]
        sess_params: list = [ps, pe]
        if filter_clauses:
            sess_where.append(
                f"ds.user_id IN (SELECT DISTINCT user_id FROM events {ev_where_sql})"
            )
            sess_params.extend(ev_params)
        sess_where_sql = "WHERE " + " AND ".join(sess_where)

        if metric == "total_sessions":
            agg = "COUNT(*)"
        elif metric == "avg_session_duration_sec":
            agg = "AVG(ds.duration_sec)"
        else:
            agg = "AVG(ds.event_count)"

        rows = db.execute(
            f"""
            WITH {session_ctes(timeout, dialect)}
            SELECT DATE(ds.start_time), {agg}
            FROM derived_sessions ds
            {sess_where_sql}
            GROUP BY DATE(ds.start_time)
            ORDER BY 1
            """,
            sess_params,
        )
        data = [{"date": str(r[0]), "value": round(r[1] or 0.0, 2)} for r in rows]

    elif metric == "new_users":
        rows = db.execute(
            f"""
            SELECT first_day, COUNT(*) AS cnt
            FROM (
                SELECT user_id, DATE(MIN(timestamp)) AS first_day
                FROM events
                {ev_where_sql}
                GROUP BY user_id
            ) sub
            WHERE first_day >= ? AND first_day <= ?
            GROUP BY first_day
            ORDER BY first_day
            """,
            ev_params + [str(start), str(end)],
        )
        by_day: dict[str, int] = {str(r[0]): r[1] or 0 for r in rows}
        current_day = start
        data = []
        while current_day <= end:
            data.append({"date": str(current_day), "value": by_day.get(str(current_day), 0)})
            current_day += timedelta(days=1)

    elif metric == "returning_users":
        uniq_rows = db.execute(
            f"SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) FROM events {ev_where_sql} GROUP BY d ORDER BY d",
            ev_params,
        )
        daily_uniq: dict[str, int] = {str(r[0]): r[1] or 0 for r in uniq_rows}

        new_rows = db.execute(
            f"""
            SELECT first_day, COUNT(*) AS cnt
            FROM (
                SELECT user_id, DATE(MIN(timestamp)) AS first_day
                FROM events
                {ev_where_sql}
                GROUP BY user_id
            ) sub
            WHERE first_day >= ? AND first_day <= ?
            GROUP BY first_day
            ORDER BY first_day
            """,
            ev_params + [str(start), str(end)],
        )
        new_by_day: dict[str, int] = {str(r[0]): r[1] or 0 for r in new_rows}

        current_day = start
        data = []
        while current_day <= end:
            d = str(current_day)
            returning = max(0, daily_uniq.get(d, 0) - new_by_day.get(d, 0))
            data.append({"date": d, "value": returning})
            current_day += timedelta(days=1)

    else:  # dau_mau_ratio
        current_day = start
        data = []
        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            dau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            dau_params: list = [day_ps, day_pe]
            dau_where.extend(filter_clauses)
            dau_params.extend(filter_params)
            dau_where_sql = "WHERE " + " AND ".join(dau_where)

            mau_start = current_day - timedelta(days=27)
            mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            mau_params: list = [f"{mau_start} 00:00:00", day_pe]
            mau_where.extend(filter_clauses)
            mau_params.extend(filter_params)
            mau_where_sql = "WHERE " + " AND ".join(mau_where)

            dau_r = db.execute(f"SELECT COUNT(DISTINCT user_id) FROM events {dau_where_sql}", dau_params)
            mau_r = db.execute(f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}", mau_params)
            dau_val = dau_r[0][0] if dau_r else 0
            mau_val = mau_r[0][0] if mau_r else 0
            ratio = round(dau_val / mau_val, 4) if mau_val else 0.0
            data.append({"date": str(current_day), "value": ratio})
            current_day += timedelta(days=1)

    return {"metric": metric, "data": data}


@router.get("/mission-control")
def get_mission_control(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return current and previous period KPI metrics."""
    start, end, filter_clauses, filter_params = _parse_request_params(start_date, end_date, filters, db)

    prev_start, prev_end = _compute_previous_period(start, end)

    current = _fetch_period_metrics(db, start, end, filter_clauses, filter_params)
    previous = _fetch_period_metrics(db, prev_start, prev_end, filter_clauses, filter_params)

    return {
        "period": {"start_date": str(start), "end_date": str(end)},
        "previous_period": {"start_date": str(prev_start), "end_date": str(prev_end)},
        "current": current,
        "previous": previous,
    }
