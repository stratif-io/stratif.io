from __future__ import annotations

import random
import statistics

import pytest

from seeders.simulator.realism.inter_event import sample_inter_event_seconds


@pytest.mark.parametrize("kind", ["rapid", "normal", "slow"])
def test_returns_positive_seconds(kind):
    rng = random.Random(1)
    for _ in range(500):
        assert sample_inter_event_seconds(rng, kind) > 0


def test_rapid_much_shorter_than_slow():
    rng = random.Random(1)
    rapid = [sample_inter_event_seconds(rng, "rapid") for _ in range(500)]
    slow = [sample_inter_event_seconds(rng, "slow") for _ in range(500)]
    assert statistics.median(rapid) < statistics.median(slow)


def test_unknown_kind_raises():
    with pytest.raises(ValueError, match="unknown inter-event kind"):
        sample_inter_event_seconds(random.Random(1), "teleport")
