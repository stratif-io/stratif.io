"""Black-box backward-compat — legacy path vs Engine path produce the same
event totals for the default preset at the same RNG seed.
"""

from __future__ import annotations

import random
from collections import Counter

from seeders.seeder import BaseSeeder, SeedConfig
from seeders.simulator import Engine, SimulationConfig
from seeders.simulator.config import ScaleOverride


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def _event_name_counts(batches) -> Counter[str]:
    counts: Counter[str] = Counter()
    for batch in batches:
        for ev in batch:
            counts[ev[1]] += 1
    return counts


def _cfg(seed: int) -> SimulationConfig:
    return SimulationConfig(
        name="ecommerce_steady",
        domain="ecommerce",
        axes={"scale": "tiny"},
        scale_config=ScaleOverride(total_users=30, window_days=4),
        random_seed=seed,
    )


def test_legacy_and_engine_produce_identical_event_distribution():
    # Legacy path
    legacy = _StubSeeder(config=SeedConfig(seed_users=30, seed_days=4))
    random.seed(123)
    legacy._generate_products()
    legacy_users = legacy._generate_users()
    legacy_counts = _event_name_counts(legacy._generate_events_batched(legacy_users))

    # Engine path — construct the seeder with a BARE SeedConfig on purpose:
    # the Engine must populate seed_users/seed_days from the SimulationConfig
    # before the generation methods read them. If the Engine syncs too late,
    # _generate_users() produces 0 users and this test fails loudly.
    engine_seeder = _StubSeeder(config=SeedConfig())
    engine_counts = _event_name_counts(Engine(_cfg(123), engine_seeder).run())

    assert legacy_counts == engine_counts, (
        f"distribution mismatch:\n  legacy={legacy_counts}\n  engine={engine_counts}"
    )
