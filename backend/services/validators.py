"""Shared input validators for API endpoints."""

from datetime import datetime

from fastapi import HTTPException


def to_sql_datetime(date_str: str, default_time: str) -> str:
    """Return a SQL-compatible datetime string from a validated date param.

    If date_str already carries a time component (YYYY-MM-DDTHH:MM:SS), that
    time is used as-is (the T separator is replaced with a space for SQL).
    Otherwise the supplied default_time ("HH:MM:SS") is appended.

    Examples:
        to_sql_datetime("2025-03-22", "00:00:00")        -> "2025-03-22 00:00:00"
        to_sql_datetime("2025-03-22T14:30:00", "00:00:00") -> "2025-03-22 14:30:00"
    """
    if "T" in date_str:
        return date_str.replace("T", " ")
    return f"{date_str} {default_time}"


def parse_date(value: str | None) -> str | None:
    """Validate and return a date string in YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format.

    Raises HTTP 400 if the value is not a valid date.
    Returns None if value is None.
    """
    if value is None:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            datetime.strptime(value, fmt)
            return value
        except ValueError:
            continue
    raise HTTPException(
        status_code=400,
        detail=f"Invalid date format: {value!r}. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.",
    )
