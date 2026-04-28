"""Tests for seasonality_curve in the preview engine."""

from __future__ import annotations

import pytest

from services.event_simulator.simulator.config import ScaleOverride, SimulationConfig
from services.event_simulator.simulator.markov import MarkovConfig, MarkovEvent
from services.event_simulator.simulator.preview import run_preview

# Minimal Markov config shared across tests
_MARKOV = MarkovConfig(
    events=[MarkovEvent(name="E")],
    start={"E": 1.0},
    transitions={"E": {"[end]": 1.0}},
)


def _config(
    axes: dict, window_days: int = 365, total_users: int = 1000
) -> SimulationConfig:
    return SimulationConfig(
        name="test",
        axes={"growth": "flat", "stickiness": "normal", "noise": "none", **axes},
        markov=_MARKOV,
        scale_config=ScaleOverride(total_users=total_users, window_days=window_days),
    )


def test_preview_result_has_seasonality_curve():
    """PreviewResult must have a seasonality_curve attribute."""
    cfg = _config({"monthly_seasonality": "flat"})
    result = run_preview(cfg)
    assert hasattr(result, "seasonality_curve")
    assert len(result.seasonality_curve) == 365


def test_seasonality_curve_flat_when_no_axis():
    """With no monthly_seasonality axis, seasonality_curve is uniform."""
    cfg = _config({})
    result = run_preview(cfg)
    # All values should be equal (flat cal multiplier = 1.0 for all days)
    vals = result.seasonality_curve
    assert max(vals) == pytest.approx(min(vals), rel=0.01)


def test_nov_dec_peak_higher_than_summer():
    """With nov_dec_peak starting from a Nov date, Nov/Dec days have higher cal values."""
    # Use 365 days starting from 2009-11-01 (by anchoring anomaly to that date)
    cfg = SimulationConfig(
        name="test",
        axes={
            "growth": "flat",
            "stickiness": "normal",
            "noise": "explicit",
            "monthly_seasonality": "nov_dec_peak",
        },
        markov=_MARKOV,
        scale_config=ScaleOverride(total_users=1000, window_days=365),
        events=[
            {
                "type": "product_launch",
                "name": "anchor",
                "start": "2009-11-01",
                "duration": "1d",
                "effect": {"arrivals": 1.0},
            }
        ],
    )
    result = run_preview(cfg)
    # Day 0 = Nov 1 2009: cal = 1.8 (november)
    # Day 30 = Dec 1 2009: cal = 2.5 (december)
    # Day 90 = Jan 29 2010: cal = 0.3 (january)
    # Day 240 = Jul 29 2010: cal = 0.2 (july)
    # Seasonality curve is normalized, so we check relative values
    nov_val = result.seasonality_curve[0]  # Nov 2009
    dec_val = result.seasonality_curve[30]  # Dec 2009
    jan_val = result.seasonality_curve[90]  # late Jan 2010
    jul_val = result.seasonality_curve[240]  # late Jul 2010

    assert nov_val > jul_val * 3, (
        f"Nov ({nov_val:.1f}) should be > 3× July ({jul_val:.1f})"
    )
    assert dec_val > jan_val * 3, (
        f"Dec ({dec_val:.1f}) should be > 3× Jan ({jan_val:.1f})"
    )
    assert dec_val >= nov_val, f"Dec ({dec_val:.1f}) should be >= Nov ({nov_val:.1f})"
