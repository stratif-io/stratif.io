"""Shared helpers for backend schema detection."""
from __future__ import annotations

from typing import Any

from backend.backends.base import ColumnInfo


def _to_named_params(query: str, params: list[Any]) -> tuple[str, dict[str, Any]]:
    """Convert positional ? params to named :p0, :p1, ... params."""
    named: dict[str, Any] = {}
    parts = query.split("?")
    result: list[str] = [parts[0]]
    for i, part in enumerate(parts[1:]):
        key = f"p{i}"
        named[key] = params[i] if i < len(params) else None
        result.append(f":{key}")
        result.append(part)
    return "".join(result), named


_KNOWN_USER_ID = ("user_id", "userid", "user", "account_id", "customer_id", "uid")
_KNOWN_TIMESTAMP = ("timestamp", "ts", "created_at", "event_time", "time", "datetime", "date")
_KNOWN_EVENT_NAME = ("event_name", "event", "action", "event_type", "name", "type")


def pick_events_table(tables: list[str], hint: str | None) -> str | None:
    if hint and hint in tables:
        return hint
    return next(
        (t for t in tables if t.lower() in ("events", "event", "analytics")),
        tables[0] if tables else None,
    )


def suggest_fields(columns: list[ColumnInfo]) -> dict:
    col_lower = {c.name.lower(): c.name for c in columns}
    suggestions: dict = {}
    for candidate in _KNOWN_USER_ID:
        if candidate in col_lower:
            suggestions["user_id_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_TIMESTAMP:
        if candidate in col_lower:
            suggestions["timestamp_field"] = col_lower[candidate]
            break
    for candidate in _KNOWN_EVENT_NAME:
        if candidate in col_lower:
            suggestions["event_name_field"] = col_lower[candidate]
            break
    return suggestions


def infer_type(sql_type: str) -> str:
    t = sql_type.upper()
    if any(x in t for x in ("INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "REAL",
                             "HUGEINT", "BIGINT", "SMALLINT", "TINYINT")):
        return "number"
    if "BOOL" in t:
        return "boolean"
    if any(x in t for x in ("TIMESTAMP", "DATE", "TIME")):
        return "timestamp"
    return "string"


def sample_property_types(
    execute_fn,
    table: str,
    prop_exprs: dict[str, str],
    numeric_cast: str,
) -> dict[str, str]:
    """Sample up to 500 rows to detect numeric JSON properties.

    Args:
        execute_fn: callable(sql: str) -> list[row] | None
        table: events table name
        prop_exprs: {property_name: sql_expression} for string-typed props
        numeric_cast: dialect-specific template with {expr} placeholder;
                      should return non-null for numeric values, null otherwise.
    Returns:
        dict mapping name -> "number" for each upgraded property (empty = no upgrades)
    """
    if not prop_exprs:
        return {}
    try:
        names = list(prop_exprs.keys())
        cast_cols = ", ".join(
            f'MAX({numeric_cast.format(expr=prop_exprs[name])}) AS col_{i}'
            for i, name in enumerate(names)
        )
        sql = f'SELECT {cast_cols} FROM (SELECT * FROM "{table}" LIMIT 500)'
        rows = execute_fn(sql)
        if not rows:
            return {}
        row = rows[0]
        return {names[i]: "number" for i, val in enumerate(row) if val is not None}
    except Exception:
        return {}
