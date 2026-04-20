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


def test_hockey_stick_split_fraction_from_growth_config():
    """growth_config.split_fraction moves the flat/blade inflection point."""
    state = _state()
    state.growth_config = {"split_fraction": 0.25}
    GrowthAxis().apply("hockey_stick", state)
    flat_end = int(WINDOW * 0.25) - 1
    # The flat region ends at 25% of the window now (not 40%).
    assert math.isclose(
        state.arrival_curve(0), state.arrival_curve(flat_end), rel_tol=0.05
    )
    # Day at 40% (which was the old split) should already be in the blade.
    assert state.arrival_curve(int(WINDOW * 0.4)) > state.arrival_curve(flat_end)


def test_hockey_stick_rate_from_growth_config():
    """growth_config.rate controls how steep the blade is."""
    steep_state = _state()
    steep_state.growth_config = {"rate": 0.06}
    gentle_state = _state()
    gentle_state.growth_config = {"rate": 0.005}
    GrowthAxis().apply("hockey_stick", steep_state)
    GrowthAxis().apply("hockey_stick", gentle_state)
    # Steep rate → last-day arrivals much higher than gentle rate (both curves
    # sum to the same TOTAL by construction).
    assert steep_state.arrival_curve(WINDOW - 1) > gentle_state.arrival_curve(
        WINDOW - 1
    )


def test_explosive_rate_override_from_growth_config():
    """growth_config.rate also applies to explosive / strong / declining."""
    fast_state = _state()
    fast_state.growth_config = {"rate": 0.2}
    slow_state = _state()
    slow_state.growth_config = {"rate": 0.01}
    GrowthAxis().apply("explosive", fast_state)
    GrowthAxis().apply("explosive", slow_state)
    # r=0.2 is steeper than r=0.01 → larger last-day/first-day ratio.
    fast_ratio = fast_state.arrival_curve(WINDOW - 1) / fast_state.arrival_curve(0)
    slow_ratio = slow_state.arrival_curve(WINDOW - 1) / slow_state.arrival_curve(0)
    assert fast_ratio > slow_ratio


def test_growth_config_none_uses_defaults():
    """No growth_config → original defaults (existing tests still pass)."""
    state = _state()
    assert state.growth_config is None
    GrowthAxis().apply("hockey_stick", state)
    # Default split_fraction=0.4, rate=0.06 — curve at day 0 roughly equals curve
    # at day (0.4×WINDOW − 1), matching pre-existing test assertions.
    flat_end = int(WINDOW * 0.4) - 1
    assert math.isclose(
        state.arrival_curve(0), state.arrival_curve(flat_end), rel_tol=0.05
    )
