"""Backward-compat shape test — the cohort engine emits plausible
ecommerce events for the default preset, with expected vocabulary and
distribution patterns.

Does NOT assert byte equality with the legacy path (structurally different).
The Engine is the default path from Phase 2a onward.
"""

from __future__ import annotations

from collections import Counter

from seeders.seeder import BaseSeeder, SeedConfig
from seeders.simulator import Engine, SimulationConfig
from seeders.simulator.config import ScaleOverride
from seeders.simulator.markov import MarkovConfig, MarkovEvent

_TINY_MARKOV = MarkovConfig(
    events=[MarkovEvent(name="PageView")],
    start={"PageView": 1.0},
    transitions={"PageView": {"[end]": 1.0}},
)


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def _drain_default() -> Counter[str]:
    cfg = SimulationConfig(
        name="ecommerce_steady",
        axes={"domain": "ecommerce", "growth": "steady", "stickiness": "normal", "scale": "tiny"},
        markov=_TINY_MARKOV,
        scale_config=ScaleOverride(total_users=500, window_days=30),
        random_seed=99,
    )
    seeder = _StubSeeder(config=SeedConfig())
    return Counter(ev[1] for batch in Engine(cfg, seeder).run() for ev in batch)


def test_default_preset_emits_all_funnel_steps():
    counts = _drain_default()
    for step in ["Home", "Search", "ProductView", "AddToCart", "Purchase"]:
        assert counts[step] > 0, (step, counts)


def test_default_preset_vocabulary_is_ecommerce_only():
    counts = _drain_default()
    assert set(counts) <= {"Home", "Search", "ProductView", "AddToCart", "Purchase"}


def test_funnel_counts_decrease_with_depth():
    counts = _drain_default()
    # Home is produced by every session; Search only by non-bounce sessions;
    # AddToCart and Purchase by deeper funnel archetypes. The funnel narrows.
    assert counts["Home"] > counts["Search"] > counts["AddToCart"] > counts["Purchase"]


def test_purchase_is_a_rare_event():
    counts = _drain_default()
    # Purchase is the deepest funnel step; should be a small fraction of Home events.
    assert counts["Purchase"] < counts["Home"] * 0.3
