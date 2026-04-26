"""Tests for MarkovConfig validation and MarkovRunner session generation."""

from __future__ import annotations

import random
from datetime import UTC, datetime

import pytest

from seeders.simulator.markov import MarkovConfig, MarkovEvent, MarkovRunner

# ── fixtures ──────────────────────────────────────────────────────────────────

_MINIMAL = MarkovConfig(
    events=[MarkovEvent(name="A"), MarkovEvent(name="B")],
    start={"A": 1.0},
    transitions={
        "A": {"B": 0.5, "[end]": 0.5},
        "B": {"[end]": 1.0},
    },
)

_USER = {
    "id": "u1",
    "is_returning": False,
    "country": "US",
    "city": "New York",
    "timezone": "America/New_York",
    "device_type": "Desktop",
    "browser": "Chrome",
    "os": "macOS",
    "screen_resolution": "1920x1080",
    "traits": {},
}

_T0 = datetime(2024, 1, 1, 10, 0, 0, tzinfo=UTC)

# ── MarkovConfig validation ───────────────────────────────────────────────────


def test_valid_config_does_not_raise():
    _ = _MINIMAL  # instantiation succeeded


def test_bad_start_sum_raises():
    with pytest.raises(ValueError, match="start distribution"):
        MarkovConfig(
            events=[MarkovEvent(name="A")],
            start={"A": 0.5},
            transitions={"A": {"[end]": 1.0}},
        )


def test_bad_row_sum_raises():
    with pytest.raises(ValueError, match="row 'A'"):
        MarkovConfig(
            events=[MarkovEvent(name="A")],
            start={"A": 1.0},
            transitions={"A": {"[end]": 0.4}},
        )


def test_unknown_from_event_raises():
    with pytest.raises(ValueError, match="not in events"):
        MarkovConfig(
            events=[MarkovEvent(name="A")],
            start={"A": 1.0},
            transitions={
                "A": {"[end]": 1.0},
                "X": {"[end]": 1.0},
            },
        )


def test_color_is_optional():
    cfg = MarkovConfig(
        events=[MarkovEvent(name="A", color="#ff0000")],
        start={"A": 1.0},
        transitions={"A": {"[end]": 1.0}},
    )
    assert cfg.events[0].color == "#ff0000"


# ── MarkovRunner ──────────────────────────────────────────────────────────────


def test_build_session_terminates():
    runner = MarkovRunner(_MINIMAL)
    events = runner.build_session(_USER, _T0, None, random.Random(42))
    assert isinstance(events, list)


def test_build_session_only_emits_declared_events():
    runner = MarkovRunner(_MINIMAL)
    rng = random.Random(0)
    for _ in range(100):
        evs = runner.build_session(_USER, _T0, None, rng)
        for ev in evs:
            assert ev[1] in ("A", "B"), f"unexpected event {ev[1]!r}"


def test_build_session_never_emits_end():
    runner = MarkovRunner(_MINIMAL)
    rng = random.Random(7)
    for _ in range(50):
        evs = runner.build_session(_USER, _T0, None, rng)
        assert all(ev[1] != "[end]" for ev in evs)


def test_build_session_timestamps_are_monotonic():
    runner = MarkovRunner(_MINIMAL)
    rng = random.Random(99)
    for _ in range(200):
        evs = runner.build_session(_USER, _T0, None, rng)
        if len(evs) >= 2:
            for i in range(1, len(evs)):
                assert evs[i][2] > evs[i - 1][2]
            break


def test_terminal_only_event_produces_one_event():
    cfg = MarkovConfig(
        events=[MarkovEvent(name="Ping")],
        start={"Ping": 1.0},
        transitions={"Ping": {"[end]": 1.0}},
    )
    runner = MarkovRunner(cfg)
    evs = runner.build_session(_USER, _T0, None, random.Random(1))
    assert len(evs) == 1
    assert evs[0][1] == "Ping"
