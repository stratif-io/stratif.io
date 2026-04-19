"""Stickiness axis — user-lifetime distributions."""

from __future__ import annotations

import random
import statistics

import pytest

from seeders.simulator.axes.stickiness import StickinessAxis
from seeders.simulator.protocols import SimulationState


def _state() -> SimulationState:
    return SimulationState(random_seed=42, total_users=1000, window_days=180)


def _sample_lifetimes(state, n: int = 5000) -> list[int]:
    rng = random.Random(42)
    return [state.hazard_curve(rng) for _ in range(n)]


@pytest.mark.parametrize(
    "value",
    ["addictive", "sticky", "normal", "churn_heavy", "one_shot"],
)
def test_stickiness_axis_values_register(value):
    assert value in StickinessAxis().values


def test_one_shot_lifetimes_are_zero():
    state = _state()
    StickinessAxis().apply("one_shot", state)
    assert all(lt == 0 for lt in _sample_lifetimes(state, n=100))


def test_churn_heavy_median_is_short():
    state = _state()
    StickinessAxis().apply("churn_heavy", state)
    lifetimes = _sample_lifetimes(state)
    # Exponential(mean=20) → median ≈ 20·ln(2) ≈ 14
    median = statistics.median(lifetimes)
    assert 8 <= median <= 25


def test_normal_median_is_moderate():
    state = _state()
    StickinessAxis().apply("normal", state)
    lifetimes = _sample_lifetimes(state)
    # Exponential(mean=90) → median ≈ 62
    median = statistics.median(lifetimes)
    assert 40 <= median <= 100


def test_addictive_has_fat_tail():
    state = _state()
    StickinessAxis().apply("addictive", state)
    lifetimes = _sample_lifetimes(state)
    # Weibull(k=0.5, λ=120): heavy fat tail — at least 8% of users with lifetime > 300.
    fat_tail = sum(1 for lt in lifetimes if lt > 300) / len(lifetimes)
    assert fat_tail > 0.08


def test_ordering_of_median_lifetimes():
    """churn_heavy < normal < sticky (ordering of median lifetimes)."""
    rng_medians = {}
    for value in ["churn_heavy", "normal", "sticky"]:
        state = _state()
        StickinessAxis().apply(value, state)
        rng_medians[value] = statistics.median(_sample_lifetimes(state))
    assert rng_medians["churn_heavy"] < rng_medians["normal"] < rng_medians["sticky"]


def test_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown stickiness value"):
        StickinessAxis().apply("glue", state)
