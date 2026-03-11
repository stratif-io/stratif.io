"""Shared utility helpers for the OpenFlow backend."""
from datetime import UTC, datetime


def utcnow_str() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def utcnow_plus_str(hours: int) -> str:
    """Return UTC time `hours` from now as an ISO 8601 string."""
    from datetime import timedelta
    return (datetime.now(UTC) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
