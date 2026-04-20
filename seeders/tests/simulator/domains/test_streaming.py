"""Streaming domain pack tests."""

from __future__ import annotations

import random
from datetime import UTC, datetime

import pytest

from seeders.simulator.domains.streaming import StreamingPack
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


def test_streaming_pack_metadata():
    pack = StreamingPack()
    assert pack.name == "streaming"
    assert set(pack.events) == {
        "SessionStart",
        "Browse",
        "TitlePageView",
        "PlayStarted",
        "PlayPaused",
        "PlayCompleted",
        "Rated",
        "AddedToList",
        "PlanUpgraded",
        "Cancelled",
    }
    assert set(pack.supported_monetization) == {"subscription", "ad_supported"}


def test_bounce_emits_single_event():
    rng = random.Random(1)
    events = StreamingPack().build_session(_user(), _now(), "bounce", _state(), rng)
    assert len(events) == 1
    assert events[0][1] == "SessionStart"


def test_converter_emits_conversion_event():
    rng = random.Random(1)
    events = StreamingPack().build_session(_user(), _now(), "converter", _state(), rng)
    names = [ev[1] for ev in events]
    assert "PlayCompleted" in names


def test_unknown_archetype_raises():
    rng = random.Random(1)
    with pytest.raises(ValueError, match="unknown archetype"):
        StreamingPack().build_session(_user(), _now(), "mystery", _state(), rng)


def test_event_tuples_have_7_fields():
    rng = random.Random(1)
    events = StreamingPack().build_session(_user(), _now(), "converter", _state(), rng)
    for ev in events:
        assert isinstance(ev, tuple) and len(ev) == 7


def test_converter_completes_play():
    rng = random.Random(1)
    events = StreamingPack().build_session(_user(), _now(), "converter", _state(), rng)
    names = [ev[1] for ev in events]
    assert "PlayStarted" in names
    assert "PlayCompleted" in names
