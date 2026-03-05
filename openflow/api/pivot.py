"""Pivot table API endpoint — supports AG Grid Server-Side Row Model (SSRM)."""

import json
import re
import traceback as _traceback
from datetime import date, datetime
from enum import Enum
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from openflow.services import get_analytics_db
from openflow.services.connection_executor import AnalyticsDatabase
from openflow.services.sql_builder import (
    date_trunc,
    extract_day_of_week,
    extract_hour,
    extract_quarter,
    extract_year,
)

router = APIRouter(prefix="/api", tags=["pivot"])


class MeasureType(Enum):
    COUNT_EVENTS = "count_events"
    UNIQUE_USERS = "unique_users"


class Measure(BaseModel):
    type: MeasureType
    alias: str


# ---------------------------------------------------------------------------
# Shared dimension catalogue
# ---------------------------------------------------------------------------

# Time-hierarchy dimensions exposed to the grid
TIME_DIMS: dict[str, str] = {
    "ts_year": "Year",
    "ts_quarter": "Quarter",
    "ts_month": "Month",
    "ts_week": "Week",
    "ts_date": "Date",
    "ts_hour": "Hour",
}

# Non-time base dimensions
BASE_DIMS: dict[str, str] = {
    "event_name": "Event Name",
    "day_of_week": "Day of Week",
    "user_id": "User ID",
}

# Universal dimensions for the legacy /pivot endpoint
AVAILABLE_DIMENSIONS = {
    "event_name": "Event Name",
    "date": "Date",
    "hour": "Hour of Day",
    "day_of_week": "Day of Week",
    "user_id": "User ID",
}

# Fields whose values are integers (needed for groupKey casting)
INTEGER_FIELDS = {"ts_year", "ts_quarter", "ts_week", "ts_hour", "day_of_week"}

MEASURE_AGGS: dict[str, str] = {
    "count_events": "COUNT(DISTINCT user_id)",
    "unique_users": "COUNT(DISTINCT user_id)",
}
MEASURE_LABELS: dict[str, str] = {
    "count_events": "Event Count",
    "unique_users": "Unique Users",
}

MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]
DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_dim_expr(field: str, dialect: str, custom_prop_exprs: dict[str, str]) -> str:
    """Return the SQL expression for a dimension field."""
    match field:
        case "ts_year":
            return extract_year("timestamp", dialect)
        case "ts_quarter":
            return extract_quarter("timestamp", dialect)
        case "ts_month":
            return date_trunc("month", "timestamp", dialect)
        case "ts_week":
            return date_trunc("week", "timestamp", dialect)
        case "ts_date":
            return date_trunc("day", "timestamp", dialect)
        case "ts_hour":
            return extract_hour("timestamp", dialect)
        case "event_name":
            return "event_name"
        case "day_of_week":
            return extract_day_of_week("timestamp", dialect)
        case "user_id":
            return "user_id"
        # Legacy flat pivot dims
        case "date":
            return date_trunc("day", "timestamp", dialect)
        case "hour":
            return extract_hour("timestamp", dialect)
        case _:
            if field in custom_prop_exprs:
                return custom_prop_exprs[field]
            return f'"{field}"'


def _cast_key(field: str, key: Any) -> int | str:
    """Cast a groupKey from AG Grid to the correct Python type for SQL binding.

    AG Grid sends numeric dimension values (year, quarter, etc.) as JSON numbers,
    so ``key`` may already be an int/float rather than a string.
    """
    if field in INTEGER_FIELDS:
        try:
            return int(key)
        except (ValueError, TypeError):
            return str(key)
    # Date/text dimensions — ensure we have a plain string
    return str(key) if not isinstance(key, str) else key


def _safe_field_name(value: str) -> str:
    """Convert a pivot value to a safe SQL column alias / JS field name."""
    return re.sub(r"[^a-zA-Z0-9]", "_", str(value))


def _format_pivot_label(field: str, val: Any) -> str:
    """Human-readable label for a pivot column group header."""
    if val is None:
        return "None"
    if field == "ts_year":
        return str(val)
    if field == "ts_quarter":
        return f"Q{val}"
    if field in ("ts_month", "ts_week", "ts_date"):
        try:
            d = date.fromisoformat(str(val)[:10])
        except (ValueError, TypeError):
            return str(val)
        if field == "ts_month":
            return f"{MONTH_NAMES[d.month - 1]} {d.year}"
        if field == "ts_week":
            return f"W{d.isocalendar()[1]} {d.year}"
        return d.strftime("%b %d, %Y")
    if field == "ts_hour":
        return f"{str(val).zfill(2)}:00"
    if field == "day_of_week":
        try:
            return DAY_NAMES[int(val)]
        except (ValueError, IndexError):
            return str(val)
    return str(val)


def _build_ag_filter_clauses(
    field_expr: str, filter_cfg: dict[str, Any]
) -> tuple[list[str], list]:
    """Convert an AG Grid column filter config to (SQL clauses, params)."""
    clauses: list[str] = []
    params: list = []

    # Combined AND / OR condition
    if "operator" in filter_cfg and "condition1" in filter_cfg:
        op = filter_cfg["operator"]
        c1_cls, c1_ps = _build_ag_filter_clauses(field_expr, filter_cfg["condition1"])
        c2_cls, c2_ps = _build_ag_filter_clauses(field_expr, filter_cfg["condition2"])
        if c1_cls and c2_cls:
            clauses.append(f"({' AND '.join(c1_cls)}) {op} ({' AND '.join(c2_cls)})")
            params.extend(c1_ps)
            params.extend(c2_ps)
        return clauses, params

    filter_type = filter_cfg.get("filterType", "text")
    cond = filter_cfg.get("type", "equals")
    val = filter_cfg.get("filter")
    val_to = filter_cfg.get("filterTo")

    if filter_type == "text":
        match cond:
            case "equals":
                clauses.append(f"{field_expr} = ?")
                params.append(val)
            case "notEqual":
                clauses.append(f"{field_expr} != ?")
                params.append(val)
            case "contains":
                clauses.append(f"{field_expr} LIKE ?")
                params.append(f"%{val}%")
            case "notContains":
                clauses.append(f"{field_expr} NOT LIKE ?")
                params.append(f"%{val}%")
            case "startsWith":
                clauses.append(f"{field_expr} LIKE ?")
                params.append(f"{val}%")
            case "endsWith":
                clauses.append(f"{field_expr} LIKE ?")
                params.append(f"%{val}")
            case "blank":
                clauses.append(
                    f"({field_expr} IS NULL OR CAST({field_expr} AS TEXT) = '')"
                )
            case "notBlank":
                clauses.append(
                    f"({field_expr} IS NOT NULL AND CAST({field_expr} AS TEXT) != '')"
                )
    elif filter_type == "number":
        match cond:
            case "equals":
                clauses.append(f"{field_expr} = ?")
                params.append(val)
            case "notEqual":
                clauses.append(f"{field_expr} != ?")
                params.append(val)
            case "greaterThan":
                clauses.append(f"{field_expr} > ?")
                params.append(val)
            case "greaterThanOrEqual":
                clauses.append(f"{field_expr} >= ?")
                params.append(val)
            case "lessThan":
                clauses.append(f"{field_expr} < ?")
                params.append(val)
            case "lessThanOrEqual":
                clauses.append(f"{field_expr} <= ?")
                params.append(val)
            case "inRange":
                clauses.append(f"{field_expr} >= ? AND {field_expr} <= ?")
                params.extend([val, val_to])
            case "blank":
                clauses.append(f"{field_expr} IS NULL")
            case "notBlank":
                clauses.append(f"{field_expr} IS NOT NULL")

    return clauses, params


# ---------------------------------------------------------------------------
# Legacy /pivot/options + /pivot endpoints (kept for existing PivotPage)
# ---------------------------------------------------------------------------


@router.get("/pivot/options")
def get_pivot_options(
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    """Get available dimensions, measures, and filter options for pivot table."""
    if db:
        events = db.execute(
            "SELECT DISTINCT event_name FROM events ORDER BY event_name"
        )
        custom_props = db.get_custom_properties()
        custom_dimensions = {
            p["name"]: p["name"].replace("_", " ").title() for p in custom_props
        }
        dimensions = {**AVAILABLE_DIMENSIONS, **custom_dimensions}
        filter_options = db.get_filter_options()
        return {
            "dimensions": [{"value": k, "label": v} for k, v in dimensions.items()],
            "measures": [
                {"value": "count_events", "label": "Event Count"},
                {"value": "unique_users", "label": "Unique Users"},
            ],
            "event_names": [row[0] for row in events],
            **filter_options,
        }
    else:
        raise ValueError("db cannot be None")


@router.get("/pivot")
def get_pivot(
    row_dimensions: str = Query(
        "", description="Comma-separated list of row dimensions (optional)"
    ),
    column_dimensions: str = Query(
        "", description="Comma-separated list of column dimensions (optional)"
    ),
    measures: str = Query(
        ..., description="Comma-separated list of measures (count_events, unique_users)"
    ),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    event_filter: str | None = Query(None, description="Filter by event name"),
    filters: str | None = Query(
        None, description="JSON dict of active dimension filters"
    ),
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    if db:
        dialect = db.get_dialect()
        row_dims = [d.strip() for d in row_dimensions.split(",") if d.strip()]
        col_dims = [d.strip() for d in column_dimensions.split(",") if d.strip()]
        measure_list = [m.strip() for m in measures.split(",") if m.strip()]

        if not measure_list:
            return {"error": "At least one measure is required", "data": []}

        custom_props = db.get_custom_properties()
        custom_prop_exprs = db.get_custom_prop_exprs()
        valid_dims = set(AVAILABLE_DIMENSIONS.keys()) | {
            p["name"] for p in custom_props
        }

        invalid_row_dims = [d for d in row_dims if d not in valid_dims]
        invalid_col_dims = [d for d in col_dims if d not in valid_dims]
        if invalid_row_dims:
            return {"error": f"Invalid row dimensions: {invalid_row_dims}", "data": []}
        if invalid_col_dims:
            return {
                "error": f"Invalid column dimensions: {invalid_col_dims}",
                "data": [],
            }

        valid_measures = {"count_events", "unique_users"}
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
            return _get_dim_expr(dim, dialect, custom_prop_exprs)

        def get_measure_expr(measure: str) -> str:
            if measure == "count_events":
                return "COUNT(*)"
            if measure == "unique_users":
                return "COUNT(DISTINCT user_id)"
            return "COUNT(*)"

        all_dims = row_dims + col_dims
        select_parts = [f"{get_dimension_expr(dim)} AS {dim}" for dim in all_dims]
        select_parts += [f"{get_measure_expr(m)} AS {m}" for m in measure_list]

        if all_dims:
            group_by_exprs = [get_dimension_expr(dim) for dim in all_dims]
            group_by_clause = "GROUP BY " + ", ".join(group_by_exprs)
            order_by_clause = f"ORDER BY {measure_list[0]} DESC"
        else:
            group_by_clause = ""
            order_by_clause = ""

        query = f"""
            SELECT {", ".join(select_parts)}
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
            col_key = tuple(record[dim] if record[dim] else "-" for dim in col_dims)
            column_values.setdefault(col_key, True)
        pivoted_data: list[dict] = []
        if row_dims:
            row_groups: dict = {}
            for record in data:
                row_key = tuple(record[dim] for dim in row_dims)
                col_key = tuple(record[dim] for dim in col_dims)
                row_groups.setdefault(row_key, {})[col_key] = {
                    m: record[m] for m in measure_list
                }
            for row_key, col_data in row_groups.items():
                pivoted_row: dict = {
                    row_dims[i]: row_key[i] for i in range(len(row_dims))
                }
                for col_key in sorted(column_values.keys()):
                    col_label = "_".join(str(v) for v in col_key)
                    for measure in measure_list:
                        pivoted_row[f"{col_label}_{measure}"] = (
                            col_data[col_key][measure] if col_key in col_data else 0
                        )
                pivoted_data.append(pivoted_row)
        else:
            col_data = {
                tuple(record[dim] for dim in col_dims): {
                    m: record[m] for m in measure_list
                }
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
    else:
        raise ValueError("db cannot be None")


# ---------------------------------------------------------------------------
# AG Grid SSRM — filter values (for Set Filter autocomplete)
# ---------------------------------------------------------------------------


@router.get("/pivot/grid/filter-values")
def get_pivot_grid_filter_values(
    field: str = Query(..., description="Dimension field to fetch distinct values for"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    event_filter: str | None = Query(None, description="Filter by event name"),
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    """Return distinct values for a dimension field, used to populate Set Filter lists."""
    if not db:
        raise ValueError("db cannot be None")

    # event_count is a computed column — no distinct values to return
    if field == "event_count":
        return {"field": field, "values": []}

    dialect = db.get_dialect()
    custom_prop_exprs = db.get_custom_prop_exprs()
    expr = _get_dim_expr(field, dialect, custom_prop_exprs)

    where_clauses: list[str] = []
    params: list = []
    if start_date:
        where_clauses.append("timestamp >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        where_clauses.append("timestamp <= ?")
        params.append(f"{end_date} 23:59:59")
    if event_filter:
        where_clauses.append("event_name = ?")
        params.append(event_filter)
    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    result = db.execute(
        f"SELECT DISTINCT {expr} AS val FROM events {where_clause} ORDER BY val LIMIT 500",
        params,
    )
    values = []
    for row in result:
        val = row[0]
        if val is None:
            continue
        values.append(val.isoformat() if isinstance(val, (datetime, date)) else val)

    return {"field": field, "values": values}


# ---------------------------------------------------------------------------
# AG Grid SSRM — column definitions
# ---------------------------------------------------------------------------


@router.get("/pivot/grid")
def get_pivot_grid(
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    """Return AG Grid Enterprise column definitions for the SSRM pivot grid.

    Row data is fetched separately via POST /pivot/grid/rows.
    """
    if not db:
        raise ValueError("db cannot be None")

    custom_props = db.get_custom_properties()
    custom_dim_meta: dict[str, str] = {
        p["name"]: p["name"].replace("_", " ").title() for p in custom_props
    }

    # Time hierarchy column group
    time_children = [
        {
            "field": field,
            "headerName": label,
            "enableRowGroup": True,
            "enablePivot": True,
            "enableValue": True,
            "allowedAggFuncs": ["countDistinct", "count", "min", "max"],
            "resizable": True,
            "filter": "agNumberColumnFilter"
            if field in INTEGER_FIELDS
            else "agTextColumnFilter",
            **({"type": "numericColumn"} if field in INTEGER_FIELDS else {}),
        }
        for field, label in TIME_DIMS.items()
    ]

    # Other dimension columns
    other_cols = []
    for field, label in BASE_DIMS.items():
        if field == "user_id":
            continue  # too high cardinality for grouping
        other_cols.append(
            {
                "field": field,
                "headerName": label,
                "enableRowGroup": True,
                "enablePivot": True,
                "enableValue": True,
                "allowedAggFuncs": ["countDistinct", "count", "min", "max"],
                "resizable": True,
                "filter": "agNumberColumnFilter"
                if field in INTEGER_FIELDS
                else "agTextColumnFilter",
                **({"type": "numericColumn"} if field in INTEGER_FIELDS else {}),
            }
        )

    # Custom property columns
    for field, label in custom_dim_meta.items():
        other_cols.append(
            {
                "field": field,
                "headerName": label,
                "enableRowGroup": True,
                "enablePivot": True,
                "enableValue": True,
                "allowedAggFuncs": [
                    "countDistinct",
                    "count",
                    "min",
                    "max",
                    "avg",
                    "sum",
                ],
                "resizable": True,
                "filter": "agTextColumnFilter",
            }
        )

    event_count_col = {
        "field": "event_count",
        "headerName": "Event Count",
        "type": "numericColumn",
        "enableValue": True,
        "enableRowGroup": False,
        "enablePivot": False,
        "allowedAggFuncs": ["sum"],
        "filter": "agNumberColumnFilter",
        "resizable": True,
    }

    column_defs = [
        {
            "headerName": "Timestamp",
            "groupId": "timestamp_group",
            "children": time_children,
        },
        *other_cols,
        event_count_col,
    ]

    return {"columnDefs": column_defs}


# ---------------------------------------------------------------------------
# AG Grid SSRM — row data (POST)
# ---------------------------------------------------------------------------


class ColInfo(BaseModel):
    id: str = ""
    field: str = ""
    aggFunc: str = "sum"
    displayName: str = ""


class SortItem(BaseModel):
    colId: str
    sort: str = "asc"


class PivotGridRequest(BaseModel):
    rowGroupCols: list[ColInfo] = []
    valueCols: list[ColInfo] = []
    pivotCols: list[ColInfo] = []
    pivotMode: bool = False
    groupKeys: list[
        Any
    ] = []  # AG Grid sends integers for numeric dims (e.g. year=2026)
    filterModel: dict[str, Any] = {}
    sortModel: list[SortItem] = []
    startRow: int = 0
    endRow: int = 10000
    # Global params forwarded from the frontend
    start_date: str | None = None
    end_date: str | None = None
    event_filter: str | None = None
    extra_filters: dict[str, str | None] | None = None


@router.post("/pivot/grid/rows")
def get_pivot_grid_rows(
    body: PivotGridRequest,
    db: Annotated[AnalyticsDatabase | None, Depends(get_analytics_db)] = None,
) -> dict:
    """AG Grid SSRM data endpoint.

    Handles:
    - Row grouping with lazy drill-down (groupKeys depth)
    - Column pivot cross-tabulation (server-side CASE WHEN aggregation)
    - AG Grid filterModel → SQL WHERE / HAVING
    - AG Grid sortModel → SQL ORDER BY
    - Date range + event filter applied globally

    Returns { rows, rowCount, secondaryColDefs? }
    """
    if not db:
        raise ValueError("db cannot be None")

    try:
        return _pivot_grid_rows_impl(body, db)
    except Exception:
        err = _traceback.format_exc()
        return {"rows": [], "rowCount": 0, "error": err}


def _pivot_grid_rows_impl(body: PivotGridRequest, db: "AnalyticsDatabase") -> dict:
    dialect = db.get_dialect()
    custom_prop_exprs = db.get_custom_prop_exprs()

    def dim_expr(field: str) -> str:
        return _get_dim_expr(field, dialect, custom_prop_exprs)

    # ------------------------------------------------------------------ #
    # Build base WHERE clause                                              #
    # ------------------------------------------------------------------ #
    where_clauses: list[str] = []
    where_params: list = []

    if body.start_date:
        where_clauses.append("timestamp >= ?")
        where_params.append(f"{body.start_date} 00:00:00")
    if body.end_date:
        where_clauses.append("timestamp <= ?")
        where_params.append(f"{body.end_date} 23:59:59")
    if body.event_filter:
        where_clauses.append("event_name = ?")
        where_params.append(body.event_filter)
    if body.extra_filters:
        for ef_field, ef_value in body.extra_filters.items():
            if ef_value is None:
                continue
            where_clauses.append(f"{dim_expr(ef_field)} = ?")
            where_params.append(_cast_key(ef_field, ef_value))

    # Drill-down: filter to parent group values
    for i, key in enumerate(body.groupKeys):
        if i < len(body.rowGroupCols):
            field = body.rowGroupCols[i].field
            where_clauses.append(f"{dim_expr(field)} = ?")
            where_params.append(_cast_key(field, key))

    # ------------------------------------------------------------------ #
    # Value column SQL resolver                                            #
    # Supports built-in measures (count_events, unique_users) and               #
    # countDistinct on any dimension field.                               #
    # ------------------------------------------------------------------ #
    def value_col_sql(vc: ColInfo) -> tuple[str, str]:
        """Return (sql_expression, result_alias) for a value column."""
        if vc.field == "event_count":
            return "COUNT(*)", "event_count"
        f_expr = dim_expr(vc.field)
        match vc.aggFunc:
            case "countDistinct" | "count_distinct" | "count":
                return f"COUNT(DISTINCT {f_expr})", vc.field
            case "min":
                return f"MIN({f_expr})", vc.field
            case "max":
                return f"MAX({f_expr})", vc.field
            case "avg":
                return f"AVG(CAST({f_expr} AS DOUBLE))", vc.field
            case "sum":
                return f"SUM(CAST({f_expr} AS DOUBLE))", vc.field
            case _:
                return f"COUNT(DISTINCT {f_expr})", vc.field

    resolved_values = (
        [value_col_sql(vc) for vc in body.valueCols]
        if body.valueCols
        else [("COUNT(*)", "event_count")]
    )

    # Build a mapping alias → sql_expr for HAVING / ORDER BY look-ups
    alias_to_sql: dict[str, str] = {alias: sql for sql, alias in resolved_values}

    # AG Grid filterModel → WHERE (dimensions) / HAVING (measures)
    having_clauses: list[str] = []
    having_params: list = []

    for col_field, filter_cfg in body.filterModel.items():
        if col_field in alias_to_sql:
            cls, ps = _build_ag_filter_clauses(alias_to_sql[col_field], filter_cfg)
            having_clauses.extend(cls)
            having_params.extend(ps)
        else:
            cls, ps = _build_ag_filter_clauses(dim_expr(col_field), filter_cfg)
            where_clauses.extend(cls)
            where_params.extend(ps)

    where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    having_clause = "HAVING " + " AND ".join(having_clauses) if having_clauses else ""

    # ------------------------------------------------------------------ #
    # Determine grouping level                                             #
    # ------------------------------------------------------------------ #
    depth = len(body.groupKeys)
    has_more_groups = depth < len(body.rowGroupCols)
    current_group: ColInfo | None = (
        body.rowGroupCols[depth] if has_more_groups else None
    )

    # ------------------------------------------------------------------ #
    # Sort                                                                 #
    # ------------------------------------------------------------------ #
    first_sql = resolved_values[0][0] if resolved_values else "COUNT(*)"

    def build_order_by() -> str:
        if not body.sortModel:
            return f"ORDER BY {first_sql} DESC"
        parts = []
        for s in body.sortModel:
            direction = "ASC" if s.sort == "asc" else "DESC"
            if s.colId in alias_to_sql:
                parts.append(f"{alias_to_sql[s.colId]} {direction}")
            elif current_group and s.colId == current_group.field:
                parts.append(f"{dim_expr(s.colId)} {direction}")
        return ("ORDER BY " + ", ".join(parts)) if parts else ""

    # ================================================================== #
    # NON-PIVOT MODE                                                       #
    # ================================================================== #
    if not body.pivotMode or not body.pivotCols:
        order_by = build_order_by()

        if current_group:
            # Grouped rows — one row per group value
            g_expr = dim_expr(current_group.field)
            page_size = body.endRow - body.startRow
            select_parts = [f"{g_expr} AS {current_group.field}"]
            select_parts += [f"{sql} AS {alias}" for sql, alias in resolved_values]
            query = f"""
                SELECT {", ".join(select_parts)}
                FROM events
                {where_clause}
                GROUP BY {g_expr}
                {having_clause}
                {order_by}
                LIMIT {page_size} OFFSET {body.startRow}
            """
            result = db.execute(query, where_params + having_params)

        else:
            # Grand total — no grouping
            select_parts = [f"{sql} AS {alias}" for sql, alias in resolved_values]
            query = f"""
                SELECT {", ".join(select_parts)}
                FROM events
                {where_clause}
                {having_clause}
            """
            result = db.execute(query, where_params + having_params)

        value_aliases = [alias for _, alias in resolved_values]
        all_fields = ([current_group.field] if current_group else []) + value_aliases
        rows = []
        for row in result:
            record: dict = {}
            for i, f in enumerate(all_fields):
                val = row[i]
                record[f] = val.isoformat() if isinstance(val, datetime) else val
            rows.append(record)

        return {"rows": rows, "rowCount": len(rows)}

    # ================================================================== #
    # PIVOT MODE — server-side cross-tabulation                           #
    # ================================================================== #
    # Support one pivot column (the first one selected by the user)
    pivot_col = body.pivotCols[0]
    p_field = pivot_col.field
    p_expr = dim_expr(p_field)

    # Step 1 — distinct pivot values (cap at 100 to avoid column explosion)
    pv_query = f"""
        SELECT DISTINCT {p_expr} AS pv
        FROM events
        {where_clause}
        ORDER BY pv
        LIMIT 100
    """
    pv_result = db.execute(pv_query, where_params)
    pivot_vals = [row[0] for row in pv_result]

    if not pivot_vals:
        return {"rows": [], "rowCount": 0, "secondaryColDefs": []}

    # Step 2 — conditional aggregation (CASE WHEN per pivot value × value col)
    # IMPORTANT: select_params appear BEFORE where_params in the SQL string.
    select_params: list = []
    select_parts = []

    if current_group:
        g_expr = dim_expr(current_group.field)
        select_parts.append(f"{g_expr} AS {current_group.field}")

    pivot_field_names: list[str] = []
    for pv in pivot_vals:
        pv_val = pv.isoformat() if isinstance(pv, datetime) else pv
        pv_safe = _safe_field_name(str(pv_val))

        for _, vc_alias in resolved_values:
            col_key = f"{pv_safe}__{vc_alias}"
            pivot_field_names.append(col_key)

            # Build conditional aggregation for this pivot value
            vc_obj = next((v for v in body.valueCols if v.field == vc_alias), None)
            agg_func = vc_obj.aggFunc if vc_obj else "sum"
            if vc_alias == "event_count":
                agg = f"SUM(CASE WHEN {p_expr} = ? THEN 1 ELSE 0 END)"
                select_parts.append(f'{agg} AS "{col_key}"')
                select_params.append(pv_val)
                continue
            d_expr = dim_expr(vc_alias)
            match agg_func:
                case "countDistinct" | "count_distinct" | "count":
                    agg = f"COUNT(DISTINCT CASE WHEN {p_expr} = ? THEN {d_expr} ELSE NULL END)"
                case "min":
                    agg = f"MIN(CASE WHEN {p_expr} = ? THEN {d_expr} ELSE NULL END)"
                case "max":
                    agg = f"MAX(CASE WHEN {p_expr} = ? THEN {d_expr} ELSE NULL END)"
                case "avg":
                    agg = f"AVG(CASE WHEN {p_expr} = ? THEN CAST({d_expr} AS DOUBLE) ELSE NULL END)"
                case "sum":
                    agg = f"SUM(CASE WHEN {p_expr} = ? THEN CAST({d_expr} AS DOUBLE) ELSE NULL END)"
                case _:
                    agg = f"COUNT(DISTINCT CASE WHEN {p_expr} = ? THEN {d_expr} ELSE NULL END)"

            select_parts.append(f'{agg} AS "{col_key}"')
            select_params.append(pv_val)

    group_by = f"GROUP BY {g_expr}" if current_group else ""
    order_by = build_order_by()

    # Full params: select CASE WHEN params come first (appear first in SQL string)
    full_params = select_params + where_params + having_params

    query = f"""
        SELECT {", ".join(select_parts)}
        FROM events
        {where_clause}
        {group_by}
        {having_clause}
        {order_by}
    """
    result = db.execute(query, full_params)

    all_fields = ([current_group.field] if current_group else []) + pivot_field_names
    rows = []
    for row in result:
        record: dict = {}
        for i, f in enumerate(all_fields):
            val = row[i]
            record[f] = val.isoformat() if isinstance(val, datetime) else val
        rows.append(record)

    # Build secondaryColDefs — one column group per pivot value
    secondary_col_defs = []
    for pv in pivot_vals:
        pv_val = pv.isoformat() if isinstance(pv, datetime) else pv
        pv_safe = _safe_field_name(str(pv_val))
        pv_label = _format_pivot_label(p_field, pv)

        children = []
        for _, vc_alias in resolved_values:
            vc_obj = next((v for v in body.valueCols if v.field == vc_alias), None)
            _AGG_LABELS = {
                "sum": "Sum",
                "min": "Min",
                "max": "Max",
                "avg": "Avg",
                "count": "Count",
                "countDistinct": "Count Distinct",
                "count_distinct": "Count Distinct",
            }
            if vc_obj:
                raw = vc_obj.displayName or vc_obj.field
                agg_label = _AGG_LABELS.get(vc_obj.aggFunc, vc_obj.aggFunc.title())
                header = f"{agg_label} ({raw})"
            else:
                header = vc_alias
            col_agg = vc_obj.aggFunc if vc_obj else "sum"
            children.append(
                {
                    "field": f"{pv_safe}__{vc_alias}",
                    "headerName": header,
                    "type": "numericColumn",
                    "aggFunc": col_agg,
                    "resizable": True,
                }
            )
        secondary_col_defs.append({"headerName": pv_label, "children": children})

    return {
        "rows": rows,
        "rowCount": len(rows),
        "secondaryColDefs": secondary_col_defs,
    }
