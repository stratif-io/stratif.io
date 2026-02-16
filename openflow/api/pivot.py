"""Pivot table API endpoint."""

from datetime import datetime
from typing import Optional, List
from enum import Enum

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from openflow.core import verify_api_key
from openflow.db import get_db, Database
from openflow.services import transpile_sql

router = APIRouter(prefix="/api", tags=["pivot"])


class MeasureType(str, Enum):
    COUNT = "count"
    UNIQUE_USERS = "unique_users"


class Measure(BaseModel):
    type: MeasureType
    alias: str


class PivotRequest(BaseModel):
    row_dimensions: List[str]
    measures: List[Measure]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    event_filter: Optional[str] = None
    country_filter: Optional[str] = None
    browser_filter: Optional[str] = None
    product_category_filter: Optional[str] = None


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
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """Get available dimensions, measures, and filter options for pivot table."""

    events = db.execute("SELECT DISTINCT event_name FROM events ORDER BY event_name")
    countries = db.execute(
        "SELECT DISTINCT json_extract_string(properties, 'country') FROM events WHERE json_extract_string(properties, 'country') IS NOT NULL ORDER BY json_extract_string(properties, 'country')"
    )
    browsers = db.execute(
        "SELECT DISTINCT json_extract_string(properties, 'browser') FROM events WHERE json_extract_string(properties, 'browser') IS NOT NULL ORDER BY json_extract_string(properties, 'browser')"
    )
    product_categories = db.execute(
        "SELECT DISTINCT json_extract_string(properties, 'product_category') FROM events WHERE json_extract_string(properties, 'product_category') IS NOT NULL ORDER BY json_extract_string(properties, 'product_category')"
    )

    return {
        "dimensions": [
            {"value": k, "label": v} for k, v in AVAILABLE_DIMENSIONS.items()
        ],
        "measures": [
            {"value": "count", "label": "Event Count"},
            {"value": "unique_users", "label": "Unique Users"},
        ],
        "event_names": [row[0] for row in events],
        "countries": [row[0] for row in countries],
        "browsers": [row[0] for row in browsers],
        "product_categories": [row[0] for row in product_categories],
    }


@router.get("/pivot")
def get_pivot(
    row_dimensions: str = Query(..., description="Comma-separated list of dimensions"),
    measures: str = Query(
        ..., description="Comma-separated list of measures (count, unique_users)"
    ),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    event_filter: Optional[str] = Query(None, description="Filter by event name"),
    country_filter: Optional[str] = Query(None, description="Filter by country"),
    browser_filter: Optional[str] = Query(None, description="Filter by browser"),
    product_category_filter: Optional[str] = Query(
        None, description="Filter by product category"
    ),
    db: Database = Depends(get_db),
    _: str = Depends(verify_api_key),
) -> dict:
    """
    Get pivot table data with flexible dimensions and measures.

    Dimensions: event_name, date, hour, day_of_week, user_id, country, city,
                device_type, browser, os, referrer, product_category, product_name
    Measures: count, unique_users
    """
    row_dims = [d.strip() for d in row_dimensions.split(",") if d.strip()]
    measure_list = [m.strip() for m in measures.split(",") if m.strip()]

    if not row_dims:
        return {"error": "At least one row dimension is required", "data": []}
    if not measure_list:
        return {"error": "At least one measure is required", "data": []}

    valid_dims = set(AVAILABLE_DIMENSIONS.keys())
    invalid_dims = [d for d in row_dims if d not in valid_dims]
    if invalid_dims:
        return {"error": f"Invalid dimensions: {invalid_dims}", "data": []}

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
    if country_filter:
        where_clauses.append("json_extract_string(properties, 'country') = ?")
        params.append(country_filter)
    if browser_filter:
        where_clauses.append("json_extract_string(properties, 'browser') = ?")
        params.append(browser_filter)
    if product_category_filter:
        where_clauses.append("json_extract_string(properties, 'product_category') = ?")
        params.append(product_category_filter)

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

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
        elif dim in (
            "country",
            "city",
            "device_type",
            "browser",
            "os",
            "referrer",
            "product_category",
            "product_name",
        ):
            return f"json_extract_string(properties, '{dim}')"
        return dim

    def get_measure_expr(measure: str) -> str:
        if measure == "count":
            return "COUNT(*)"
        elif measure == "unique_users":
            return "COUNT(DISTINCT user_id)"
        return "COUNT(*)"

    select_parts = []
    for dim in row_dims:
        expr = get_dimension_expr(dim)
        select_parts.append(f"{expr} as {dim}")

    for measure in measure_list:
        expr = get_measure_expr(measure)
        select_parts.append(f"{expr} as {measure}")

    group_by_parts = [get_dimension_expr(dim) for dim in row_dims]
    group_by_clause = ", ".join(group_by_parts)

    select_clause = ", ".join(select_parts)

    query = transpile_sql(f"""
        SELECT {select_clause}
        FROM events
        {where_clause}
        GROUP BY {group_by_clause}
        ORDER BY {measure_list[0]} DESC
    """)

    result = db.execute(query, params)

    data = []
    for row in result:
        record = {}
        for i, dim in enumerate(row_dims):
            val = row[i]
            if isinstance(val, datetime):
                record[dim] = val.isoformat()
            else:
                record[dim] = val
        for i, measure in enumerate(measure_list):
            record[measure] = row[len(row_dims) + i]
        data.append(record)

    return {
        "dimensions": row_dims,
        "measures": measure_list,
        "data": data,
    }
