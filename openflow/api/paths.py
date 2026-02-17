"""Paths API endpoints."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Query

from openflow.core import verify_api_key
from openflow.db import get_db, Database
from openflow.services import transpile_sql, generate_path_analysis_query

router = APIRouter(prefix="/api", tags=["paths"])


@router.get("/paths")
def get_paths(
    target_event: str = Query(..., description="Target event to analyze paths to"),
    device_type: Optional[str] = Query(
        None, description="Filter by device type (Mobile/Desktop)"
    ),
    limit: int = Query(5, description="Number of top paths to return", ge=1, le=20),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """
    Get popular paths leading to a target event.
    Returns the most common 3-event sequences that preceded the target.
    """
    # Build WHERE clause
    where_clauses = ["target_event = ?"]
    params = [target_event]

    if device_type:
        where_clauses.append("device_type = ?")
        params.append(device_type)

    # Date filters
    date_subquery = ""
    date_params = []
    if start_date or end_date:
        date_conditions = []
        if start_date:
            date_conditions.append("timestamp >= ?")
            date_params.append(f"{start_date} 00:00:00")
        if end_date:
            date_conditions.append("timestamp <= ?")
            date_params.append(f"{end_date} 23:59:59")
        date_filter = " AND ".join(date_conditions)
        date_subquery = f"""AND user_id IN (
            SELECT DISTINCT user_id FROM events WHERE {date_filter}
        )"""

    where_clause = " AND ".join(where_clauses) + date_subquery
    params = params + date_params

    query = transpile_sql(f"""
        SELECT 
            COALESCE(step_minus_3, 'Start') as step_3,
            COALESCE(step_minus_2, 'Start') as step_2,
            COALESCE(step_minus_1, 'Start') as step_1,
            target_event,
            device_type,
            COUNT(*) as path_count
        FROM derived_path_analysis
        WHERE {where_clause}
        GROUP BY step_minus_3, step_minus_2, step_minus_1, target_event, device_type
        ORDER BY path_count DESC
        LIMIT ?
    """)
    params.append(str(limit))

    result = db.execute(query, params)

    # Get total count for this target event
    total_query = transpile_sql(f"""
        SELECT COUNT(*) 
        FROM derived_path_analysis 
        WHERE {where_clause}
    """)
    total = db.execute(total_query, params[:-1])[0][0]

    return {
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
    start_event: Optional[str] = Query(None, description="Event paths must start with"),
    end_event: Optional[str] = Query(None, description="Event paths must end with"),
    min_path_length: int = Query(
        2, description="Minimum number of events in path", ge=2, le=20
    ),
    max_path_length: int = Query(
        5, description="Maximum number of events in path", ge=2, le=20
    ),
    max_time_between_events: Optional[int] = Query(
        None, description="Maximum time between consecutive events", ge=1
    ),
    time_unit: str = Query(
        "seconds",
        description="Unit for max_time_between_events: seconds, minutes, hours, days",
    ),
    top_n: int = Query(10, description="Number of top paths to return", ge=1, le=100),
    group_by: str = Query(
        "user_id", description="Group paths by user_id or session_id"
    ),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    country: Optional[str] = Query(None, description="Filter by country"),
    browser: Optional[str] = Query(None, description="Filter by browser"),
    event_filters: Optional[str] = Query(
        None,
        description='JSON string of event filters, e.g. {"page_view": {"category": "electronics"}}',
    ),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> Dict[str, Any]:
    """
    Analyze user paths through events.

    Returns the most common event sequences (paths) taken by users,
    with optional filtering by start/end events, time constraints, and date range.

    Event filters format (JSON string):
    {
        "event_name": {"property": "value", "property_gt": 100},
        "other_event": {"category_in": ["a", "b"]}
    }

    Supported filter operators: _gt, _lt, _gte, _lte, _in, _like
    """
    if max_path_length < min_path_length:
        return {
            "error": "max_path_length must be >= min_path_length",
            "data": [],
        }

    if group_by not in ("user_id", "session_id"):
        return {
            "error": "group_by must be 'user_id' or 'session_id'",
            "data": [],
        }

    if time_unit not in ("seconds", "minutes", "hours", "days"):
        return {
            "error": "time_unit must be one of: seconds, minutes, hours, days",
            "data": [],
        }

    date_range: Optional[Tuple[str, str]] = None
    if start_date and end_date:
        date_range = (start_date, end_date)
    elif start_date:
        date_range = (start_date, start_date)
    elif end_date:
        date_range = (end_date, end_date)

    parsed_event_filters: Optional[Dict[str, Dict[str, Any]]] = None
    if event_filters:
        try:
            parsed_event_filters = json.loads(event_filters)
        except json.JSONDecodeError:
            return {
                "error": "Invalid JSON in event_filters parameter",
                "data": [],
            }

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
        sql_dialect="duckdb",
        return_type="string",
        country=country,
        browser=browser,
    )

    query_str = str(query) if query is not None else ""
    result = db.execute(query_str)

    data = []
    for row in result:
        data.append(
            {
                "path": row[0],
                "path_length": row[1],
                "occurrence_count": row[2],
                "unique_users": row[3],
                "percentage_of_total": row[4],
                "avg_time_to_complete": row[5] if len(row) > 5 else None,
                "median_time_to_complete": row[6] if len(row) > 6 else None,
            }
        )

    return {
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
    events: str = Query(
        ..., description="Comma-separated list of events in the funnel"
    ),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    device_type: Optional[str] = Query(
        None, description="Filter by device type (Mobile/Desktop)"
    ),
    country: Optional[str] = Query(None, description="Filter by country"),
    browser: Optional[str] = Query(None, description="Filter by browser"),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> Dict[str, Any]:
    """
    Calculate conversion funnel for a specific sequence of events.

    Users must complete events in the EXACT order specified.
    For each step, finds the FIRST occurrence AFTER the previous step's timestamp.
    Intermediate events between steps are allowed.
    """
    event_list = [e.strip() for e in events.split(",") if e.strip()]

    if len(event_list) < 2:
        return {
            "error": "At least 2 events are required for a funnel",
            "data": [],
        }

    date_filter = ""
    if start_date:
        date_filter += f" AND timestamp >= '{start_date} 00:00:00'"
    if end_date:
        date_filter += f" AND timestamp <= '{end_date} 23:59:59'"

    device_filter = ""
    if device_type:
        device_filter = f" AND device_type = '{device_type}'"
    if country:
        device_filter += f" AND json_extract_string(properties, 'country') = '{country}'"
    if browser:
        device_filter += f" AND json_extract_string(properties, 'browser') = '{browser}'"

    # Build sequential CTEs for each step
    # Step 1: Find first occurrence of event[0] for each user
    # Step 2: Find first occurrence of event[1] AFTER step 1's timestamp
    # Step 3: Find first occurrence of event[2] AFTER step 2's timestamp
    # etc.

    cte_parts = []
    step_cte_names = []

    for i, event_name in enumerate(event_list):
        if i == 0:
            # First step: find first occurrence of the first event
            cte_name = f"step{i}"
            cte_parts.append(f"""
            {cte_name} AS (
                SELECT
                    user_id,
                    MIN(timestamp) as t{i}
                FROM events
                WHERE event_name = '{event_name}'{date_filter}{device_filter}
                GROUP BY user_id
            )""")
            step_cte_names.append(cte_name)
        else:
            # Subsequent steps: find first occurrence after previous step
            prev_cte = step_cte_names[-1]
            cte_name = f"step{i}"
            # Select all previous timestamps from prev_cte, plus new timestamp
            prev_time_selects = ", ".join([f"prev.t{j}" for j in range(i)])
            prev_time_groups = ", ".join([f"prev.t{j}" for j in range(i)])
            cte_parts.append(f"""
            {cte_name} AS (
                SELECT 
                    prev.user_id,
                    {prev_time_selects + ", " if prev_time_selects else ""}MIN(e.timestamp) as t{i}
                FROM {prev_cte} prev
                JOIN events e ON prev.user_id = e.user_id
                    AND e.event_name = '{event_name}'
                    AND e.timestamp > prev.t{i - 1}{date_filter}{device_filter}
                GROUP BY prev.user_id{", " + prev_time_groups if prev_time_groups else ""}
            )""")
            step_cte_names.append(cte_name)

    # Build the final query to count users at each step
    count_selects = []
    for i in range(len(event_list)):
        count_selects.append(
            f"(SELECT COUNT(*) FROM {step_cte_names[i]}) as step{i}_users"
        )

    funnel_query = f"""
        WITH {", ".join(cte_parts)}
        SELECT {", ".join(count_selects)}
    """

    result = db.execute(funnel_query)[0]

    # Get occurrences for each event (total times the event occurred)
    occurrences_results = []
    for i, event_name in enumerate(event_list):
        occ_query = f"""
            SELECT COUNT(*) as occurrences
            FROM events
            WHERE event_name = '{event_name}'{date_filter}{device_filter}
        """
        occ_result = db.execute(occ_query)
        occurrences_results.append(occ_result[0][0] if occ_result else 0)

    # Build steps data
    steps_data = []

    for i, event_name in enumerate(event_list):
        users = result[i] if result[i] else 0
        occurrences = occurrences_results[i]

        overall_conversion_rate = 100.0
        step_conversion_rate = 100.0
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
        "events": event_list,
        "total_steps": len(event_list),
        "data": steps_data,
    }
