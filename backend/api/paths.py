"""Paths API endpoints."""

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from backend.core.auth import get_current_user
from backend.services import generate_path_analysis_query, get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.validators import interpolate_sql, parse_date, to_sql_datetime
from backend.services.views import path_analysis_ctes

router = APIRouter(
    prefix="/api", tags=["paths"], dependencies=[Depends(get_current_user)]
)


@router.get("/paths")
def get_paths(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    target_event: str = Query(..., description="Target event to analyze paths to"),
    device_type: str | None = Query(
        None, description="Filter by device type (Mobile/Desktop)"
    ),
    limit: int = Query(5, description="Number of top paths to return", ge=1, le=20),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
) -> dict:
    """Get popular paths leading to a target event.

    Returns the most common 3-event sequences that preceded the target.
    Uses dialect-aware CTEs so it works on DuckDB and SQLite.
    """
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    where_clauses = ["target_event = ?"]
    params = [target_event]

    if device_type:
        where_clauses.append("device_type = ?")
        params.append(device_type)

    date_subquery = ""
    date_params: list = []
    if start_date or end_date:
        date_conditions = []
        if start_date:
            date_conditions.append("timestamp >= ?")
            date_params.append(to_sql_datetime(start_date, "00:00:00"))
        if end_date:
            date_conditions.append("timestamp <= ?")
            date_params.append(to_sql_datetime(end_date, "23:59:59"))
        date_filter = " AND ".join(date_conditions)
        date_subquery = (
            f"AND user_id IN (SELECT DISTINCT user_id FROM events WHERE {date_filter})"
        )

    where_clause = " AND ".join(where_clauses) + date_subquery
    params = params + date_params

    timeout = db.get_session_timeout_minutes()
    dialect = db.get_dialect()
    ctes = path_analysis_ctes(
        timeout, dialect, device_type_expr=db.get_device_type_expr()
    )

    query = f"""
        WITH {ctes}
        SELECT
            COALESCE(step_minus_3, 'Start') AS step_3,
            COALESCE(step_minus_2, 'Start') AS step_2,
            COALESCE(step_minus_1, 'Start') AS step_1,
            target_event,
            device_type,
            COUNT(*) AS path_count
        FROM derived_path_analysis
        WHERE {where_clause}
        GROUP BY step_minus_3, step_minus_2, step_minus_1, target_event, device_type
        ORDER BY path_count DESC
        LIMIT {limit}
    """
    result = db.execute(query, params)

    total_query = f"""
        WITH {ctes}
        SELECT COUNT(*) FROM derived_path_analysis WHERE {where_clause}
    """
    total = db.execute(total_query, params)[0][0]

    return {
        "sql": [interpolate_sql(query, params), interpolate_sql(total_query, params)],
        "target_event": target_event,
        "device_type": device_type,
        "total_occurrences": total,
        "data": [
            {
                "path": f"{row[0]} → {row[1]} → {row[2]} → {row[3]}",
                "step_3": row[0],
                "step_2": row[1],
                "step_1": row[2],
                "target": row[3],
                "device_type": row[4],
                "count": row[5],
                "percentage": round((row[5] / total) * 100, 1) if total > 0 else 0,
            }
            for row in result
        ],
    }


@router.get("/path-analysis")
def get_path_analysis(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_event: str | None = Query(None, description="Event paths must start with"),
    end_event: str | None = Query(None, description="Event paths must end with"),
    min_path_length: int = Query(
        2, description="Minimum number of events in path", ge=2, le=20
    ),
    max_path_length: int = Query(
        5, description="Maximum number of events in path", ge=2, le=20
    ),
    max_time_between_events: int | None = Query(
        None, description="Maximum time between events", ge=1
    ),
    time_unit: str = Query("seconds", description="Unit for max_time_between_events"),
    top_n: int = Query(10, description="Number of top paths to return", ge=1, le=100),
    group_by: str = Query(
        "user_id", description="Group paths by user_id or session_id"
    ),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
    event_filters: str | None = Query(None, description="JSON string of event filters"),
) -> dict[str, Any]:
    """Analyze user paths through events.

    Works on all supported database engines. DuckDB uses a fast array-based strategy;
    other engines use a portable self-join strategy (median_time_to_complete is NULL
    for non-DuckDB connections, and paths are always session-scoped).
    """
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    if max_path_length < min_path_length:
        return {"error": "max_path_length must be >= min_path_length", "data": []}
    if group_by not in ("user_id", "session_id"):
        return {"error": "group_by must be 'user_id' or 'session_id'", "data": []}
    if time_unit not in ("seconds", "minutes", "hours", "days"):
        return {
            "error": "time_unit must be one of: seconds, minutes, hours, days",
            "data": [],
        }

    date_range: tuple[str, str] | None = None
    if start_date and end_date:
        date_range = (start_date, end_date)
    elif start_date:
        date_range = (start_date, start_date)
    elif end_date:
        date_range = (end_date, end_date)

    parsed_event_filters: dict[str, dict[str, Any]] | None = None
    if event_filters:
        try:
            parsed_event_filters = json.loads(event_filters)
        except json.JSONDecodeError:
            return {"error": "Invalid JSON in event_filters parameter", "data": []}

    extra_clauses: list[str] = []
    extra_params: list = []
    if filters:
        filter_clauses, filter_values = db.build_filter_clauses(json.loads(filters))
        extra_clauses.extend(filter_clauses)
        extra_params.extend(filter_values)

    query = generate_path_analysis_query(
        table_name="events",
        start_event=start_event,
        end_event=end_event,
        event_filters=parsed_event_filters,
        max_time_between_events=max_time_between_events,
        time_unit=time_unit,
        min_path_length=min_path_length,
        max_path_length=max_path_length,
        top_n=top_n,
        group_by=group_by,
        date_range=date_range,
        sql_dialect=db.get_dialect(),
        return_type="string",
        extra_where_conditions=extra_clauses or None,
        session_timeout_minutes=db.get_session_timeout_minutes(),
    )

    query_str = str(query) if query is not None else ""
    result = db.execute(query_str, extra_params or None)

    data = [
        {
            "path": row[0],
            "path_length": row[1],
            "occurrence_count": row[2],
            "unique_users": row[3],
            "unique_sessions": row[4],
            "percentage_of_total": row[5],
            "avg_time_to_complete": row[6] if len(row) > 6 else None,
            "median_time_to_complete": row[7] if len(row) > 7 else None,
        }
        for row in result
    ]

    return {
        "sql": interpolate_sql(query_str, extra_params or []),
        "start_event": start_event,
        "end_event": end_event,
        "min_path_length": min_path_length,
        "max_path_length": max_path_length,
        "max_time_between_events": max_time_between_events,
        "time_unit": time_unit,
        "group_by": group_by,
        "date_range": date_range,
        "event_filters": parsed_event_filters,
        "total_paths": len(data),
        "data": data,
    }


@router.get("/path-funnel")
def get_path_funnel(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    events: str = Query(
        ..., description="Comma-separated list of events in the funnel"
    ),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    device_type: str | None = Query(
        None, description="Filter by device type (Mobile/Desktop)"
    ),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
) -> dict[str, Any]:
    """Calculate conversion funnel for a specific sequence of events.

    Users must complete events in the EXACT order specified.
    Uses parameterised queries for all user-supplied scalar values.
    """
    start_date = parse_date(start_date)
    end_date = parse_date(end_date)
    event_list = [e.strip() for e in events.split(",") if e.strip()]
    if len(event_list) < 2:
        return {"error": "At least 2 events are required for a funnel", "data": []}

    # Date / device / dimension filters are collected as (clause, param) pairs
    # so that all values go through parameterised binding — never inline SQL.
    filter_clauses: list[str] = []
    filter_params: list = []

    if start_date:
        filter_clauses.append("timestamp >= ?")
        filter_params.append(to_sql_datetime(start_date, "00:00:00"))
    if end_date:
        filter_clauses.append("timestamp <= ?")
        filter_params.append(to_sql_datetime(end_date, "23:59:59"))
    if device_type:
        filter_clauses.append("device_type = ?")
        filter_params.append(device_type)
    if filters:
        dim_clauses, dim_params = db.build_filter_clauses(json.loads(filters))
        filter_clauses.extend(dim_clauses)
        filter_params.extend(dim_params)

    extra_sql = (" AND " + " AND ".join(filter_clauses)) if filter_clauses else ""

    cte_parts: list[str] = []
    step_cte_names: list[str] = []
    # All params accumulated for the funnel query (each step re-uses filter_params)
    all_params: list = []

    for i, event_name in enumerate(event_list):
        if i == 0:
            cte_name = f"step{i}"
            cte_parts.append(f"""
            {cte_name} AS (
                SELECT user_id, MIN(timestamp) AS t{i}
                FROM events
                WHERE event_name = ?{extra_sql}
                GROUP BY user_id
            )""")
            all_params.append(event_name)
            all_params.extend(filter_params)
            step_cte_names.append(cte_name)
        else:
            prev_cte = step_cte_names[-1]
            cte_name = f"step{i}"
            prev_time_selects = ", ".join(f"prev.t{j}" for j in range(i))
            prev_time_groups = ", ".join(f"prev.t{j}" for j in range(i))
            cte_parts.append(f"""
            {cte_name} AS (
                SELECT
                    prev.user_id,
                    {(prev_time_selects + ", ") if prev_time_selects else ""}MIN(e.timestamp) AS t{i}
                FROM {prev_cte} prev
                JOIN events e ON prev.user_id = e.user_id
                WHERE e.event_name = ?
                    AND e.timestamp >= prev.t{i - 1}{extra_sql}
                GROUP BY prev.user_id{(", " + prev_time_groups) if prev_time_groups else ""}
            )""")
            all_params.append(event_name)
            all_params.extend(filter_params)
            step_cte_names.append(cte_name)

    count_selects = [
        f"(SELECT COUNT(*) FROM {step_cte_names[i]}) AS step{i}_users"
        for i in range(len(event_list))
    ]
    funnel_query = f"WITH {', '.join(cte_parts)} SELECT {', '.join(count_selects)}"
    result = db.execute(funnel_query, all_params)[0]

    occ_query = f"SELECT COUNT(*) FROM events WHERE event_name = ?{extra_sql}"
    occurrences_results = []
    for event_name in event_list:
        occ_params: list = [event_name] + filter_params
        occ_result = db.execute(occ_query, occ_params)
        occurrences_results.append(occ_result[0][0] if occ_result else 0)

    steps_data: list[dict] = []
    for i, event_name in enumerate(event_list):
        users = result[i] if result[i] else 0
        occurrences = occurrences_results[i]
        step_conversion_rate = 100.0
        overall_conversion_rate = 100.0
        prev_users = steps_data[-1]["users"] if steps_data else None

        if prev_users is not None and prev_users > 0:
            step_conversion_rate = round((users / prev_users) * 100, 2)
        if i > 0 and steps_data:
            first_step_users = steps_data[0]["users"]
            if first_step_users > 0:
                overall_conversion_rate = round((users / first_step_users) * 100, 2)

        dropoff_rate = (
            round(100 - step_conversion_rate, 2) if prev_users is not None else 0
        )
        dropoff_users = prev_users - users if prev_users is not None else 0

        steps_data.append(
            {
                "step": i + 1,
                "event": event_name,
                "occurrences": occurrences,
                "users": users,
                "step_conversion_rate": step_conversion_rate,
                "overall_conversion_rate": overall_conversion_rate,
                "dropoff_rate": dropoff_rate,
                "dropoff_users": dropoff_users,
            }
        )

    return {
        "sql": [
            interpolate_sql(funnel_query, all_params),
            interpolate_sql(occ_query, occ_params),
        ],
        "events": event_list,
        "total_steps": len(event_list),
        "data": steps_data,
    }
