"""Integration smoke tests: full engine run with Markov config."""

from __future__ import annotations

from collections import Counter
from datetime import datetime

from services.event_simulator.seeder import BaseSeeder, SeedConfig
from services.event_simulator.simulator import Engine, SimulationConfig
from services.event_simulator.simulator.config import ScaleOverride
from services.event_simulator.simulator.markov import MarkovConfig, MarkovEvent

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _minimal_markov_config() -> SimulationConfig:
    """A tiny 2-event Markov config for fast smoke tests."""
    markov = MarkovConfig(
        events=[
            MarkovEvent(name="PageView"),
            MarkovEvent(name="SignUp"),
        ],
        start={"PageView": 1.0},
        transitions={
            "PageView": {"SignUp": 0.5, "[end]": 0.5},
            "SignUp": {"[end]": 1.0},
        },
    )
    return SimulationConfig(
        name="smoke_test",
        axes={
            "growth": "flat",
            "stickiness": "normal",
            "scale": "small",
        },
        markov=markov,
        # Override to a tiny scale so tests run fast.
        scale_config=ScaleOverride(total_users=200, window_days=7),
        random_seed=42,
    )


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def _drain(cfg: SimulationConfig) -> list[list[tuple]]:
    seeder = _StubSeeder(config=SeedConfig())
    return list(Engine(cfg, seeder).run())


def _all_events(batches: list[list[tuple]]) -> list[tuple]:
    return [ev for batch in batches for ev in batch]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_engine_run_produces_events():
    """Engine run over a 7-day window produces at least 1 event."""
    batches = _drain(_minimal_markov_config())
    events = _all_events(batches)
    assert len(events) > 50, f"engine produced suspiciously few events: {len(events)}"


def test_engine_only_emits_declared_events():
    """All event names in the output are in the declared events list.

    '[end]' is a sentinel — it must never appear as an actual event name.
    """
    batches = _drain(_minimal_markov_config())
    declared = {"PageView", "SignUp"}
    emitted = {ev[1] for ev in _all_events(batches)}
    assert emitted, "no events emitted — cannot verify vocabulary"
    assert emitted <= declared, f"unexpected event names: {emitted - declared}"
    assert "[end]" not in emitted, "'[end]' sentinel leaked into output"


def test_engine_run_is_deterministic():
    """Two runs with the same seed produce identical event counts."""
    cfg = _minimal_markov_config()
    counts_a = Counter(ev[1] for ev in _all_events(_drain(cfg)))
    counts_b = Counter(ev[1] for ev in _all_events(_drain(cfg)))
    assert counts_a == counts_b, (
        f"non-deterministic output: run1={counts_a}, run2={counts_b}"
    )


def test_engine_session_structure():
    """Events have the expected fields: (user_id, event_name, timestamp, ...)."""
    batches = _drain(_minimal_markov_config())
    events = _all_events(batches)
    assert events, "no events to inspect"

    for ev in events[:20]:  # sample the first 20 to keep test fast
        user_id, event_name, timestamp, *rest = ev
        # user_id is a UUID string
        assert isinstance(user_id, str) and len(user_id) == 36, (
            f"unexpected user_id shape: {user_id!r}"
        )
        # event_name is one of the declared events
        assert event_name in {"PageView", "SignUp"}, (
            f"unexpected event name: {event_name!r}"
        )
        # timestamp is a datetime
        assert isinstance(timestamp, datetime), (
            f"timestamp is not a datetime: {type(timestamp)}"
        )
        # rest[-1] should be a dict (props)
        assert rest, "event tuple has no trailing fields"
        props = rest[-1]
        assert isinstance(props, dict), f"last field is not a dict: {type(props)}"
