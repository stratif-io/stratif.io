"""Dating domain pack tests."""

from __future__ import annotations

import random
from datetime import UTC, datetime

import pytest

from seeders.simulator.domains.dating import DatingPack
from seeders.simulator.protocols import SimulationState


def _user(is_returning: bool = False) -> dict:
    return {
        "id": "u-test",
        "country": "US",
        "city": "New York",
        "timezone": "America/New_York",
        "currency": "USD",
        "device_type": "Desktop",
        "browser": "Chrome",
        "os": "macOS",
        "screen_resolution": "1920x1080",
        "is_returning": is_returning,
        "is_power_user": False,
        "browser_only": False,
        "completed_purchase": False,
        "sessions": [],
        "traits": {
            "first_name": "Test",
            "last_name": "User",
            "phone": "+1",
            "email": "t@e.io",
            "date_of_birth": "1990-01-01",
        },
    }


def _state() -> SimulationState:
    return SimulationState(random_seed=42, total_users=100, window_days=30)


def _now() -> datetime:
    return datetime.now(UTC)


def test_dating_pack_metadata():
    pack = DatingPack()
    assert pack.name == "dating"
    assert set(pack.events) == {
        "SessionStart",
        "ProfileView",
        "Swipe",
        "Match",
        "MessageSent",
        "MessageRead",
        "DateScheduled",
        "SubscriptionUpgraded",
        "AccountDeleted",
    }
    assert set(pack.supported_monetization) == {"subscription"}


def test_dating_bounce_emits_single_event():
    rng = random.Random(1)
    events = DatingPack().build_session(_user(), _now(), "bounce", _state(), rng)
    assert len(events) == 1
    assert events[0][1] == "SessionStart"


def test_dating_converter_emits_conversion_event():
    rng = random.Random(1)
    events = DatingPack().build_session(_user(), _now(), "converter", _state(), rng)
    names = [ev[1] for ev in events]
    assert "DateScheduled" in names


def test_dating_unknown_archetype_raises():
    rng = random.Random(1)
    with pytest.raises(ValueError, match="unknown archetype"):
        DatingPack().build_session(_user(), _now(), "mystery", _state(), rng)


def test_dating_event_tuples_have_7_fields():
    rng = random.Random(1)
    events = DatingPack().build_session(_user(), _now(), "converter", _state(), rng)
    for ev in events:
        assert isinstance(ev, tuple) and len(ev) == 7
