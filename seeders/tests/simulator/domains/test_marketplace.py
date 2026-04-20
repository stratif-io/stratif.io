"""Marketplace domain pack tests."""

from __future__ import annotations

import random
from datetime import UTC, datetime

import pytest

from seeders.simulator.domains.marketplace import MarketplacePack
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


def test_marketplace_pack_metadata():
    pack = MarketplacePack()
    assert pack.name == "marketplace"
    assert set(pack.events) == {
        "PageView",
        "Search",
        "ListingView",
        "MessageToSeller",
        "Offer",
        "Purchase",
        "ListingCreated",
        "ListingSold",
    }
    assert pack.supported_monetization == ("marketplace_fee",)


def test_bounce_emits_single_event():
    rng = random.Random(1)
    events = MarketplacePack().build_session(_user(), _now(), "bounce", _state(), rng)
    assert len(events) == 1
    assert events[0][1] == "PageView"


def test_browser_emits_listingviews():
    rng = random.Random(1)
    events = MarketplacePack().build_session(_user(), _now(), "browser", _state(), rng)
    names = [ev[1] for ev in events]
    assert "ListingView" in names
    assert "Purchase" not in names


def test_researcher_never_converts():
    rng = random.Random(1)
    events = MarketplacePack().build_session(
        _user(), _now(), "researcher", _state(), rng
    )
    names = [ev[1] for ev in events]
    assert "Purchase" not in names


def test_converter_emits_purchase():
    rng = random.Random(1)
    events = MarketplacePack().build_session(
        _user(), _now(), "converter", _state(), rng
    )
    names = [ev[1] for ev in events]
    assert "Purchase" in names


def test_converter_full_chain():
    rng = random.Random(1)
    events = MarketplacePack().build_session(
        _user(), _now(), "converter", _state(), rng
    )
    names = [ev[1] for ev in events]
    assert "MessageToSeller" in names
    assert "Offer" in names
    assert "Purchase" in names


def test_unknown_archetype_raises():
    rng = random.Random(1)
    with pytest.raises(ValueError, match="unknown archetype"):
        MarketplacePack().build_session(_user(), _now(), "mystery", _state(), rng)


def test_event_tuples_have_7_fields():
    rng = random.Random(1)
    events = MarketplacePack().build_session(
        _user(), _now(), "converter", _state(), rng
    )
    for ev in events:
        assert isinstance(ev, tuple) and len(ev) == 7
