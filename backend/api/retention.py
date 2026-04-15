"""Retention API endpoints."""

import json
from datetime import date as date_type
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.core.auth import get_current_user
from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.sql_builder import date_diff_days, date_diff_months, date_trunc
from backend.services.validators import interpolate_sql, parse_date, to_sql_datetime

router = APIRouter(
    prefix="/api", tags=["retention"], dependencies=[Depends(get_current_user)]
)

# ──────────────────────────────────────────────────────────────────────────────
# Configurable retention milestones per granularity
# ──────────────────────────────────────────────────────────────────────────────
RETENTION_CONFIG: dict[str, dict] = {
    "day": {
        "milestones": [1, 7, 30, 90],  # dropped D14
        "max_units": 90,
        "unit_divisor": 1,
    },
    "week": {
        "milestones": [1, 2, 4, 12],  # dropped W3
        "max_units": 12,
        "unit_divisor": 7,
    },
    "month": {
        "milestones": [1, 2, 3, 6],  # dropped M4, M5
        "max_units": 6,
        "unit_divisor": 30,
    },
    "quarter": {
        "milestones": [1, 2, 3, 4],  # unchanged
        "max_units": 4,
        "unit_divisor": 91,
    },
    "year": {
        "milestones": [1, 2, 3],  # unchanged
        "max_units": 3,
        "unit_divisor": 365,
    },
}


@router.get("/retention")
def get_retention(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    granularity: str | None = Query(
        "day", description="Cohort granularity: day | week | month"
    ),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
) -> dict:
    """Calculate N-Unit Retention Cohorts.

    Cohorts are defined by each user's first-ever event within the date range,
    grouped by the requested granularity.  For each cohort the response includes:
      - retention_series : one percentage per unit (day/week/month) from 0 to
                           min(max_units, end_date − cohort_date)
      - milestone_values : percentages for the configured milestone units only
    """
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    dialect = db.get_dialect()
    gran = granularity if granularity in RETENTION_CONFIG else "day"
    config = RETENTION_CONFIG[gran]

    milestones: list[int] = config["milestones"]
    max_units: int = config["max_units"]
    unit_divisor: int = config["unit_divisor"]

    # Cohort trunc unit (day/week/month for the cohort_date column)
    day_col = date_trunc(gran, "timestamp", dialect)

    # Unit expression: for day/week use FLOOR(days / divisor); for month/quarter/year
    # use calendar-month arithmetic to avoid 31-day months bleeding into the next unit.
    if gran in ("month", "quarter", "year"):
        months_diff = date_diff_months("s.cohort_date", "a.activity_date", dialect)
        if gran == "month":
            unit_expr = months_diff
        elif gran == "quarter":
            unit_expr = f"FLOOR(({months_diff}) / 3)"
        else:  # year
            unit_expr = f"FLOOR(({months_diff}) / 12)"
    else:
        days_diff = date_diff_days("s.cohort_date", "a.activity_date", dialect)
        unit_expr = f"FLOOR(({days_diff}) / {unit_divisor})"

    # ── WHERE clauses ──────────────────────────────────────────────────────────
    # Dimension filters apply to both the cohort scan and the activity scan.
    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))

    filter_where = ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""

    # Date-range params used to restrict which users qualify as "new" cohort members.
    # `first_seen` is date-truncated (YYYY-MM-DD in sqlite's TEXT collation).
    # For sqlite, use date-only bounds to avoid lexicographic comparison against a
    # longer datetime string (which excludes rows exactly on the start boundary).
    date_params: list = []
    date_clauses: list[str] = []
    # ClickHouse: toStartOfDay(DateTime64) returns Date in 24.x; date-only strings
    # ('2025-01-01') compare cleanly to both Date and DateTime columns, but
    # datetime strings ('2025-01-01 00:00:00') raise TYPE_MISMATCH (code 53).
    use_date_only = dialect in ("sqlite", "clickhouse")
    if start_date:
        date_clauses.append("first_seen >= ?")
        date_params.append(
            start_date if use_date_only else to_sql_datetime(start_date, "00:00:00")
        )
    if end_date:
        date_clauses.append("first_seen <= ?")
        date_params.append(
            end_date if use_date_only else to_sql_datetime(end_date, "23:59:59")
        )

    cohort_date_where = ("WHERE " + " AND ".join(date_clauses)) if date_clauses else ""

    # params order: filter (for first_seen subquery) + filter (for activity) + date range
    params = filter_params + filter_params + date_params

    # ── Series query (per-unit counts for sparkline) ──────────────────────────
    series_query = f"""
        WITH first_seen AS (
            SELECT
                user_id,
                MIN({day_col}) AS first_seen
            FROM events
            {filter_where}
            GROUP BY user_id
        ),
        signups AS (
            SELECT user_id, first_seen AS cohort_date
            FROM first_seen
            {cohort_date_where}
        ),
        user_activity AS (
            SELECT DISTINCT
                user_id,
                {date_trunc("day", "timestamp", dialect)} AS activity_date
            FROM events
            {filter_where}
        ),
        cohort_activity AS (
            SELECT
                s.user_id,
                s.cohort_date,
                {unit_expr} AS unit_since_signup
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
                ca.cohort_date,
                ca.unit_since_signup,
                COUNT(DISTINCT ca.user_id) AS returning_users
            FROM cohort_activity ca
            GROUP BY ca.cohort_date, ca.unit_since_signup
        )
        SELECT
            cs.cohort_date,
            cs.cohort_size,
            rc.unit_since_signup,
            rc.returning_users
        FROM cohort_sizes cs
        LEFT JOIN retention_counts rc ON cs.cohort_date = rc.cohort_date
        ORDER BY cs.cohort_date DESC, rc.unit_since_signup ASC
    """

    # ── Bracket milestone query (cumulative per-milestone counts) ─────────────
    # Generates: MAX(CASE WHEN unit_since_signup BETWEEN 1 AND m THEN 1 ELSE 0 END) AS hit_m
    case_exprs = ",\n            ".join(
        f"MAX(CASE WHEN ca.unit_since_signup BETWEEN 1 AND {m} THEN 1 ELSE 0 END) AS hit_{m}"
        for m in milestones
    )
    sum_exprs = ", ".join(f"SUM(hit_{m}) AS cnt_{m}" for m in milestones)

    bracket_query = f"""
        WITH first_seen AS (
            SELECT
                user_id,
                MIN({day_col}) AS first_seen
            FROM events
            {filter_where}
            GROUP BY user_id
        ),
        signups AS (
            SELECT user_id, first_seen AS cohort_date
            FROM first_seen
            {cohort_date_where}
        ),
        user_activity AS (
            SELECT DISTINCT
                user_id,
                {date_trunc("day", "timestamp", dialect)} AS activity_date
            FROM events
            {filter_where}
        ),
        cohort_activity AS (
            SELECT
                s.user_id,
                s.cohort_date,
                {unit_expr} AS unit_since_signup
            FROM signups s
            LEFT JOIN user_activity a ON s.user_id = a.user_id
            WHERE a.activity_date >= s.cohort_date
        ),
        milestone_flags AS (
            SELECT
                s.cohort_date,
                s.user_id,
                {case_exprs}
            FROM signups s
            LEFT JOIN cohort_activity ca
                ON s.user_id = ca.user_id AND s.cohort_date = ca.cohort_date
            GROUP BY s.cohort_date, s.user_id
        )
        SELECT cohort_date, {sum_exprs}
        FROM milestone_flags
        GROUP BY cohort_date
        ORDER BY cohort_date DESC
    """

    series_rows = db.execute(series_query, params)
    bracket_rows = db.execute(bracket_query, params)

    # ── Build bracket lookup: cohort_date → {milestone: count} ───────────────
    bracket_lookup: dict[str, dict[int, int]] = {}
    for brow in bracket_rows:
        raw_date = brow[0]
        key = raw_date.isoformat() if isinstance(raw_date, datetime) else str(raw_date)
        bracket_lookup[key] = {
            m: int(brow[i + 1] or 0) for i, m in enumerate(milestones)
        }

    # ── Aggregate series rows into per-cohort dicts ───────────────────────────
    cohorts: dict = {}
    for row in series_rows:
        raw_date, cohort_size, unit, count = row
        key = raw_date.isoformat() if isinstance(raw_date, datetime) else str(raw_date)
        if key not in cohorts:
            cohorts[key] = {"cohort_size": int(cohort_size), "units": {}}
        if unit is not None and count is not None:
            cohorts[key]["units"][int(unit)] = int(count)

    def safe_pct(count: int, total: int) -> float:
        return round((count / total) * 100, 1) if total > 0 else 0.0

    today = date_type.today()

    def is_reached(cohort_date_str: str, milestone: int) -> bool:
        """True if enough time has passed for this cohort to have reached the milestone."""
        d = date_type.fromisoformat(cohort_date_str[:10])
        if gran in ("month", "quarter", "year"):
            # Use calendar months to match SQL's date_diff_months arithmetic
            month_diff = (today.year - d.year) * 12 + (today.month - d.month)
            if gran == "month":
                return month_diff >= milestone
            elif gran == "quarter":
                return month_diff >= milestone * 3
            else:  # year
                return month_diff >= milestone * 12
        else:
            # day/week: floor division matches SQL's FLOOR(days / unit_divisor)
            return (today - d).days >= milestone * unit_divisor

    data = []
    for cohort_date_str, info in cohorts.items():
        cohort_size = info["cohort_size"]
        units_data = info["units"]
        bracket_data = bracket_lookup.get(cohort_date_str, {})

        def unit_pct(
            u: int, _units_data: dict = units_data, _cohort_size: int = cohort_size
        ) -> float:
            count = _units_data.get(u, _cohort_size if u == 0 else 0)
            return safe_pct(count, _cohort_size)

        retention_series = [unit_pct(u) for u in range(max_units + 1)]

        milestone_values: list[float | None] = []
        for m in milestones:
            if not is_reached(cohort_date_str, m):
                milestone_values.append(None)
            else:
                milestone_values.append(safe_pct(bracket_data.get(m, 0), cohort_size))

        data.append(
            {
                "cohort_date": cohort_date_str,
                "cohort_size": cohort_size,
                "retention_series": retention_series,
                "milestone_values": milestone_values,
            }
        )

    return {
        "sql": interpolate_sql(series_query, params),
        "granularity": gran,
        "milestones": milestones,
        "total_available_cohorts": len(data),
        "data": data,
    }
