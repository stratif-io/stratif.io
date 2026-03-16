"""Shared helpers for backend schema detection."""
from __future__ import annotations

from backend.backends.base import ColumnInfo

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
