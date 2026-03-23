"""Shared input validators for API endpoints."""

from datetime import datetime

from fastapi import HTTPException


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
