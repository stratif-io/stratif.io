"""Country holidays + shopping-season calendar for realistic arrivals shaping.

Composes a public-holiday multiplier with a shopping-season multiplier.
Ordinary days return 1.0. Shopping-season "crash" values (≤ 0.5) take
precedence over holiday multipliers to avoid double-discounting.
"""

from __future__ import annotations

from datetime import date, timedelta
from functools import lru_cache

import holidays


@lru_cache(maxsize=32)
def _country_holidays(country: str) -> holidays.HolidayBase:
    mapping = {
        "US": "US",
        "UK": "GB",
        "DE": "DE",
        "FR": "FR",
        "JP": "JP",
        "BR": "BR",
        "IN": "IN",
        "AU": "AU",
    }
    code = mapping.get(country, "US")
    return holidays.country_holidays(code, years=[2024, 2025, 2026, 2027])


def _public_holiday_multiplier(d: date, country: str, domain: str) -> float:
    cal = _country_holidays(country)
    if d not in cal:
        return 1.0
    name = (cal.get(d, "") or "").lower()
    if "christmas" in name:
        return 0.1 if domain == "ecommerce" else 0.3
    return 0.3


def _nth_weekday(year: int, month: int, weekday: int, nth: int) -> date:
    """weekday: Mon=0 .. Sun=6. nth is 1-based."""
    first = date(year, month, 1)
    offset = (weekday - first.weekday()) % 7
    return first + timedelta(days=offset + 7 * (nth - 1))


def _is_black_friday(d: date) -> bool:
    if d.month != 11:
        return False
    thanksgiving = _nth_weekday(d.year, 11, 3, nth=4)  # Thursday=3
    return d == thanksgiving + timedelta(days=1)


def _is_cyber_monday(d: date) -> bool:
    if d.month not in (11, 12):
        return False
    thanksgiving = _nth_weekday(d.year, 11, 3, nth=4)
    return d == thanksgiving + timedelta(days=4)


def _is_mothers_day(d: date) -> bool:
    if d.month != 5:
        return False
    return d == _nth_weekday(d.year, 5, 6, nth=2)  # Sunday=6


def _shopping_season_multiplier(d: date, country: str, domain: str) -> float:
    if country != "US" or domain != "ecommerce":
        return 1.0

    # Christmas ramp: Dec 1 → Dec 24 linear 1.0 → 2.0
    if d.month == 12 and 1 <= d.day <= 24:
        return 1.0 + (d.day - 1) / 23.0
    if d.month == 12 and d.day == 25:
        return 0.1
    if d.month == 12 and 26 <= d.day <= 31:
        return 1.3

    # Black Friday (3-day Thu-Fri-Sat window)
    thanksgiving = _nth_weekday(d.year, 11, 3, nth=4)
    if _is_black_friday(d):
        return 3.0
    if d == thanksgiving:
        return 1.5
    if d.month == 11 and d == thanksgiving + timedelta(days=2):
        return 2.0

    # Cyber Monday
    if _is_cyber_monday(d):
        return 2.5

    # Valentine's 3-day leadup (Feb 12, 13, 14)
    if d.month == 2 and 12 <= d.day <= 14:
        return 1.3

    # Mother's Day 5-day leadup
    if d.month == 5:
        mom = _nth_weekday(d.year, 5, 6, nth=2)
        if 0 <= (mom - d).days <= 5:
            return 1.2

    # Back-to-school (Aug 20 → Sep 5)
    if d.month == 8 and d.day >= 20:
        return 1.0 + (d.day - 20) / 11 * 0.4
    if d.month == 9 and d.day <= 5:
        return 1.4 - (d.day - 1) / 4 * 0.4

    return 1.0


def calendar_multiplier(d: date, country: str, domain: str = "ecommerce") -> float:
    holiday = _public_holiday_multiplier(d, country, domain)
    shopping = _shopping_season_multiplier(d, country, domain)
    # If the shopping season is a crash day, use it directly (don't stack
    # with the holiday multiplier).
    if shopping <= 0.5:
        return shopping
    return holiday * shopping
