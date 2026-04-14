"""Mission Control API endpoints."""

import json
from collections import defaultdict as _defaultdict
from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.sql_builder import date_trunc
from backend.services.validators import interpolate_sql, parse_date
from backend.services.views import session_ctes

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
            raise HTTPException(
                status_code=400, detail="Invalid filters JSON."
            ) from None

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

    # --- 3. New users ---
    # A user is "new" when their first event *within the filtered segment*
    # falls in the selected period. Filters must apply to the inner subquery,
    # otherwise with filters active we reflect global history instead of the
    # segment the user is looking at — and the partition
    #   new + returning + resurrected == unique_users
    # breaks.
    new_where_sql = ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""
    new_rows = db.execute(
        f"""
        SELECT COUNT(*)
        FROM (
            SELECT user_id
            FROM events
            {new_where_sql}
            GROUP BY user_id
            HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
        ) t
        """,
        list(filter_params) + [str(period_start), str(period_end)],
    )
    new_users = new_rows[0][0] if new_rows else 0

    # --- 4. DAU/MAU ratio ---
    # Both DAU and MAU use the same trailing 30-day window anchored at period_end.
    # This guarantees the ratio is always in [0, 1] and avoids window mismatch
    # (previously DAU used the selected period while MAU used a fixed 28-day window,
    # which could produce ratios > 1 for short periods).
    mau_start = period_end - timedelta(days=29)  # 30-day window
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
            {mau_where_sql}
            GROUP BY DATE(timestamp)
        ) t
        """,
        mau_params,
    )
    dau = dau_rows[0][0] if dau_rows else 0.0
    dau_mau_ratio = round(dau / mau, 4) if mau else 0.0

    # --- 5. New metrics (delegated to _fetch_single_metric) ---
    resurrected_users = int(
        _fetch_single_metric(
            db,
            "resurrected_users",
            period_start,
            period_end,
            filter_clauses,
            filter_params,
        )[0]
    )
    returning_users = int(
        _fetch_single_metric(
            db,
            "returning_users",
            period_start,
            period_end,
            filter_clauses,
            filter_params,
        )[0]
    )
    churned_users = int(
        _fetch_single_metric(
            db, "churned_users", period_start, period_end, filter_clauses, filter_params
        )[0]
    )
    retention_rate = float(
        _fetch_single_metric(
            db,
            "retention_rate",
            period_start,
            period_end,
            filter_clauses,
            filter_params,
        )[0]
    )
    wau = int(
        _fetch_single_metric(
            db, "wau", period_start, period_end, filter_clauses, filter_params
        )[0]
    )
    avg_active_days = float(
        _fetch_single_metric(
            db,
            "avg_active_days",
            period_start,
            period_end,
            filter_clauses,
            filter_params,
        )[0]
    )
    power_users = int(
        _fetch_single_metric(
            db, "power_users", period_start, period_end, filter_clauses, filter_params
        )[0]
    )

    return {
        "total_events": int(total_events),
        "unique_users": int(unique_users),
        "total_sessions": int(total_sessions),
        "avg_session_duration_sec": float(avg_session_duration_sec),
        "avg_events_per_session": float(avg_events_per_session),
        "new_users": int(new_users),
        "returning_users": returning_users,
        "resurrected_users": resurrected_users,
        "churned_users": churned_users,
        "retention_rate": retention_rate,
        "wau": wau,
        "avg_active_days": avg_active_days,
        "power_users": power_users,
        "dau_mau_ratio": float(dau_mau_ratio),
    }


def _fetch_single_metric(
    db: AnalyticsDatabase,
    metric: str,
    period_start: date,
    period_end: date,
    filter_clauses: list[str],
    filter_params: list,
) -> tuple[float, str | list[str]]:
    """Run only the SQL needed for the requested metric; return (value, sql_string)."""
    ps = f"{period_start} 00:00:00"
    pe = f"{period_end} 23:59:59"
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    if metric == "total_events":
        sql = f"SELECT COUNT(*) FROM events {ev_where_sql}"
        rows = db.execute(sql, ev_params)
        return rows[0][0] if rows else 0, interpolate_sql(sql, ev_params)

    if metric == "unique_users":
        sql = f"SELECT COUNT(DISTINCT user_id) FROM events {ev_where_sql}"
        rows = db.execute(sql, ev_params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, ev_params)

    if metric in (
        "total_sessions",
        "avg_session_duration_sec",
        "avg_events_per_session",
    ):
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

        sql = f"""
            WITH {session_ctes(timeout, dialect)}
            SELECT {agg} FROM derived_sessions ds {sess_where_sql}
            """
        rows = db.execute(sql, sess_params)
        return (round(rows[0][0] or 0.0, 2) if rows else 0.0), interpolate_sql(
            sql, sess_params
        )

    if metric == "new_users":
        # First event *within the filtered segment* falls in period.
        # Applying filters to the inner subquery is essential — see the
        # aggregate path's comment for the partition-identity rationale.
        new_where_sql = (
            ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""
        )
        sql = f"""
            SELECT COUNT(*)
            FROM (
                SELECT user_id
                FROM events
                {new_where_sql}
                GROUP BY user_id
                HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
            ) t
            """
        params = list(filter_params) + [str(period_start), str(period_end)]
        rows = db.execute(sql, params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, params)

    if metric in ("returning_users", "resurrected_users"):
        # Prior history must be scoped to the same filtered segment as the
        # current period — a user whose global history differs from their
        # history within the filter (e.g. events with different country/plan)
        # would otherwise be miscategorized.
        resurrection_cutoff = period_start - timedelta(
            days=db.get_resurrection_window_days()
        )
        prior_where = ["timestamp < ?"] + list(filter_clauses)
        prior_where_sql = "WHERE " + " AND ".join(prior_where)
        having = (
            "HAVING MAX(DATE(timestamp)) >= ?"
            if metric == "returning_users"
            else "HAVING MAX(DATE(timestamp)) < ?"
        )
        # A single last_seen subquery replaces the previous redundant
        # (prior_active ∧ last_seen) pair — the HAVING clause already implies
        # the user had prior activity.
        last_seen_subq = (
            f"SELECT user_id FROM events {prior_where_sql} GROUP BY user_id {having}"
        )
        sql = f"""
            SELECT COUNT(DISTINCT e.user_id)
            FROM events e
            {ev_where_sql}
            AND e.user_id IN ({last_seen_subq})
            """
        params = (
            list(ev_params) + [ps] + list(filter_params) + [str(resurrection_cutoff)]
        )
        rows = db.execute(sql, params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, params)

    if metric == "churned_users":
        # Both sides (prev period, current period) must apply the same
        # filters, otherwise "churned US users" becomes "anyone active last
        # period (globally) who's absent from the US segment this period".
        prev_start, prev_end = _compute_previous_period(period_start, period_end)
        pps = f"{prev_start} 00:00:00"
        ppe = f"{prev_end} 23:59:59"
        prev_where = ["timestamp >= ?", "timestamp <= ?"] + list(filter_clauses)
        prev_where_sql = "WHERE " + " AND ".join(prev_where)
        sql = f"""
            SELECT COUNT(DISTINCT user_id)
            FROM events
            {prev_where_sql}
              AND user_id NOT IN (
                SELECT DISTINCT user_id FROM events {ev_where_sql}
              )
            """
        params = [pps, ppe] + list(filter_params) + list(ev_params)
        rows = db.execute(sql, params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, params)

    if metric == "retention_rate":
        prev_start, prev_end = _compute_previous_period(period_start, period_end)
        pps = f"{prev_start} 00:00:00"
        ppe = f"{prev_end} 23:59:59"
        prev_uniq_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
        prev_uniq_params_r: list = [pps, ppe]
        prev_uniq_where.extend(filter_clauses)
        prev_uniq_params_r.extend(filter_params)
        prev_uniq_where_sql = "WHERE " + " AND ".join(prev_uniq_where)
        prev_uniq_sql = (
            f"SELECT COUNT(DISTINCT user_id) FROM events {prev_uniq_where_sql}"
        )
        prev_uniq_rows = db.execute(prev_uniq_sql, prev_uniq_params_r)
        prev_unique = prev_uniq_rows[0][0] if prev_uniq_rows else 0
        retained_sql = f"""
            SELECT COUNT(DISTINCT user_id)
            FROM events {ev_where_sql}
            AND user_id IN (
                SELECT DISTINCT user_id FROM events {prev_uniq_where_sql}
            )
            """
        retained_params = ev_params + prev_uniq_params_r
        retained_rows = db.execute(retained_sql, retained_params)
        retained = retained_rows[0][0] if retained_rows else 0
        value = round(retained / prev_unique, 4) if prev_unique else 0.0
        return value, [
            interpolate_sql(prev_uniq_sql, prev_uniq_params_r),
            interpolate_sql(retained_sql, retained_params),
        ]

    if metric == "wau":
        wau_start = period_end - timedelta(days=6)
        wau_start_ts = f"{wau_start} 00:00:00"
        wau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
        wau_params: list = [wau_start_ts, pe]
        wau_where.extend(filter_clauses)
        wau_params.extend(filter_params)
        wau_where_sql = "WHERE " + " AND ".join(wau_where)
        sql = f"SELECT COUNT(DISTINCT user_id) FROM events {wau_where_sql}"
        rows = db.execute(sql, wau_params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, wau_params)

    if metric == "avg_active_days":
        sql = f"""
            SELECT AVG(active_days) FROM (
                SELECT user_id, COUNT(DISTINCT DATE(timestamp)) AS active_days
                FROM events {ev_where_sql}
                GROUP BY user_id
            ) t
            """
        rows = db.execute(sql, ev_params)
        return (round(rows[0][0] or 0.0, 2) if rows else 0.0), interpolate_sql(
            sql, ev_params
        )

    if metric == "power_users":
        threshold = db.get_power_user_threshold_days()
        sql = f"""
            SELECT COUNT(*) FROM (
                SELECT user_id
                FROM events {ev_where_sql}
                GROUP BY user_id
                HAVING COUNT(DISTINCT DATE(timestamp)) >= ?
            ) t
            """
        params = ev_params + [threshold]
        rows = db.execute(sql, params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, params)

    # dau_mau_ratio
    if metric != "dau_mau_ratio":
        raise ValueError(f"Unknown metric: {metric}")

    mau_start = period_end - timedelta(days=29)  # 30-day window
    mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    mau_params: list = [f"{mau_start} 00:00:00", pe]
    mau_where.extend(filter_clauses)
    mau_params.extend(filter_params)
    mau_where_sql = "WHERE " + " AND ".join(mau_where)
    mau_sql = f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}"
    mau_rows = db.execute(mau_sql, mau_params)
    mau = mau_rows[0][0] if mau_rows else 0

    dau_sql = f"""
        SELECT AVG(daily_count)
        FROM (
            SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) AS daily_count
            FROM events {mau_where_sql}
            GROUP BY DATE(timestamp)
        ) t
        """
    dau_rows = db.execute(dau_sql, mau_params)
    dau = dau_rows[0][0] if dau_rows else 0.0
    value = round(dau / mau, 4) if mau else 0.0
    return value, [
        interpolate_sql(dau_sql, mau_params),
        interpolate_sql(mau_sql, mau_params),
    ]


def _fetch_single_metric_all_time(
    db: AnalyticsDatabase,
    metric: str,
    filter_clauses: list[str],
    filter_params: list,
) -> tuple[float, str | list[str]]:
    """Run the metric query over all time (no date bounds); return (value, sql_string)."""
    ev_where_sql = ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""

    if metric == "total_events":
        sql = f"SELECT COUNT(*) FROM events {ev_where_sql}"
        rows = db.execute(sql, filter_params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, filter_params)

    if metric == "unique_users":
        sql = f"SELECT COUNT(DISTINCT user_id) FROM events {ev_where_sql}"
        rows = db.execute(sql, filter_params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, filter_params)

    if metric in (
        "total_sessions",
        "avg_session_duration_sec",
        "avg_events_per_session",
    ):
        timeout = db.get_session_timeout_minutes()
        dialect = db.get_dialect()
        if metric == "total_sessions":
            agg = "COUNT(*)"
        elif metric == "avg_session_duration_sec":
            agg = "AVG(ds.duration_sec)"
        else:
            agg = "AVG(ds.event_count)"
        if ev_where_sql:
            sess_where_sql = f"WHERE ds.user_id IN (SELECT DISTINCT user_id FROM events {ev_where_sql})"
        else:
            sess_where_sql = ""
        sql = f"WITH {session_ctes(timeout, dialect)} SELECT {agg} FROM derived_sessions ds {sess_where_sql}"
        rows = db.execute(sql, filter_params)
        return (round(rows[0][0] or 0.0, 2) if rows else 0.0), interpolate_sql(
            sql, filter_params
        )

    if metric == "new_users":
        # All users are "new" in all-time context — return unique users
        sql = f"SELECT COUNT(DISTINCT user_id) FROM events {ev_where_sql}"
        rows = db.execute(sql, filter_params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, filter_params)

    if metric in ("returning_users", "resurrected_users"):
        return 0, ""

    if metric in ("churned_users", "retention_rate"):
        return 0.0, ""  # not meaningful without a fixed period

    if metric == "wau":
        # All-time: use last 7 days of all available data
        wau_where_sql = (
            ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""
        )
        bounds = db.execute(
            f"SELECT MAX(DATE(timestamp)) FROM events {wau_where_sql}",
            filter_params,
        )
        if not bounds or bounds[0][0] is None:
            return 0, ""
        max_day = bounds[0][0]
        max_day_dt = datetime.strptime(str(max_day), "%Y-%m-%d").date()
        wau_start_at = max_day_dt - timedelta(days=6)
        wau_at_where: list[str] = ["DATE(timestamp) >= ?", "DATE(timestamp) <= ?"]
        wau_at_params: list = [str(wau_start_at), str(max_day)]
        if filter_clauses:
            wau_at_where.extend(filter_clauses)
            wau_at_params.extend(filter_params)
        wau_at_where_sql = "WHERE " + " AND ".join(wau_at_where)
        sql = f"SELECT COUNT(DISTINCT user_id) FROM events {wau_at_where_sql}"
        rows = db.execute(sql, wau_at_params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, wau_at_params)

    if metric == "avg_active_days":
        ev_where_sql_at = (
            ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""
        )
        sql = f"""
            SELECT AVG(active_days) FROM (
                SELECT user_id, COUNT(DISTINCT DATE(timestamp)) AS active_days
                FROM events {ev_where_sql_at}
                GROUP BY user_id
            ) t
            """
        rows = db.execute(sql, filter_params)
        return (round(rows[0][0] or 0.0, 2) if rows else 0.0), interpolate_sql(
            sql, filter_params
        )

    if metric == "power_users":
        threshold = db.get_power_user_threshold_days()
        ev_where_sql_at = (
            ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""
        )
        sql = f"""
            SELECT COUNT(*) FROM (
                SELECT user_id FROM events {ev_where_sql_at}
                GROUP BY user_id
                HAVING COUNT(DISTINCT DATE(timestamp)) >= ?
            ) t
            """
        params = filter_params + [threshold]
        rows = db.execute(sql, params)
        return (rows[0][0] if rows else 0), interpolate_sql(sql, params)

    # dau_mau_ratio — not meaningful without a fixed period, return 0
    return 0.0, ""


SUPPORTED_METRICS = {
    "total_events",
    "unique_users",
    "total_sessions",
    "avg_session_duration_sec",
    "avg_events_per_session",
    "new_users",
    "returning_users",
    "resurrected_users",
    "dau_mau_ratio",
    "churned_users",
    "retention_rate",
    "wau",
    "avg_active_days",
    "power_users",
}


@router.get("/mission-control/metric")
def get_mission_control_metric(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    metric: str = Query(..., description="Metric name"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return current and previous period scalar for a single metric."""
    if metric not in SUPPORTED_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric '{metric}'. Supported: {sorted(SUPPORTED_METRICS)}",
        )

    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        try:
            filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, detail="Invalid filters JSON."
            ) from None

    if start_date and end_date:
        start, end, filter_clauses, filter_params = _parse_request_params(
            start_date, end_date, filters, db
        )
        prev_start, prev_end = _compute_previous_period(start, end)
        current_value, current_sql = _fetch_single_metric(
            db, metric, start, end, filter_clauses, filter_params
        )
        previous_value, previous_sql = _fetch_single_metric(
            db, metric, prev_start, prev_end, filter_clauses, filter_params
        )
    else:
        current_value, current_sql = _fetch_single_metric_all_time(
            db, metric, filter_clauses, filter_params
        )
        previous_value = None
        previous_sql = None

    breakdown: dict | None = None

    if metric == "retention_rate" and start_date and end_date:
        prev_start_b, prev_end_b = _compute_previous_period(start, end)
        pps_b = f"{prev_start_b} 00:00:00"
        ppe_b = f"{prev_end_b} 23:59:59"

        # Build current-period where clause for the retained subquery
        ps_b = f"{start} 00:00:00"
        pe_b = f"{end} 23:59:59"
        ev_where_b: list[str] = ["timestamp >= ?", "timestamp <= ?"]
        ev_params: list = [ps_b, pe_b]
        ev_where_b.extend(filter_clauses)
        ev_params.extend(filter_params)
        ev_where_sql = "WHERE " + " AND ".join(ev_where_b)

        # Previous period unique users (with filters applied)
        prev_uniq_where_b: list[str] = ["timestamp >= ?", "timestamp <= ?"]
        prev_uniq_params_b: list = [pps_b, ppe_b]
        prev_uniq_where_b.extend(filter_clauses)
        prev_uniq_params_b.extend(filter_params)
        prev_uniq_where_sql_b = "WHERE " + " AND ".join(prev_uniq_where_b)
        prev_uniq_rows_b = db.execute(
            f"SELECT COUNT(DISTINCT user_id) FROM events {prev_uniq_where_sql_b}",
            prev_uniq_params_b,
        )
        prev_uniq_b = prev_uniq_rows_b[0][0] if prev_uniq_rows_b else 0

        # Users retained (active in current period AND previous period)
        retained_rows_b = db.execute(
            f"""
            SELECT COUNT(DISTINCT user_id)
            FROM events {ev_where_sql}
            AND user_id IN (
                SELECT DISTINCT user_id FROM events {prev_uniq_where_sql_b}
            )
            """,
            ev_params + prev_uniq_params_b,
        )
        retained_b = retained_rows_b[0][0] if retained_rows_b else 0
        breakdown = {
            "retained_count": int(retained_b),
            "prev_unique_users": int(prev_uniq_b),
        }

    if metric == "dau_mau_ratio" and start_date and end_date:
        pe_bk = f"{end} 23:59:59"
        mau_start_bk = end - timedelta(days=29)  # 30-day window
        mau_where_bk: list[str] = ["timestamp >= ?", "timestamp <= ?"]
        mau_params_bk: list = [f"{mau_start_bk} 00:00:00", pe_bk]
        mau_where_bk.extend(filter_clauses)
        mau_params_bk.extend(filter_params)
        mau_where_sql_bk = "WHERE " + " AND ".join(mau_where_bk)
        mau_rows_bk = db.execute(
            f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql_bk}",
            mau_params_bk,
        )
        mau_bk = mau_rows_bk[0][0] if mau_rows_bk else 0
        dau_rows_bk = db.execute(
            f"""
            SELECT AVG(daily_count)
            FROM (
                SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) AS daily_count
                FROM events {mau_where_sql_bk}
                GROUP BY DATE(timestamp)
            ) t
            """,
            mau_params_bk,
        )
        dau_bk = round(dau_rows_bk[0][0] or 0.0, 2) if dau_rows_bk else 0.0
        breakdown = {
            "avg_dau": dau_bk,
            "mau_30d": int(mau_bk),
        }

    all_sqls: list[str] = []
    for s in [current_sql] if isinstance(current_sql, str) else (current_sql or []):
        if s:
            all_sqls.append(s)
    for s in [previous_sql] if isinstance(previous_sql, str) else (previous_sql or []):
        if s:
            all_sqls.append(s)

    return {
        "metric": metric,
        "current": float(current_value),
        "previous": float(previous_value) if previous_value is not None else None,
        "sql": all_sqls if len(all_sqls) > 1 else (all_sqls[0] if all_sqls else ""),
        **({"breakdown": breakdown} if breakdown is not None else {}),
    }


def _trunc_to_bucket(d: date, granularity: str) -> date:
    """Truncate a date to the start of the granularity bucket."""
    if granularity in ("hour", "day"):
        return d
    if granularity == "week":
        return d - timedelta(days=d.weekday())  # ISO Monday
    if granularity == "month":
        return d.replace(day=1)
    if granularity == "quarter":
        return d.replace(month=((d.month - 1) // 3) * 3 + 1, day=1)
    if granularity == "year":
        return d.replace(month=1, day=1)
    return d


def _resample(data: list[dict], granularity: str, agg: str = "sum") -> list[dict]:
    """Resample daily data to the requested granularity bucket.

    agg='sum' for count metrics (new_users, resurrected, etc.)
    agg='avg' for rate/average metrics (retention_rate, dau_mau_ratio, etc.)
    """
    if granularity == "day":
        return data
    buckets: dict[date, list[float]] = _defaultdict(list)
    for item in data:
        d = date.fromisoformat(item["date"])
        bucket = _trunc_to_bucket(d, granularity)
        buckets[bucket].append(float(item["value"]))
    result = []
    for bucket_date in sorted(buckets):
        vals = buckets[bucket_date]
        value = sum(vals) if agg == "sum" else (sum(vals) / len(vals) if vals else 0.0)
        result.append({"date": str(bucket_date), "value": round(value, 4)})
    return result


@router.get("/mission-control/trend")
def get_mission_control_trend(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    metric: str = Query(..., description="Metric name"),
    granularity: str = Query("day", description="Aggregation granularity"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return daily time-series for a single metric."""
    if metric not in SUPPORTED_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric '{metric}'. Supported: {sorted(SUPPORTED_METRICS)}",
        )

    if start_date and end_date:
        start, end, filter_clauses, filter_params = _parse_request_params(
            start_date, end_date, filters, db
        )
    else:
        # All-time: derive date range from the data itself
        filter_clauses, filter_params = [], []
        if filters:
            try:
                filter_clauses, filter_params = db.build_filter_clauses(
                    json.loads(filters)
                )
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400, detail="Invalid filters JSON."
                ) from None
        bounds_where = (
            ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""
        )
        bounds = db.execute(
            f"SELECT DATE(MIN(timestamp)), DATE(MAX(timestamp)) FROM events {bounds_where}",
            filter_params,
        )
        if not bounds or bounds[0][0] is None:
            return {"metric": metric, "data": []}
        start = datetime.fromisoformat(str(bounds[0][0])).date()
        end = datetime.fromisoformat(str(bounds[0][1])).date()

    ps = f"{start} 00:00:00"
    pe = f"{end} 23:59:59"
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    timeout = db.get_session_timeout_minutes()
    dialect = db.get_dialect()

    trend_sql: str | list[str] = ""

    if metric == "total_events":
        trunc_expr = date_trunc(granularity, "timestamp", dialect)
        trend_sql = f"SELECT {trunc_expr}, COUNT(*) FROM events {ev_where_sql} GROUP BY {trunc_expr} ORDER BY 1"
        rows = db.execute(trend_sql, ev_params)
        data = [{"date": str(r[0]), "value": r[1] or 0} for r in rows]
        sql_val = interpolate_sql(trend_sql, ev_params)

    elif metric == "unique_users":
        trunc_expr = date_trunc(granularity, "timestamp", dialect)
        trend_sql = f"SELECT {trunc_expr}, COUNT(DISTINCT user_id) FROM events {ev_where_sql} GROUP BY {trunc_expr} ORDER BY 1"
        rows = db.execute(trend_sql, ev_params)
        data = [{"date": str(r[0]), "value": r[1] or 0} for r in rows]
        sql_val = interpolate_sql(trend_sql, ev_params)

    elif metric in (
        "total_sessions",
        "avg_session_duration_sec",
        "avg_events_per_session",
    ):
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

        trunc_expr = date_trunc(granularity, "ds.start_time", dialect)
        trend_sql = f"""
            WITH {session_ctes(timeout, dialect)}
            SELECT {trunc_expr}, {agg}
            FROM derived_sessions ds
            {sess_where_sql}
            GROUP BY {trunc_expr}
            ORDER BY 1
            """
        rows = db.execute(trend_sql, sess_params)
        data = [{"date": str(r[0]), "value": round(r[1] or 0.0, 2)} for r in rows]
        sql_val = interpolate_sql(trend_sql, sess_params)

    elif metric == "new_users":
        trend_sql = f"""
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
            """
        new_params = ev_params + [str(start), str(end)]
        rows = db.execute(trend_sql, new_params)
        by_day: dict[str, int] = {str(r[0]): r[1] or 0 for r in rows}
        current_day = start
        data = []
        while current_day <= end:
            data.append(
                {"date": str(current_day), "value": by_day.get(str(current_day), 0)}
            )
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="sum")
        sql_val = interpolate_sql(trend_sql, new_params)

    elif metric == "returning_users":
        uniq_sql = f"SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) FROM events {ev_where_sql} GROUP BY d ORDER BY d"
        uniq_rows = db.execute(uniq_sql, ev_params)
        daily_uniq: dict[str, int] = {str(r[0]): r[1] or 0 for r in uniq_rows}

        new_sql = f"""
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
            """
        new_ret_params = ev_params + [str(start), str(end)]
        new_rows = db.execute(new_sql, new_ret_params)
        new_by_day: dict[str, int] = {str(r[0]): r[1] or 0 for r in new_rows}

        current_day = start
        data = []
        while current_day <= end:
            d = str(current_day)
            returning = max(0, daily_uniq.get(d, 0) - new_by_day.get(d, 0))
            data.append({"date": d, "value": returning})
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="sum")
        sql_val = [
            interpolate_sql(uniq_sql, ev_params),
            interpolate_sql(new_sql, new_ret_params),
        ]

    elif metric == "resurrected_users":
        resurrection_cutoff_days = db.get_resurrection_window_days()
        prior_where_sql = (
            ("WHERE timestamp < ? AND " + " AND ".join(filter_clauses))
            if filter_clauses
            else "WHERE timestamp < ?"
        )
        current_day = start
        data = []
        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            day_cutoff = current_day - timedelta(days=resurrection_cutoff_days)
            day_ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            day_ev_params: list = [day_ps, day_pe]
            day_ev_where.extend(filter_clauses)
            day_ev_params.extend(filter_params)
            day_ev_where_sql = "WHERE " + " AND ".join(day_ev_where)
            # Prior-history subquery must apply the same filters as the
            # current-day events — otherwise a user whose filtered history is
            # empty but whose global history is old gets wrongly tagged as
            # resurrected.
            rows = db.execute(
                f"""
                SELECT COUNT(DISTINCT e.user_id)
                FROM events e
                {day_ev_where_sql}
                AND e.user_id IN (
                    SELECT user_id FROM events {prior_where_sql}
                    GROUP BY user_id HAVING MAX(DATE(timestamp)) < ?
                )
                """,
                day_ev_params + [day_ps] + list(filter_params) + [str(day_cutoff)],
            )
            data.append({"date": str(current_day), "value": rows[0][0] if rows else 0})
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="sum")
        sql_val = "resurrected_users daily trend"

    elif metric == "churned_users":
        # Both the prev-window and current-day sides must apply filters;
        # otherwise "churned US users" includes users who were never in the
        # US segment to begin with.
        current_day = start
        data = []
        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            prev_d_end = current_day - timedelta(days=1)
            prev_d_start = current_day - timedelta(days=7)
            prev_where = ["timestamp >= ?", "timestamp <= ?"] + list(filter_clauses)
            cur_where = ["timestamp >= ?", "timestamp <= ?"] + list(filter_clauses)
            prev_where_sql = " AND ".join(prev_where)
            cur_where_sql = " AND ".join(cur_where)
            rows = db.execute(
                f"""
                SELECT COUNT(DISTINCT user_id) FROM events
                WHERE {prev_where_sql}
                  AND user_id NOT IN (
                    SELECT DISTINCT user_id FROM events
                    WHERE {cur_where_sql}
                  )
                """,
                [f"{prev_d_start} 00:00:00", f"{prev_d_end} 23:59:59"]
                + list(filter_params)
                + [day_ps, day_pe]
                + list(filter_params),
            )
            data.append({"date": str(current_day), "value": rows[0][0] if rows else 0})
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="sum")
        sql_val = "churned_users daily trend"

    elif metric == "retention_rate":
        current_day = start
        data = []
        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            prev_d_end = current_day - timedelta(days=1)
            prev_d_start = current_day - timedelta(days=7)
            prev_rows = db.execute(
                "SELECT COUNT(DISTINCT user_id) FROM events WHERE timestamp >= ? AND timestamp <= ?",
                [f"{prev_d_start} 00:00:00", f"{prev_d_end} 23:59:59"],
            )
            prev_u = prev_rows[0][0] if prev_rows else 0
            ret_rows = db.execute(
                """
                SELECT COUNT(DISTINCT user_id) FROM events
                WHERE timestamp >= ? AND timestamp <= ?
                  AND user_id IN (
                    SELECT DISTINCT user_id FROM events
                    WHERE timestamp >= ? AND timestamp <= ?
                  )
                """,
                [day_ps, day_pe, f"{prev_d_start} 00:00:00", f"{prev_d_end} 23:59:59"],
            )
            retained = ret_rows[0][0] if ret_rows else 0
            ratio = round(retained / prev_u, 4) if prev_u else 0.0
            data.append({"date": str(current_day), "value": ratio})
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="avg")
        sql_val = "retention_rate daily trend"

    elif metric == "wau":
        current_day = start
        data = []
        while current_day <= end:
            wau_s = current_day - timedelta(days=6)
            wau_where_t: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            wau_params_t: list = [f"{wau_s} 00:00:00", f"{current_day} 23:59:59"]
            wau_where_t.extend(filter_clauses)
            wau_params_t.extend(filter_params)
            wau_where_sql_t = "WHERE " + " AND ".join(wau_where_t)
            rows = db.execute(
                f"SELECT COUNT(DISTINCT user_id) FROM events {wau_where_sql_t}",
                wau_params_t,
            )
            data.append({"date": str(current_day), "value": rows[0][0] if rows else 0})
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="avg")
        sql_val = "wau rolling 7-day trend"

    elif metric == "avg_active_days":
        current_day = start
        data = []
        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            # For each day: among users active that day, avg their distinct active days in the full period
            day_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            day_params: list = [day_ps, day_pe]
            day_where.extend(filter_clauses)
            day_params.extend(filter_params)
            day_where_sql = "WHERE " + " AND ".join(day_where)
            rows = db.execute(
                f"""
                SELECT AVG(active_days) FROM (
                    SELECT e2.user_id, COUNT(DISTINCT DATE(e2.timestamp)) AS active_days
                    FROM events e2
                    {ev_where_sql}
                    AND e2.user_id IN (SELECT DISTINCT user_id FROM events {day_where_sql})
                    GROUP BY e2.user_id
                ) t
                """,
                ev_params + day_params,
            )
            data.append(
                {
                    "date": str(current_day),
                    "value": round(rows[0][0] or 0.0, 2) if rows else 0.0,
                }
            )
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="avg")
        sql_val = "avg_active_days daily trend"

    elif metric == "power_users":
        threshold = db.get_power_user_threshold_days()
        current_day = start
        data = []
        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            day_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            day_params: list = [day_ps, day_pe]
            day_where.extend(filter_clauses)
            day_params.extend(filter_params)
            day_where_sql = "WHERE " + " AND ".join(day_where)
            # Count users active on this day who qualify as power users over the full period
            rows = db.execute(
                f"""
                SELECT COUNT(*) FROM (
                    SELECT e2.user_id
                    FROM events e2
                    {ev_where_sql}
                    AND e2.user_id IN (SELECT DISTINCT user_id FROM events {day_where_sql})
                    GROUP BY e2.user_id
                    HAVING COUNT(DISTINCT DATE(e2.timestamp)) >= ?
                ) t
                """,
                ev_params + day_params + [threshold],
            )
            data.append({"date": str(current_day), "value": rows[0][0] if rows else 0})
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="sum")
        sql_val = "power_users daily trend"

    else:  # dau_mau_ratio
        current_day = start
        data = []
        # Build representative SQL using the first day's params for display
        day_ps_ex = f"{start} 00:00:00"
        day_pe_ex = f"{start} 23:59:59"
        dau_where_ex: list[str] = ["timestamp >= ?", "timestamp <= ?"]
        dau_params_ex: list = [day_ps_ex, day_pe_ex]
        dau_where_ex.extend(filter_clauses)
        dau_params_ex.extend(filter_params)
        mau_start_ex = start - timedelta(days=29)  # 30-day window
        mau_where_ex: list[str] = ["timestamp >= ?", "timestamp <= ?"]
        mau_params_ex: list = [f"{mau_start_ex} 00:00:00", day_pe_ex]
        mau_where_ex.extend(filter_clauses)
        mau_params_ex.extend(filter_params)
        dau_sql_ex = f"SELECT COUNT(DISTINCT user_id) FROM events WHERE {' AND '.join(dau_where_ex)}"
        mau_sql_ex = f"SELECT COUNT(DISTINCT user_id) FROM events WHERE {' AND '.join(mau_where_ex)}"
        sql_val = [
            interpolate_sql(dau_sql_ex, dau_params_ex),
            interpolate_sql(mau_sql_ex, mau_params_ex),
        ]

        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            dau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            dau_params: list = [day_ps, day_pe]
            dau_where.extend(filter_clauses)
            dau_params.extend(filter_params)
            dau_where_sql = "WHERE " + " AND ".join(dau_where)

            mau_start = current_day - timedelta(days=29)  # 30-day window
            mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            mau_params: list = [f"{mau_start} 00:00:00", day_pe]
            mau_where.extend(filter_clauses)
            mau_params.extend(filter_params)
            mau_where_sql = "WHERE " + " AND ".join(mau_where)

            dau_r = db.execute(
                f"SELECT COUNT(DISTINCT user_id) FROM events {dau_where_sql}",
                dau_params,
            )
            mau_r = db.execute(
                f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}",
                mau_params,
            )
            dau_val = dau_r[0][0] if dau_r else 0
            mau_val = mau_r[0][0] if mau_r else 0
            ratio = round(dau_val / mau_val, 4) if mau_val else 0.0
            data.append({"date": str(current_day), "value": ratio})
            current_day += timedelta(days=1)
        data = _resample(data, granularity, agg="avg")

    return {
        "sql": sql_val,
        "metric": metric,
        "data": [{"date": d["date"], "value": float(d["value"])} for d in data],
    }


@router.get("/mission-control")
def get_mission_control(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return current and previous period KPI metrics."""
    start, end, filter_clauses, filter_params = _parse_request_params(
        start_date, end_date, filters, db
    )

    prev_start, prev_end = _compute_previous_period(start, end)

    current = _fetch_period_metrics(db, start, end, filter_clauses, filter_params)
    previous = _fetch_period_metrics(
        db, prev_start, prev_end, filter_clauses, filter_params
    )

    return {
        "period": {"start_date": str(start), "end_date": str(end)},
        "previous_period": {"start_date": str(prev_start), "end_date": str(prev_end)},
        "current": current,
        "previous": previous,
    }
