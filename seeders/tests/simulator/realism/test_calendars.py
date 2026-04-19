from __future__ import annotations

from datetime import date

from seeders.simulator.realism.calendars import calendar_multiplier


def test_ordinary_day_is_1():
    assert abs(calendar_multiplier(date(2025, 3, 10), "US") - 1.0) < 0.05


def test_christmas_eve_is_high_for_ecommerce():
    m = calendar_multiplier(date(2025, 12, 24), "US", domain="ecommerce")
    assert m > 1.5


def test_christmas_day_crashes():
    m = calendar_multiplier(date(2025, 12, 25), "US", domain="ecommerce")
    assert m < 0.5


def test_black_friday_spikes():
    # 2025 Black Friday: Nov 28
    m = calendar_multiplier(date(2025, 11, 28), "US", domain="ecommerce")
    assert m > 2.0


def test_valentines_leadup_is_elevated():
    m = calendar_multiplier(date(2025, 2, 13), "US", domain="ecommerce")
    assert m > 1.1


def test_new_years_in_japan():
    # Jan 1 is a major holiday in Japan
    m = calendar_multiplier(date(2025, 1, 1), "JP", domain="ecommerce")
    assert m < 0.7


def test_non_us_country_gets_no_us_shopping_season():
    # Black Friday is US-only; in JP on Nov 28 2025 there's no spike.
    m = calendar_multiplier(date(2025, 11, 28), "JP", domain="ecommerce")
    assert m < 1.5


def test_back_to_school_ramp():
    # Late August should be elevated.
    m = calendar_multiplier(date(2025, 8, 30), "US", domain="ecommerce")
    assert m > 1.1


def test_non_ecommerce_domain_gets_no_shopping_season():
    # Black Friday in a non-ecommerce domain: no US shopping spike.
    m = calendar_multiplier(date(2025, 11, 28), "US", domain="saas")
    assert m < 1.5


def test_crash_day_not_double_penalized():
    """Dec 25 US/ecommerce: holiday would give 0.1, shopping also gives 0.1.
    Crash-precedence rule must return the single 0.1 — not 0.01."""
    m = calendar_multiplier(date(2025, 12, 25), "US", domain="ecommerce")
    assert 0.05 < m < 0.2


def test_unmapped_country_falls_back_to_no_holidays():
    """Country code not in our mapping → no holiday adjustments applied.
    (Canada's July 1 is Canada Day, but we don't include CA in Phase 3.)"""
    m = calendar_multiplier(date(2025, 7, 1), "CA", domain="ecommerce")
    assert abs(m - 1.0) < 0.05
