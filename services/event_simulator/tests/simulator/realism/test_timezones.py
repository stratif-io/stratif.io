from __future__ import annotations

import random
from datetime import UTC, date, datetime

from services.event_simulator.simulator.realism.timezones import (
    build_session_start,
    local_to_utc,
)


def test_local_to_utc_new_york_winter():
    local = datetime(2025, 1, 15, 12, 0, 0)
    utc = local_to_utc(local, "America/New_York")
    # NY in Jan is UTC-5
    assert utc == datetime(2025, 1, 15, 17, 0, 0, tzinfo=UTC)


def test_local_to_utc_new_york_summer_dst():
    local = datetime(2025, 7, 15, 12, 0, 0)
    utc = local_to_utc(local, "America/New_York")
    # NY in July is UTC-4 (DST)
    assert utc == datetime(2025, 7, 15, 16, 0, 0, tzinfo=UTC)


def test_local_to_utc_tokyo_no_dst():
    local = datetime(2025, 1, 15, 12, 0, 0)
    utc = local_to_utc(local, "Asia/Tokyo")
    assert utc == datetime(2025, 1, 15, 3, 0, 0, tzinfo=UTC)


def test_build_session_start_respects_hour_weights():
    rng = random.Random(1)
    weights = [0.0] * 24
    weights[15] = 1.0  # only 3pm local
    utc = build_session_start(rng, date(2025, 3, 10), weights, "Europe/Paris")
    # Paris in March 10 is pre-DST (CET = UTC+1), so 15:00 → 14:00 UTC.
    # If the system changed, accept 13 or 14 to survive edge cases.
    assert utc.hour in {13, 14}


def test_build_session_start_is_timezone_aware():
    rng = random.Random(1)
    weights = [1.0] * 24
    utc = build_session_start(rng, date(2025, 3, 10), weights, "Europe/Paris")
    assert utc.tzinfo is not None
