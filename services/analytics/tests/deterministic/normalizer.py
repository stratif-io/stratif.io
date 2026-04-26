"""Normalize API responses before golden-file comparison.

Applied to both the live response and the loaded golden file so that
dialect-specific formatting differences (float precision, timestamp
format, list ordering) do not cause false negatives.

Usage:
    normalized = normalize(endpoint_key, response_dict)
"""

from __future__ import annotations

import json
import re
from typing import Any

# Matches "YYYY-MM-DD HH:MM:SS" (space separator) — SQLite/PostgreSQL return this
# format instead of the ISO-8601 "T" separator that DuckDB returns.
_SPACE_TS_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$")

# Matches "YYYY-MM-DD HH:MM:SS+HH:MM" or "YYYY-MM-DD HH:MM:SS+00:00" —
# Databricks returns timezone-aware timestamps; strip the tz offset before
# further normalisation so they compare equal to tz-naive dialects.
_SPACE_TS_TZ_RE = re.compile(
    r"^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})[+-]\d{2}:\d{2}$"
)

# Matches "YYYY-MM-DDTHH:MM:SS+HH:MM" — ISO-8601 with T separator and tz offset
# (Databricks returns this for DATE_TRUNC results on cohort/bucket fields).
# Strip the tz offset so the string reduces to "YYYY-MM-DDTHH:MM:SS" for further
# normalisation by _MIDNIGHT_TS_RE.
_ISO_TS_TZ_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})[+-]\d{2}:\d{2}$")

# Matches "YYYY-MM-DDTHH:MM:SS" after the space→T normalisation step above.
# When the time portion is midnight we strip it so date-bucket fields like
# trend dates compare equal across dialects (DuckDB returns "YYYY-MM-DD",
# PostgreSQL returns "YYYY-MM-DD 00:00:00").
_MIDNIGHT_TS_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})T00:00:00$")

# Sort key functions per endpoint key
_SORT_KEYS: dict[str, list[str]] = {
    "events": ["event_name"],  # events list sorted in-place
    "events_top": ["name"],
    "trend_daily": ["date"],
    "trend_weekly": ["date"],
    "trend_monthly": ["date"],
    "retention": ["cohort_date"],
    "conversion": [],  # single-row list
    "paths": ["path", "device_type", "count"],
    "pivot_by_event": ["dimension_value"],
    "pivot_by_country": ["dimension_value"],
    "pivot_by_device": ["dimension_value"],
    "sessions_summary": [],  # single-row list
    "raw_events_page1": ["timestamp", "user_id", "event_name"],
    "raw_sessions_page1": ["session_start", "user_id"],
}


def normalize(endpoint_key: str, response: dict) -> dict:
    """Return a normalized copy of *response* for *endpoint_key*.

    The ``sql`` key is always stripped — it is dialect-specific and not
    meaningful for cross-dialect correctness comparison.
    """
    result = _deep_copy_normalize(response)
    result.pop("sql", None)
    sort_keys = _SORT_KEYS.get(endpoint_key, [])

    # Special case: events list is a flat list of strings
    if endpoint_key == "events" and "events" in result:
        result["events"] = sorted(result["events"])
        return result

    if "data" in result and isinstance(result["data"], list) and sort_keys:
        result["data"] = sorted(
            result["data"],
            key=lambda row: tuple(str(row.get(k, "")) for k in sort_keys),
        )

    return result


_NUMERIC_STR_RE = re.compile(r"^-?\d+\.\d+$")


def _deep_copy_normalize(obj: Any) -> Any:
    """Recursively copy *obj*, rounding floats and normalizing timestamps."""
    if isinstance(obj, float):
        return round(obj, 4)
    if isinstance(obj, str):
        # Normalize numeric strings like "300.00" → 300.0 so that backends
        # returning NUMERIC/DECIMAL as strings (e.g. PostgreSQL via psycopg2)
        # compare equal to backends returning native floats.
        if _NUMERIC_STR_RE.match(obj):
            return round(float(obj), 4)
        # Strip timezone offset from "YYYY-MM-DDTHH:MM:SS+HH:MM" (Databricks ISO).
        m = _ISO_TS_TZ_RE.match(obj)
        if m:
            obj = m.group(1)
        # Strip timezone offset from "YYYY-MM-DD HH:MM:SS+HH:MM" (Databricks space).
        m = _SPACE_TS_TZ_RE.match(obj)
        if m:
            obj = f"{m.group(1)}T{m.group(2)}"
        # Normalize "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS" so that
        # SQLite's/PostgreSQL's space-separated timestamps compare equal to
        # DuckDB's ISO-8601.
        m = _SPACE_TS_RE.match(obj)
        if m:
            obj = f"{m.group(1)}T{m.group(2)}"
        # Strip midnight time component so date-bucket fields (trend dates,
        # cohort dates, etc.) are "YYYY-MM-DD" regardless of dialect.
        m2 = _MIDNIGHT_TS_RE.match(obj)
        if m2:
            return m2.group(1)
        return obj
    if isinstance(obj, dict):
        return {k: _deep_copy_normalize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_deep_copy_normalize(item) for item in obj]
    return obj


def load_golden(golden_dir: str, endpoint_key: str) -> dict:
    """Load and normalize a committed golden file."""
    import pathlib

    path = pathlib.Path(golden_dir) / f"{endpoint_key}.json"
    raw = json.loads(path.read_text())
    return normalize(endpoint_key, raw)


def save_golden(golden_dir: str, endpoint_key: str, response: dict) -> None:
    """Normalize *response* and write it to the golden file."""
    import pathlib

    normalized = normalize(endpoint_key, response)
    path = pathlib.Path(golden_dir) / f"{endpoint_key}.json"
    path.write_text(json.dumps(normalized, indent=2, default=str) + "\n")
