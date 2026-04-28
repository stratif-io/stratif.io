"""Preset-level plausibility acceptance tests.

Each test pins a real-world metric range derived from public data:
  - Tinder: 530 M lifetime registered, 26 M DAU, 75 M MAU (2023)
  - Portable North Pole: 35 M downloads, ~95 % activity in Nov–Dec window

Tests use `run_preview` with the production YAML config so they catch
regressions in both the engine and the preset parameters.
"""

from __future__ import annotations

import pytest

from services.event_simulator.simulator import load_preset
from services.event_simulator.simulator.preview import run_preview

# ---------------------------------------------------------------------------
# Tinder — Dating App Churn
# ---------------------------------------------------------------------------


def test_tinder_produces_nonzero_total_users():
    result = run_preview(load_preset("dating_app_churn"))
    total = sum(result.new_users)
    assert total > 0, "Tinder preset produced zero users"


def test_tinder_first_year_has_at_least_1pct_of_lifetime_users():
    """Launch year (Sept 2012 – Sept 2013) must have visible activity.

    With the old exp(0.06 × 3235) growth, the first year was effectively
    zero and 48 M new users appeared on the last day.
    """
    result = run_preview(load_preset("dating_app_churn"))
    total = sum(result.new_users)
    assert total > 0
    first_year = sum(result.new_users[:365])
    ratio = first_year / total
    assert ratio >= 0.01, (
        f"Tinder first year: {ratio:.2%} of lifetime users (need ≥1 %)"
    )


def test_tinder_peak_to_average_ratio_below_50():
    """Peak new-signups/day should not dwarf the average by more than 50×.

    Old behaviour: peak=48.1 M, avg=106 K → ratio=453×.
    Target: realistic peak might be 5× the average on a very viral day.
    We accept up to 50× to leave headroom for event spikes.
    """
    result = run_preview(load_preset("dating_app_churn"))
    nu = result.new_users
    avg = sum(nu) / max(len(nu), 1)
    peak = max(nu)
    ratio = peak / max(avg, 1)
    assert ratio < 50, f"Tinder peak/avg = {ratio:.0f}× (need < 50×)"


def test_tinder_peak_active_users_above_1_million():
    """At its peak, Tinder should have millions of active users.

    The preview cohort simulation samples a capped number of users and scales
    them up. Over a 13-year window, the peak should reflect the 2015-2019
    viral growth phase and show ≥1 M active users at its highest point.
    (Real Tinder: ~26 M DAU at peak.)
    """
    result = run_preview(load_preset("dating_app_churn"))
    peak_active = max(result.active_users) if result.active_users else 0
    assert peak_active >= 1_000_000, (
        f"Tinder peak active = {peak_active:,.0f} (need ≥1 M)"
    )


def test_churn_heavy_stickiness_above_15pct():
    """churn_heavy stickiness should produce DAU/MAU ≥15 % over a 1-year window.

    We test with a standalone 1-year config (same axes as Tinder) to avoid
    the long-window cohort sampling issue where only ~361 users are simulated
    across 4977 days. With 1 year and 10K users the cohort model is rich enough
    to measure stickiness reliably.
    """
    from services.event_simulator.simulator.config import (
        MarkovConfig,
        ScaleOverride,
        SimulationConfig,
    )
    from services.event_simulator.simulator.markov import MarkovEvent

    config = SimulationConfig(
        name="stickiness-test",
        axes={"growth": "strong", "stickiness": "churn_heavy"},
        markov=MarkovConfig(
            events=[MarkovEvent(name="Open"), MarkovEvent(name="Swipe")],
            start={"Open": 1.0},
            transitions={"Open": {"Swipe": 0.6, "[end]": 0.4}, "Swipe": {"[end]": 1.0}},
        ),
        scale_config=ScaleOverride(total_users=10_000, window_days=365),
        random_seed=42,
    )
    result = run_preview(config)
    warmup = 30
    stickiness = result.stickiness[warmup:]
    avg = sum(stickiness) / max(len(stickiness), 1)
    assert avg >= 0.15, f"churn_heavy DAU/MAU = {avg:.1%} (need ≥15 %)"


# ---------------------------------------------------------------------------
# Portable North Pole — Holiday Seasonal App
# ---------------------------------------------------------------------------


def test_pnp_produces_nonzero_total_users():
    """PNP was previously returning total 0 due to growth blowup."""
    result = run_preview(load_preset("portable_north_pole"))
    total = sum(result.new_users)
    assert total > 0, "PNP preset produced zero users"


def test_pnp_december_activity_far_exceeds_summer():
    """December new users should be at least 15× July average.

    PNP starts 2009-11-01:
    - Day 0 = 2009-11-01
    - Day 30 = 2009-12-01  (first December)
    - Day 212 = 2010-05-31 (first June-ish)
    - Day 242 = 2010-07-01 (first July)
    - Day 395 = 2010-12-01 (second December)
    Use second December vs first July to avoid launch spike interference.
    """
    result = run_preview(load_preset("portable_north_pole"))
    nu = result.new_users
    n = len(nu)
    if n < 430:
        pytest.skip("window too short to test multi-year seasonality")

    # Second December: days 395-425
    dec_avg = sum(nu[395:426]) / 31 if n > 426 else sum(nu[395:n]) / max(n - 395, 1)
    # First July: days 242-272
    jul_avg = sum(nu[242:273]) / 31 if n > 273 else 0

    assert dec_avg > 0, "December activity is zero"
    ratio = dec_avg / max(jul_avg, 0.001)
    assert ratio >= 15, (
        f"PNP Dec/Jul ratio = {ratio:.1f}× (need ≥15×); "
        f"dec_avg={dec_avg:.1f}, jul_avg={jul_avg:.1f}"
    )


def test_pnp_nov_dec_carries_majority_of_annual_users():
    """In the second year, Nov+Dec should have >50 % of annual new signups.

    PNP starts 2009-11-01, so:
    - Year 1 = days 0–364 (2009-11-01 → 2010-10-31)
    - Year 2 = days 365–729 (2010-11-01 → 2011-10-31)
    Year 2 also starts in November, so within the year2 slice:
    - Nov 2010 = year2[0:30]   (days 365-394 absolute)
    - Dec 2010 = year2[30:61]  (days 395-425 absolute)
    - The rest (Jan-Oct 2011) = year2[61:] = near-zero for PNP
    """
    result = run_preview(load_preset("portable_north_pole"))
    nu = result.new_users
    n = len(nu)
    if n < 730:
        pytest.skip("window too short")
    year2 = nu[365:730]
    # Nov + Dec of year 2 = first 61 days of year2 (since year2 starts Nov 1)
    nov_dec = sum(year2[:61])
    year2_total = sum(year2)
    ratio = nov_dec / max(year2_total, 1)
    assert ratio >= 0.50, (
        f"PNP year-2 Nov+Dec share = {ratio:.1%} (need ≥50 %); "
        f"nov_dec={nov_dec:,}, year2_total={year2_total:,}"
    )
