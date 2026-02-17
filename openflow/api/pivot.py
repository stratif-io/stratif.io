"""Pivot table API endpoint."""

import json
from datetime import datetime
from typing import Optional, List
from enum import Enum

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from openflow.services import transpile_sql, get_analytics_db

router = APIRouter(prefix="/api", tags=["pivot"])


class MeasureType(str, Enum):
    COUNT = "count"
    UNIQUE_USERS = "unique_users"


class Measure(BaseModel):
    type: MeasureType
    alias: str



AVAILABLE_DIMENSIONS = {
    "event_name": "Event Name",
    "date": "Date",
    "hour": "Hour of Day",
    "day_of_week": "Day of Week",
    "user_id": "User ID",
    "country": "Country",
    "city": "City",
    "device_type": "Device Type",
    "browser": "Browser",
    "os": "Operating System",
    "referrer": "Referrer",
    "product_category": "Product Category",
    "product_name": "Product Name",
}


@router.get("/pivot/options")
def get_pivot_options(
    db=Depends(get_analytics_db),
) -> dict:
    """Get available dimensions, measures, and filter options for pivot table."""

    events = db.execute("SELECT DISTINCT event_name FROM events ORDER BY event_name")

    # Merge static dimensions with dynamic filter fields from the active connection
    dynamic_dimensions = {ff["field"]: ff["label"] for ff in db.get_filter_fields()}
    dimensions = {**AVAILABLE_DIMENSIONS, **dynamic_dimensions}

    # Build filter options dynamically from connection filter config
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
    """
    Get pivot table data with flexible row/column dimensions and measures.

    Row Dimensions (optional): Shown as table rows
    Column Dimensions (optional): Shown as table columns
    Available: event_name, date, hour, day_of_week, user_id, country, city,
              device_type, browser, os, referrer, product_category, product_name

    Measures (required): count, unique_users
    """
    row_dims = [d.strip() for d in row_dimensions.split(",") if d.strip()]
    col_dims = [d.strip() for d in column_dimensions.split(",") if d.strip()]
    measure_list = [m.strip() for m in measures.split(",") if m.strip()]

    if not measure_list:
        return {"error": "At least one measure is required", "data": []}

    valid_dims = set(AVAILABLE_DIMENSIONS.keys())
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

    # Build filter_exprs from the active connection for dynamic dimension resolution
    raw_filter_exprs: dict = getattr(db, '_filter_exprs', {})
    connection_filter_exprs = {
        ff["field"]: raw_filter_exprs.get(ff["field"], f'"{ff["field"]}"')
        for ff in db.get_filter_fields()
    }

    def get_dimension_expr(dim: str) -> str:
        if dim == "event_name":
            return "event_name"
        elif dim == "date":
            return "DATE(timestamp)"
        elif dim == "hour":
            return "EXTRACT(HOUR FROM timestamp)::INTEGER"
        elif dim == "day_of_week":
            return "EXTRACT(DAYOFWEEK FROM timestamp)::INTEGER"
        elif dim == "user_id":
            return "user_id"
        elif dim in connection_filter_exprs:
            return connection_filter_exprs[dim]
        elif dim in ("city", "device_type", "os", "referrer", "product_category", "product_name"):
            return f"json_extract_string(properties, '{dim}')"
        return f'"{dim}"'

    def get_measure_expr(measure: str) -> str:
        if measure == "count":
            return "COUNT(*)"
        elif measure == "unique_users":
            return "COUNT(DISTINCT user_id)"
        return "COUNT(*)"

    # Build SELECT clause with all dimensions (rows + columns) and measures
    all_dims = row_dims + col_dims
    select_parts = []

    for dim in all_dims:
        expr = get_dimension_expr(dim)
        select_parts.append(f"{expr} as {dim}")

    for measure in measure_list:
        expr = get_measure_expr(measure)
        select_parts.append(f"{expr} as {measure}")

    select_clause = ", ".join(select_parts)

    # Build GROUP BY clause if any dimensions are selected
    if all_dims:
        group_by_parts = [get_dimension_expr(dim) for dim in all_dims]
        group_by_clause = "GROUP BY " + ", ".join(group_by_parts)
        order_by_clause = f"ORDER BY {measure_list[0]} DESC"
    else:
        group_by_clause = ""
        order_by_clause = ""

    query = transpile_sql(f"""
        SELECT {select_clause}
        FROM events
        {where_clause}
        {group_by_clause}
        {order_by_clause}
    """)

    result = db.execute(query, params)

    # Parse results
    data = []
    for row in result:
        record = {}
        for i, dim in enumerate(all_dims):
            val = row[i]
            if isinstance(val, datetime):
                record[dim] = val.isoformat()
            else:
                record[dim] = val
        for i, measure in enumerate(measure_list):
            record[measure] = row[len(all_dims) + i]
        data.append(record)

    # If no column dimensions, return as-is (simple table)
    if not col_dims:
        return {
            "dimensions": row_dims,
            "column_dimensions": [],
            "measures": measure_list,
            "data": data,
            "pivoted": False,
        }

    # If column dimensions exist, pivot the data
    # Build column headers from unique combinations of column dimension values
    column_values = {}
    for record in data:
        col_key = tuple(record[dim] for dim in col_dims)
        if col_key not in column_values:
            column_values[col_key] = True

    # Create pivoted structure
    pivoted_data = []
    if row_dims:
        # Group by row dimensions
        row_groups = {}
        for record in data:
            row_key = tuple(record[dim] for dim in row_dims)
            if row_key not in row_groups:
                row_groups[row_key] = {}

            col_key = tuple(record[dim] for dim in col_dims)
            row_groups[row_key][col_key] = {m: record[m] for m in measure_list}

        # Build pivoted rows
        for row_key, col_data in row_groups.items():
            pivoted_row = {}
            # Add row dimensions
            for i, dim in enumerate(row_dims):
                pivoted_row[dim] = row_key[i]

            # Add measures for each column combination
            for col_key in sorted(column_values.keys()):
                col_label = "_".join(str(v) for v in col_key)
                if col_key in col_data:
                    for measure in measure_list:
                        pivoted_row[f"{col_label}_{measure}"] = col_data[col_key][measure]
                else:
                    for measure in measure_list:
                        pivoted_row[f"{col_label}_{measure}"] = 0

            pivoted_data.append(pivoted_row)
    else:
        # No row dimensions - single row with columns
        pivoted_row = {}
        col_data = {}
        for record in data:
            col_key = tuple(record[dim] for dim in col_dims)
            col_data[col_key] = {m: record[m] for m in measure_list}

        for col_key in sorted(column_values.keys()):
            col_label = "_".join(str(v) for v in col_key)
            if col_key in col_data:
                for measure in measure_list:
                    pivoted_row[f"{col_label}_{measure}"] = col_data[col_key][measure]
            else:
                for measure in measure_list:
                    pivoted_row[f"{col_label}_{measure}"] = 0

        pivoted_data.append(pivoted_row)

    # Build column headers
    column_headers = []
    for col_key in sorted(column_values.keys()):
        col_dict = {col_dims[i]: col_key[i] for i in range(len(col_dims))}
        column_headers.append(col_dict)

    return {
        "dimensions": row_dims,
        "column_dimensions": col_dims,
        "column_headers": column_headers,
        "measures": measure_list,
        "data": pivoted_data,
        "pivoted": True,
    }
