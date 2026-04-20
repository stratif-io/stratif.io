"""Fintech domain pack tests."""

from __future__ import annotations

import random
from datetime import UTC, datetime

import pytest

from seeders.simulator.domains.fintech import FintechPack
from seeders.simulator.protocols import SimulationState

_CONVERSION_EVENTS = {"Deposit", "Withdrawal", "TransferExternal", "CardPurchase"}


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


def test_fintech_pack_metadata():
    pack = FintechPack()
    assert pack.name == "fintech"
    assert set(pack.events) == {
        "SessionStart",
        "AccountOpened",
        "Deposit",
        "Withdrawal",
        "TransferInternal",
        "TransferExternal",
        "CardPurchase",
        "BalanceChecked",
        "StatementViewed",
    }
    assert pack.supported_monetization == ("one_off_purchase",)


def test_bounce_emits_single_event():
    rng = random.Random(1)
    events = FintechPack().build_session(_user(), _now(), "bounce", _state(), rng)
    assert len(events) == 1
    assert events[0][1] == "SessionStart"


def test_browser_emits_balance_checked():
    rng = random.Random(1)
    events = FintechPack().build_session(_user(), _now(), "browser", _state(), rng)
    names = [ev[1] for ev in events]
    assert "BalanceChecked" in names
    assert not _CONVERSION_EVENTS.intersection(names)


def test_converter_emits_conversion_event():
    rng = random.Random(1)
    events = FintechPack().build_session(_user(), _now(), "converter", _state(), rng)
    names = [ev[1] for ev in events]
    assert any(n in _CONVERSION_EVENTS for n in names)


def test_new_user_converter_gets_account_opened():
    rng = random.Random(1)
    events = FintechPack().build_session(
        _user(is_returning=False), _now(), "converter", _state(), rng
    )
    names = [ev[1] for ev in events]
    assert "AccountOpened" in names


def test_returning_user_converter_no_account_opened():
    rng = random.Random(1)
    events = FintechPack().build_session(
        _user(is_returning=True), _now(), "converter", _state(), rng
    )
    names = [ev[1] for ev in events]
    assert "AccountOpened" not in names


def test_unknown_archetype_raises():
    rng = random.Random(1)
    with pytest.raises(ValueError, match="unknown archetype"):
        FintechPack().build_session(_user(), _now(), "mystery", _state(), rng)


def test_event_tuples_have_7_fields():
    rng = random.Random(1)
    events = FintechPack().build_session(_user(), _now(), "converter", _state(), rng)
    for ev in events:
        assert isinstance(ev, tuple) and len(ev) == 7
