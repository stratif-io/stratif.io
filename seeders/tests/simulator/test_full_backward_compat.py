"""Backward-compat shape test — the cohort engine emits plausible
events for the default config, with expected vocabulary and distribution patterns.

Does NOT assert byte equality with the legacy path (structurally different).
The Engine is the default path from Phase 2a onward.
"""

from __future__ import annotations

from collections import Counter

from seeders.seeder import BaseSeeder, SeedConfig
from seeders.simulator import Engine, SimulationConfig
from seeders.simulator.config import ScaleOverride
from seeders.simulator.markov import MarkovConfig, MarkovEvent

_FUNNEL_MARKOV = MarkovConfig(
    events=[
        MarkovEvent(name="Home"),
        MarkovEvent(name="Search"),
        MarkovEvent(name="ProductView"),
        MarkovEvent(name="AddToCart"),
        MarkovEvent(name="Purchase"),
    ],
    start={"Home": 1.0},
    transitions={
        "Home": {"Search": 0.6, "[end]": 0.4},
        "Search": {"ProductView": 0.7, "[end]": 0.3},
        "ProductView": {"AddToCart": 0.4, "[end]": 0.6},
        "AddToCart": {"Purchase": 0.5, "[end]": 0.5},
        "Purchase": {"[end]": 1.0},
    },
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
        axes={"growth": "steady", "stickiness": "normal", "scale": "tiny"},
        markov=_FUNNEL_MARKOV,
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
    assert counts["Home"] > counts["Search"] > counts["AddToCart"] > counts["Purchase"]


def test_purchase_is_a_rare_event():
    counts = _drain_default()
    assert counts["Purchase"] < counts["Home"] * 0.3
