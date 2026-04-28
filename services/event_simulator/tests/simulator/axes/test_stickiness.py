"""Stickiness axis — RetentionParams configuration."""

from __future__ import annotations

import pytest

from services.event_simulator.simulator.axes.stickiness import _PARAMS, StickinessAxis
from services.event_simulator.simulator.protocols import SimulationState


def _state() -> SimulationState:
    return SimulationState(random_seed=42, total_users=1000, window_days=180)


@pytest.mark.parametrize(
    "value",
    ["addictive", "sticky", "normal", "churn_heavy", "one_shot"],
)
def test_stickiness_axis_values_register(value):
    assert value in StickinessAxis().values


def test_apply_sets_retention_params():
    state = _state()
    StickinessAxis().apply("normal", state)
    assert state.retention_params is not None
    assert state.hazard_curve is None


def test_apply_sets_correct_params_for_each_value():
    for value in ["addictive", "sticky", "normal", "churn_heavy", "one_shot"]:
        state = _state()
        StickinessAxis().apply(value, state)
        assert state.retention_params == _PARAMS[value]


def test_ordering_of_peak_churn_rates():
    """one_shot > churn_heavy > normal > sticky > addictive."""
    rates = [
        _PARAMS[v].peak_churn_rate
        for v in ["one_shot", "churn_heavy", "normal", "sticky", "addictive"]
    ]
    assert rates == sorted(rates, reverse=True)


def test_ordering_of_base_churn_rates():
    """one_shot and normal > sticky > addictive (base churn decreases toward addictive).

    churn_heavy has a LOW base_churn_rate (0.015) by design: high initial (peak) churn
    models trial drop-off, but engaged users who stay past D1 have good long-term retention.
    The meaningful ordering is: one_shot >> normal > sticky > addictive.
    """
    assert _PARAMS["one_shot"].base_churn_rate > _PARAMS["normal"].base_churn_rate
    assert _PARAMS["normal"].base_churn_rate > _PARAMS["sticky"].base_churn_rate
    assert _PARAMS["sticky"].base_churn_rate > _PARAMS["addictive"].base_churn_rate
    # churn_heavy: high PEAK churn (trial drop-off), low BASE churn (engaged users stay)
    assert _PARAMS["churn_heavy"].peak_churn_rate >= _PARAMS["normal"].peak_churn_rate


def test_addictive_has_high_reactivation():
    assert _PARAMS["addictive"].reactivation_rate > _PARAMS["normal"].reactivation_rate


def test_one_shot_has_low_reactivation():
    assert _PARAMS["one_shot"].reactivation_rate < _PARAMS["normal"].reactivation_rate


def test_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown stickiness value"):
        StickinessAxis().apply("glue", state)
