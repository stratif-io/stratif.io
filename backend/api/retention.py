"""Retention API endpoints."""

import json
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.core.auth import get_current_user
from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.sql_builder import date_diff_days, date_trunc
from backend.services.validators import parse_date, to_sql_datetime

router = APIRouter(prefix="/api", tags=["retention"], dependencies=[Depends(get_current_user)])

# ──────────────────────────────────────────────────────────────────────────────
# Configurable retention milestones per granularity
# ──────────────────────────────────────────────────────────────────────────────
RETENTION_CONFIG: dict[str, dict] = {
    "day": {
        "milestones": [1, 7, 14, 30, 90],  # days after cohort start
        "max_units": 90,  # build series through day 90
        "unit_divisor": 1,
    },
    "week": {
        "milestones": [1, 2, 3, 4, 12],  # weeks after cohort start
        "max_units": 12,
        "unit_divisor": 7,
    },
    "month": {
        "milestones": [1, 2, 3, 4, 5, 6],  # months after cohort start (30-day approx)
        "max_units": 6,
        "unit_divisor": 30,
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
    # Days difference expression (always in days — we convert to units in Python/SQL)
    days_diff = date_diff_days("s.cohort_date", "a.activity_date", dialect)

    # ── WHERE clauses ──────────────────────────────────────────────────────────
    cohort_clauses: list[str] = []
    cohort_params: list = []

    if start_date:
        cohort_clauses.append("timestamp >= ?")
        cohort_params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        cohort_clauses.append("timestamp <= ?")
        cohort_params.append(to_sql_datetime(end_date, "23:59:59"))

    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        cohort_clauses.extend(filter_clauses)
        cohort_params.extend(filter_params)

    cohort_where = ("WHERE " + " AND ".join(cohort_clauses)) if cohort_clauses else ""
    activity_where = ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""

    params = cohort_params + filter_params

    # unit expression: integer-divide days by unit_divisor so that SQL GROUP BY
    # collapses per-day rows into the right week/month bucket and COUNT DISTINCT
    # correctly handles users who returned multiple times within the same unit.

    query = f"""
        WITH signups AS (
            SELECT
                user_id,
                MIN({day_col}) AS cohort_date
            FROM events
            {cohort_where}
            GROUP BY user_id
        ),
        user_activity AS (
            SELECT DISTINCT
                user_id,
                {date_trunc("day", "timestamp", dialect)} AS activity_date
            FROM events
            {activity_where}
        ),
        cohort_activity AS (
            SELECT
                s.user_id,
                s.cohort_date,
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
                ca.cohort_date,
                FLOOR(ca.days_since_signup / {unit_divisor}) AS unit_since_signup,
                COUNT(DISTINCT ca.user_id) AS returning_users
            FROM cohort_activity ca
            JOIN cohort_sizes cs ON ca.cohort_date = cs.cohort_date
            GROUP BY ca.cohort_date, FLOOR(ca.days_since_signup / {unit_divisor})
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

    rows = db.execute(query, params)

    # ── Aggregate into per-cohort dicts (insertion order = DESC from SQL) ──────
    cohorts: dict = {}
    for row in rows:
        raw_date, cohort_size, unit, count = row
        key = raw_date.isoformat() if isinstance(raw_date, datetime) else str(raw_date)
        if key not in cohorts:
            cohorts[key] = {"cohort_size": int(cohort_size), "units": {}}
        if unit is not None and count is not None:
            cohorts[key]["units"][int(unit)] = int(count)

    def safe_pct(count: int, total: int) -> float:
        return round((count / total) * 100, 1) if total > 0 else 0.0

    data = []
    for cohort_date_str, info in cohorts.items():
        cohort_size = info["cohort_size"]
        units_data = info["units"]

        # Unit 0 defaults to cohort_size (user was active in their signup unit)
        def unit_pct(u: int, _units_data=units_data, _cohort_size=cohort_size) -> float:
            count = _units_data.get(u, _cohort_size if u == 0 else 0)
            return safe_pct(count, _cohort_size)

        # Always return the full series up to max_units — frontend decides what to show
        retention_series = [
            unit_pct(u, units_data, cohort_size) for u in range(max_units + 1)
        ]
        milestone_values = [unit_pct(m, units_data, cohort_size) for m in milestones]

        data.append(
            {
                "cohort_date": cohort_date_str,
                "cohort_size": cohort_size,
                "retention_series": retention_series,
                "milestone_values": milestone_values,
            }
        )

    return {
        "granularity": gran,
        "milestones": milestones,
        "total_available_cohorts": len(data),
        "data": data,
    }
