"""Plausibility tests for simulator behavior over multi-year windows.

These tests define WHAT the simulator should produce, not HOW. They are
intentionally axis-level so failures point directly at the broken component.
"""

from __future__ import annotations

from services.event_simulator.simulator.config import (
    MarkovConfig,
    ScaleOverride,
    SimulationConfig,
)
from services.event_simulator.simulator.markov import MarkovEvent
from services.event_simulator.simulator.preview import run_preview

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

_MINIMAL_MARKOV = MarkovConfig(
    events=[MarkovEvent(name="Open"), MarkovEvent(name="Action")],
    start={"Open": 1.0},
    transitions={"Open": {"Action": 0.5, "[end]": 0.5}, "Action": {"[end]": 1.0}},
)


def _cfg(
    growth: str = "strong",
    stickiness: str = "normal",
    monthly: str = "flat",
    window_days: int = 365,
    total_users: int = 10_000,
    growth_config: dict | None = None,
    start_date: str | None = None,
    seed: int = 42,
) -> SimulationConfig:
    return SimulationConfig(
        name="test",
        axes={
            "growth": growth,
            "stickiness": stickiness,
            "monthly_seasonality": monthly,
        },
        markov=_MINIMAL_MARKOV,
        scale_config=ScaleOverride(
            total_users=total_users,
            window_days=window_days,
            start_date=start_date,
        ),
        growth_config=growth_config,
        random_seed=seed,
    )


# ---------------------------------------------------------------------------
# Growth distribution over long windows
# ---------------------------------------------------------------------------


def test_strong_growth_first_year_has_at_least_10pct_of_users():
    """Strong growth over 3 years must not concentrate everything in the last days.

    Previously, exp(0.02 * 1095) = exp(21.9) caused near-zero activity for
    the first 2 years and a cliff at the end. After the fix, the first 365
    days should carry at least 10 % of total users.
    """
    result = run_preview(_cfg(growth="strong", window_days=1095, total_users=100_000))
    total = sum(result.new_users)
    assert total > 0, "no users produced at all"
    first_year = sum(result.new_users[:365])
    ratio = first_year / total
    assert ratio >= 0.10, (
        f"first year has only {ratio:.1%} of users (need ≥10 %); "
        f"growth is still collapsing to the last few days"
    )


def test_strong_growth_peak_to_average_ratio_below_30():
    """Peak day / average day must be < 30 over a 3-year window.

    The current exponential blow-up produces peak≈48 M, avg≈106 K → ratio 450×.
    After window-normalised rates, the shape should be much more uniform.
    """
    result = run_preview(_cfg(growth="strong", window_days=1095, total_users=100_000))
    nu = result.new_users
    avg = sum(nu) / max(len(nu), 1)
    peak = max(nu)
    ratio = peak / max(avg, 1)
    assert ratio < 30, f"peak/avg = {ratio:.1f}× — still blowing up (need < 30×)"


def test_explosive_growth_first_year_nonzero():
    """Explosive growth should still produce visible activity in year 1 of a 5-year window."""
    result = run_preview(
        _cfg(growth="explosive", window_days=1825, total_users=500_000)
    )
    first_year = sum(result.new_users[:365])
    total = sum(result.new_users)
    assert total > 0
    assert first_year / total >= 0.02, (
        f"explosive: first-year share {first_year / total:.1%} — needs ≥2 %"
    )


def test_hockey_stick_flat_phase_carries_at_least_5pct():
    """The flat phase of hockey-stick growth must have visible user counts.

    Split at 30 % → first 30 % of a 4-year window ≈ 438 days should have
    at least 5 % of lifetime users.
    """
    window = 1460
    result = run_preview(
        _cfg(
            growth="hockey_stick",
            window_days=window,
            total_users=500_000,
            growth_config={"split_fraction": 0.30},
        )
    )
    split = int(window * 0.30)
    flat_total = sum(result.new_users[:split])
    full_total = sum(result.new_users)
    assert full_total > 0
    ratio = flat_total / full_total
    assert ratio >= 0.05, (
        f"hockey-stick flat phase has {ratio:.1%} of users (need ≥5 %)"
    )


def test_hockey_stick_growth_phase_has_more_users_than_flat():
    """After the inflection the growth phase must have more users than the flat phase."""
    window = 1460
    result = run_preview(
        _cfg(
            growth="hockey_stick",
            window_days=window,
            total_users=500_000,
            growth_config={"split_fraction": 0.30},
        )
    )
    split = int(window * 0.30)
    flat_total = sum(result.new_users[:split])
    growth_total = sum(result.new_users[split:])
    assert growth_total > flat_total, (
        f"growth phase ({growth_total:,}) ≤ flat phase ({flat_total:,})"
    )


def test_s_curve_growth_exists_and_has_visible_early_activity():
    """S-curve growth shape must be registered and produce >15 % in first third."""
    window = 1095
    result = run_preview(
        _cfg(growth="s_curve", window_days=window, total_users=100_000)
    )
    total = sum(result.new_users)
    assert total > 0, "s_curve produced zero users"
    first_third = sum(result.new_users[: window // 3])
    ratio = first_third / total
    assert ratio >= 0.15, f"s_curve: first-third share {ratio:.1%} (need ≥15 %)"


def test_s_curve_middle_third_is_largest():
    """S-curve should peak near the middle of the window."""
    window = 1095
    result = run_preview(
        _cfg(growth="s_curve", window_days=window, total_users=100_000)
    )
    third = window // 3
    first = sum(result.new_users[:third])
    middle = sum(result.new_users[third : 2 * third])
    last = sum(result.new_users[2 * third :])
    assert middle >= first and middle >= last, (
        f"s_curve middle ({middle:,}) is not the largest segment "
        f"(first={first:,}, last={last:,})"
    )


# ---------------------------------------------------------------------------
# Annual growth rate override
# ---------------------------------------------------------------------------


def test_growth_config_annual_rate_overrides_default():
    """growth_config.annual_rate should control YoY growth independently of preset."""
    # 10% YoY → shape ratio over 730 days ≈ exp(2 * ln(1.1)) = 1.21×
    low = run_preview(
        _cfg(
            growth="strong",
            window_days=730,
            total_users=50_000,
            growth_config={"annual_rate": 1.10},
        )
    )
    high = run_preview(
        _cfg(
            growth="strong",
            window_days=730,
            total_users=50_000,
            growth_config={"annual_rate": 3.00},
        )
    )
    # last-quarter / first-quarter ratio must be higher for the faster rate
    lo_ratio = sum(low.new_users[547:]) / max(sum(low.new_users[:183]), 1)
    hi_ratio = sum(high.new_users[547:]) / max(sum(high.new_users[:183]), 1)
    assert hi_ratio > lo_ratio, (
        f"annual_rate=3× ratio ({hi_ratio:.2f}) not > annual_rate=1.1× ratio ({lo_ratio:.2f})"
    )


# ---------------------------------------------------------------------------
# Monthly seasonality strength
# ---------------------------------------------------------------------------


def test_nov_dec_peak_concentrates_over_40pct_in_two_months():
    """With nov_dec_peak, November + December combined should have >40 % of users
    in a full calendar year starting January 1.
    """
    # 365-day window starting Jan 1 → Nov starts at day 304, Dec at day 334
    result = run_preview(
        _cfg(
            monthly="nov_dec_peak",
            window_days=365,
            total_users=50_000,
            start_date="2020-01-01",
            growth_config={"annual_rate": 1.0},  # flat so shape doesn't interfere
        )
    )
    nov_dec = sum(result.new_users[304:])  # days 304-364 = Nov-Dec (61 days)
    total = sum(result.new_users)
    ratio = nov_dec / max(total, 1)
    assert ratio >= 0.40, f"nov_dec_peak: Nov+Dec has {ratio:.1%} of users (need ≥40 %)"


def test_nov_dec_peak_monthly_ratio_dec_vs_july():
    """December average should be at least 8× July average."""
    result = run_preview(
        _cfg(
            monthly="nov_dec_peak",
            window_days=365,
            total_users=50_000,
            start_date="2020-01-01",
            growth_config={"annual_rate": 1.0},
        )
    )
    # July = days 182-212 (31 days), December = days 334-364 (31 days)
    july_avg = sum(result.new_users[182:213]) / 31
    dec_avg = sum(result.new_users[334:365]) / 31
    ratio = dec_avg / max(july_avg, 0.001)
    assert ratio >= 8.0, f"Dec/July ratio is {ratio:.1f}× (need ≥8×)"


def test_nov_dec_extreme_concentrates_over_70pct_in_six_weeks():
    """nov_dec_extreme should put >70 % of users in the Nov 15–Dec 31 window."""
    result = run_preview(
        _cfg(
            monthly="nov_dec_extreme",
            window_days=365,
            total_users=50_000,
            start_date="2020-01-01",
            growth_config={"annual_rate": 1.0},
        )
    )
    # Nov 15 = day 319, Dec 31 = day 365
    peak_window = sum(result.new_users[319:])
    total = sum(result.new_users)
    ratio = peak_window / max(total, 1)
    assert ratio >= 0.70, (
        f"nov_dec_extreme: 6-week window has {ratio:.1%} of users (need ≥70 %)"
    )
