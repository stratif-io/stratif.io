"""Timezone-aware session-start conversion via stdlib zoneinfo."""

from __future__ import annotations

import random
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from services.event_simulator.simulator.realism.time_curves import sample_hour


def local_to_utc(local_dt: datetime, tz_name: str) -> datetime:
    """Convert a naive local datetime to timezone-aware UTC."""
    zone = ZoneInfo(tz_name)
    aware_local = local_dt.replace(tzinfo=zone)
    return aware_local.astimezone(UTC)


def build_session_start(
    rng: random.Random,
    local_date: date,
    hour_weights: list[float],
    tz_name: str,
) -> datetime:
    """Sample hour/minute/second in the user's timezone, return UTC."""
    hour = sample_hour(rng, hour_weights)
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    naive = datetime.combine(local_date, datetime.min.time()).replace(
        hour=hour, minute=minute, second=second
    )
    return local_to_utc(naive, tz_name)
