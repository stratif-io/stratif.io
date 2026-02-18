"""Pivot table API endpoint."""

import json
from datetime import datetime
from typing import Optional, List
from enum import Enum

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from openflow.services import get_analytics_db
from openflow.services.sql_builder import date_trunc, extract_hour, extract_day_of_week

router = APIRouter(prefix="/api", tags=["pivot"])


class MeasureType(str, Enum):
    COUNT = "count"
    UNIQUE_USERS = "unique_users"


class Measure(BaseModel):
    type: MeasureType
    alias: str


# Universal dimensions available regardless of connection schema config
AVAILABLE_DIMENSIONS = {
    "event_name": "Event Name",
    "date": "Date",
    "hour": "Hour of Day",
    "day_of_week": "Day of Week",
    "user_id": "User ID",
}


@router.get("/pivot/options")
def get_pivot_options(
    db=Depends(get_analytics_db),
) -> dict:
    """Get available dimensions, measures, and filter options for pivot table."""
    events = db.execute("SELECT DISTINCT event_name FROM events ORDER BY event_name")

    custom_props = db.get_custom_properties()
    custom_dimensions = {p["name"]: p["name"].replace("_", " ").title() for p in custom_props}
    dimensions = {**AVAILABLE_DIMENSIONS, **custom_dimensions}

    filter_options = db.get_filter_options()

    return {
        "dimensions": [{"value": k, "label": v} for k, v in dimensions.items()],
        "measures": [
            {"value": "count", "label": "Event Count"},
            {"value": "unique_users", "label": "Unique Users"},
        ],
        "event_names": [row[0] for row in events],
        **filter_options,
    }


@router.get("/pivot")
def get_pivot(
    row_dimensions: str = Query("", description="Comma-separated list of row dimensions (optional)"),
    column_dimensions: str = Query("", description="Comma-separated list of column dimensions (optional)"),
    measures: str = Query(..., description="Comma-separated list of measures (count, unique_users)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    event_filter: Optional[str] = Query(None, description="Filter by event name"),
    filters: Optional[str] = Query(None, description='JSON dict of active dimension filters'),
    db=Depends(get_analytics_db),
) -> dict:
    """Get pivot table data with flexible row/column dimensions and measures."""
    dialect = db.get_dialect()
    row_dims = [d.strip() for d in row_dimensions.split(",") if d.strip()]
    col_dims = [d.strip() for d in column_dimensions.split(",") if d.strip()]
    measure_list = [m.strip() for m in measures.split(",") if m.strip()]

    if not measure_list:
        return {"error": "At least one measure is required", "data": []}

    custom_props = db.get_custom_properties()
    custom_prop_exprs = db.get_custom_prop_exprs()
    valid_dims = set(AVAILABLE_DIMENSIONS.keys()) | {p["name"] for p in custom_props}

    invalid_row_dims = [d for d in row_dims if d not in valid_dims]
    invalid_col_dims = [d for d in col_dims if d not in valid_dims]
    if invalid_row_dims:
        return {"error": f"Invalid row dimensions: {invalid_row_dims}", "data": []}
    if invalid_col_dims:
        return {"error": f"Invalid column dimensions: {invalid_col_dims}", "data": []}

    valid_measures = {"count", "unique_users"}
    invalid_measures = [m for m in measure_list if m not in valid_measures]
    if invalid_measures:
        return {"error": f"Invalid measures: {invalid_measures}", "data": []}

    where_clauses = []
    params = []

    if start_date:
        where_clauses.append("timestamp >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        where_clauses.append("timestamp <= ?")
        params.append(f"{end_date} 23:59:59")
    if event_filter:
        where_clauses.append("event_name = ?")
        params.append(event_filter)
    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        where_clauses.extend(filter_clauses)
        params.extend(filter_params)

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    def get_dimension_expr(dim: str) -> str:
        if dim == "event_name":
            return "event_name"
        if dim == "date":
            return date_trunc("day", "timestamp", dialect)
        if dim == "hour":
            return extract_hour("timestamp", dialect)
        if dim == "day_of_week":
            return extract_day_of_week("timestamp", dialect)
        if dim == "user_id":
            return "user_id"
        if dim in custom_prop_exprs:
            return custom_prop_exprs[dim]
        return f'"{dim}"'

    def get_measure_expr(measure: str) -> str:
        if measure == "count":
            return "COUNT(*)"
        if measure == "unique_users":
            return "COUNT(DISTINCT user_id)"
        return "COUNT(*)"

    all_dims = row_dims + col_dims
    select_parts = [f"{get_dimension_expr(dim)} AS {dim}" for dim in all_dims]
    select_parts += [f"{get_measure_expr(m)} AS {m}" for m in measure_list]
    select_clause = ", ".join(select_parts)

    if all_dims:
        group_by_exprs = [get_dimension_expr(dim) for dim in all_dims]
        group_by_clause = "GROUP BY " + ", ".join(group_by_exprs)
        order_by_clause = f"ORDER BY {measure_list[0]} DESC"
    else:
        group_by_clause = ""
        order_by_clause = ""

    query = f"""
        SELECT {select_clause}
        FROM events
        {where_clause}
        {group_by_clause}
        {order_by_clause}
    """
    result = db.execute(query, params)

    data = []
    for row in result:
        record: dict = {}
        for i, dim in enumerate(all_dims):
            val = row[i]
            record[dim] = val.isoformat() if isinstance(val, datetime) else val
        for i, measure in enumerate(measure_list):
            record[measure] = row[len(all_dims) + i]
        data.append(record)

    if not col_dims:
        return {
            "dimensions": row_dims,
            "column_dimensions": [],
            "measures": measure_list,
            "data": data,
            "pivoted": False,
        }

    # Pivot when column dimensions are requested
    column_values: dict = {}
    for record in data:
        col_key = tuple(record[dim] for dim in col_dims)
        column_values.setdefault(col_key, True)

    pivoted_data: List[dict] = []
    if row_dims:
        row_groups: dict = {}
        for record in data:
            row_key = tuple(record[dim] for dim in row_dims)
            col_key = tuple(record[dim] for dim in col_dims)
            row_groups.setdefault(row_key, {})[col_key] = {m: record[m] for m in measure_list}

        for row_key, col_data in row_groups.items():
            pivoted_row: dict = {row_dims[i]: row_key[i] for i in range(len(row_dims))}
            for col_key in sorted(column_values.keys()):
                col_label = "_".join(str(v) for v in col_key)
                for measure in measure_list:
                    pivoted_row[f"{col_label}_{measure}"] = (
                        col_data[col_key][measure] if col_key in col_data else 0
                    )
            pivoted_data.append(pivoted_row)
    else:
        col_data = {
            tuple(record[dim] for dim in col_dims): {m: record[m] for m in measure_list}
            for record in data
        }
        pivoted_row = {}
        for col_key in sorted(column_values.keys()):
            col_label = "_".join(str(v) for v in col_key)
            for measure in measure_list:
                pivoted_row[f"{col_label}_{measure}"] = (
                    col_data[col_key][measure] if col_key in col_data else 0
                )
        pivoted_data.append(pivoted_row)

    column_headers = [
        {col_dims[i]: col_key[i] for i in range(len(col_dims))}
        for col_key in sorted(column_values.keys())
    ]

    return {
        "dimensions": row_dims,
        "column_dimensions": col_dims,
        "column_headers": column_headers,
        "measures": measure_list,
        "data": pivoted_data,
        "pivoted": True,
    }
