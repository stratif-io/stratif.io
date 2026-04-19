"""Growth axis — 7 curve shapes."""

from __future__ import annotations

import math

import pytest

from seeders.simulator.axes.growth import GrowthAxis
from seeders.simulator.protocols import SimulationState

TOTAL = 10_000
WINDOW = 90


def _state(seed: int = 42) -> SimulationState:
    return SimulationState(random_seed=seed, total_users=TOTAL, window_days=WINDOW)


def _cumulative(curve, window: int) -> float:
    return sum(curve(d) for d in range(window))


@pytest.mark.parametrize(
    "value",
    ["explosive", "strong", "steady", "flat", "declining", "seasonal", "hockey_stick"],
)
def test_growth_axis_values_register(value):
    ax = GrowthAxis()
    assert value in ax.values


@pytest.mark.parametrize(
    "value",
    ["explosive", "strong", "steady", "flat", "declining", "hockey_stick"],
)
def test_growth_cumulative_approximates_total_users(value):
    state = _state()
    GrowthAxis().apply(value, state)
    cumulative = _cumulative(state.arrival_curve, WINDOW)
    assert 0.9 * TOTAL <= cumulative <= 1.1 * TOTAL, (value, cumulative)


def test_seasonal_has_zero_net_growth_over_full_year():
    state = SimulationState(random_seed=1, total_users=TOTAL, window_days=365)
    GrowthAxis().apply("seasonal", state)
    cumulative = _cumulative(state.arrival_curve, 365)
    assert 0.95 * TOTAL <= cumulative <= 1.05 * TOTAL


def test_explosive_late_window_much_higher_than_early():
    state = _state()
    GrowthAxis().apply("explosive", state)
    early = state.arrival_curve(5)
    late = state.arrival_curve(WINDOW - 5)
    assert late > 3 * early


def test_declining_early_window_much_higher_than_late():
    state = _state()
    GrowthAxis().apply("declining", state)
    early = state.arrival_curve(5)
    late = state.arrival_curve(WINDOW - 5)
    assert early > 2 * late


def test_hockey_stick_first_half_is_roughly_flat():
    state = _state()
    GrowthAxis().apply("hockey_stick", state)
    flat_end = int(WINDOW * 0.4) - 1
    assert math.isclose(
        state.arrival_curve(0), state.arrival_curve(flat_end), rel_tol=0.05
    )
    assert state.arrival_curve(WINDOW - 1) > 3 * state.arrival_curve(flat_end)


def test_growth_axis_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown growth value"):
        GrowthAxis().apply("galactic", state)


def test_steady_is_constant():
    state = _state()
    GrowthAxis().apply("steady", state)
    values = [state.arrival_curve(d) for d in range(WINDOW)]
    assert len({round(v, 6) for v in values}) == 1
