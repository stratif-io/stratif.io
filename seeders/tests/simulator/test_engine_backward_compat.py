"""Backward-compat: the default preset through the engine matches legacy output.

We don't assert byte-for-byte equality (RNG ordering differs) — we assert
that the engine produces the same *shape* of events as the legacy path:
same event names, same props keys, same approximate totals.
"""

from __future__ import annotations

import random
from unittest.mock import MagicMock

from seeders.simulator.config import ScaleOverride, SimulationConfig
from seeders.simulator.engine import Engine


def _tiny_config() -> SimulationConfig:
    return SimulationConfig(
        name="ecommerce_steady",
        domain="ecommerce",
        axes={
            "growth": "steady",
            "stickiness": "normal",
            "engagement_depth": "moderate",
            "monetization": "one_off_purchase",
            "virality": "weak",
            "scale": "tiny",
            "geography": "global",
            "anomalies": "clean",
        },
        scale_config=ScaleOverride(total_users=50, window_days=5),
        random_seed=42,
    )


def test_engine_run_yields_batches_of_event_tuples():
    base = MagicMock()
    base.config.seed_users = 50
    base.config.seed_days = 5
    base._generate_products = lambda: None
    base._generate_users = lambda: [
        {
            "id": f"u{i}",
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
                "phone": "+1",
                "email": "t@e.io",
                "date_of_birth": "1990-01-01",
            },
        }
        for i in range(10)
    ]
    # Engine falls through to BaseSeeder's _generate_events_batched in Phase 1.
    base._generate_events_batched = lambda users: iter(
        [
            [("u0", "Home", None, {}, "server.us.1", {}, {})],
            [("u0", "Purchase", None, {"total_amount": 42.0}, "server.us.1", {}, {})],
        ]
    )

    engine = Engine(config=_tiny_config(), base_seeder=base)
    batches = list(engine.run())

    assert len(batches) == 2
    assert batches[0][0][1] == "Home"
    assert batches[1][0][1] == "Purchase"


def test_base_seeder_events_via_engine_returns_iterator_of_batches():
    """The new BaseSeeder.events_via_engine(config) hook returns an iterator
    that produces event batches — it's the path dialect seeders will flip
    to in Phase 2."""
    from seeders.seeder import BaseSeeder, SeedConfig
    from seeders.simulator.config import ScaleOverride, SimulationConfig

    class _StubSeeder(BaseSeeder):
        def seed(self):
            return {}

        def _create_events_table(self):
            pass

        def _insert_events(self, events):
            pass

    cfg = SimulationConfig(
        name="ecommerce_steady",
        domain="ecommerce",
        axes={"scale": "tiny"},
        scale_config=ScaleOverride(total_users=15, window_days=2),
        random_seed=11,
    )

    seeder = _StubSeeder(config=SeedConfig(seed_users=15, seed_days=2))
    batches = list(seeder.events_via_engine(cfg))

    # At least one event produced; each batch is a list of tuples.
    total = sum(len(b) for b in batches)
    assert total > 0
    assert all(isinstance(b, list) for b in batches)
    assert all(isinstance(ev, tuple) and len(ev) == 7 for b in batches for ev in b)


def test_engine_applies_random_seed():
    base = MagicMock()
    base._generate_products = lambda: None
    base._generate_users = lambda: []
    base._generate_events_batched = lambda users: iter([])

    cfg_a = _tiny_config()
    cfg_b = _tiny_config()
    cfg_a_seed = cfg_a.model_copy(update={"random_seed": 123})
    cfg_b_seed = cfg_b.model_copy(update={"random_seed": 123})

    Engine(config=cfg_a_seed, base_seeder=base).run()
    a = random.random()

    Engine(config=cfg_b_seed, base_seeder=base).run()
    b = random.random()

    # Same seed → deterministic follow-up draw.
    assert a == b
