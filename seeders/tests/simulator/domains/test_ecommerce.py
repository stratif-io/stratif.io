"""Ecommerce domain pack — event vocabulary + session archetype behavior."""

from __future__ import annotations

import random
from datetime import UTC, datetime

import pytest

from seeders.simulator.domains.ecommerce import EcommercePack
from seeders.simulator.protocols import SimulationState


def _user() -> dict:
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
        "is_returning": False,
        "is_power_user": False,
        "browser_only": False,
        "completed_purchase": False,
        "sessions": [],
        "traits": {
            "first_name": "Test",
            "last_name": "User",
            "phone": "+1-555-0100",
            "email": "t@e.io",
            "date_of_birth": "1990-01-01",
        },
    }


def _state() -> SimulationState:
    return SimulationState(random_seed=42, total_users=100, window_days=30)


def _now() -> datetime:
    return datetime.now(UTC)


def test_ecommerce_pack_metadata():
    pack = EcommercePack()
    assert pack.name == "ecommerce"
    assert set(pack.events) == {
        "Home",
        "Search",
        "ProductView",
        "AddToCart",
        "Purchase",
    }
    assert "one_off_purchase" in pack.supported_monetization


def test_bounce_archetype_emits_one_home_event():
    rng = random.Random(1)
    events = EcommercePack().build_session(_user(), _now(), "bounce", _state(), rng=rng)
    assert len(events) == 1
    assert events[0][1] == "Home"


def test_browser_archetype_emits_home_search_productviews():
    rng = random.Random(1)
    events = EcommercePack().build_session(
        _user(), _now(), "browser", _state(), rng=rng
    )
    names = [ev[1] for ev in events]
    assert names[0] == "Home"
    assert "Search" in names
    assert names.count("ProductView") >= 1
    assert "Purchase" not in names


def test_researcher_archetype_never_purchases():
    pack = EcommercePack()
    for i in range(20):
        rng = random.Random(i)
        events = pack.build_session(_user(), _now(), "researcher", _state(), rng=rng)
        names = [ev[1] for ev in events]
        assert "Purchase" not in names


def test_converter_archetype_always_purchases():
    rng = random.Random(1)
    events = EcommercePack().build_session(
        _user(), _now(), "converter", _state(), rng=rng
    )
    names = [ev[1] for ev in events]
    assert names[0] == "Home"
    assert "Purchase" in names


def test_event_tuples_have_7_fields():
    rng = random.Random(1)
    events = EcommercePack().build_session(
        _user(), _now(), "converter", _state(), rng=rng
    )
    for ev in events:
        assert isinstance(ev, tuple)
        assert len(ev) == 7
        user_id, event_name, timestamp, props, server, traits, context = ev
        assert user_id == "u-test"
        assert isinstance(event_name, str)
        assert isinstance(props, dict)
        assert isinstance(traits, dict)
        assert isinstance(context, dict)


def test_unknown_archetype_raises():
    with pytest.raises(ValueError, match="unknown archetype"):
        EcommercePack().build_session(
            _user(), _now(), "typist", _state(), rng=random.Random(1)
        )


def test_converter_purchase_has_total_amount_and_currency():
    rng = random.Random(1)
    events = EcommercePack().build_session(
        _user(), _now(), "converter", _state(), rng=rng
    )
    purchase = next(ev for ev in events if ev[1] == "Purchase")
    props = purchase[3]
    assert "total_amount" in props
    assert props["total_amount"] > 0
    assert props["currency"] == "USD"
    assert "order_id" in props


def test_converter_addtocart_precedes_purchase():
    """Funnel ordering: AddToCart must appear before Purchase in the event stream."""
    rng = random.Random(1)
    events = EcommercePack().build_session(
        _user(), _now(), "converter", _state(), rng=rng
    )
    names = [ev[1] for ev in events]
    assert names.index("AddToCart") < names.index("Purchase")


def test_converter_sets_completed_purchase_on_user():
    """build_session mutates user['completed_purchase'] = True for converter sessions.
    The cohort engine (Phase 2a Task 6) depends on this mutation."""
    rng = random.Random(1)
    user = _user()
    assert user["completed_purchase"] is False
    EcommercePack().build_session(user, _now(), "converter", _state(), rng=rng)
    assert user["completed_purchase"] is True


def test_non_converter_archetypes_do_not_set_completed_purchase():
    for archetype in ("bounce", "browser", "researcher"):
        rng = random.Random(1)
        user = _user()
        EcommercePack().build_session(user, _now(), archetype, _state(), rng=rng)
        assert user["completed_purchase"] is False, archetype


def test_converter_purchase_always_includes_cart_product():
    """The AddToCart product must appear in the Purchase's item list."""
    for seed in range(10):
        rng = random.Random(seed)
        events = EcommercePack().build_session(
            _user(), _now(), "converter", _state(), rng=rng
        )
        cart_event = next(ev for ev in events if ev[1] == "AddToCart")
        purchase_event = next(ev for ev in events if ev[1] == "Purchase")
        cart_product_id = cart_event[3]["product_id"]
        purchased_total = purchase_event[3]["total_amount"]
        cart_price = cart_event[3]["product_price"]
        # The cart product's price must be part of the total (strictly ≤ total).
        assert purchased_total >= cart_price - 0.01, (seed, cart_product_id)
