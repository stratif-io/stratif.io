"""Hour-of-day + day-of-week weight curves (domain-aware).

Each domain may register a weekday/weekend/dow weight vector; unknown
domains fall back to uniform weights.
"""

from __future__ import annotations

import random

_UNIFORM_24 = [1.0] * 24
_UNIFORM_7 = [1.0] * 7

# Ecommerce curves — weekday peaks at lunch (11-13) and evening (19-22).
_ECOMMERCE_HOURS_WEEKDAY = [
    0.1,
    0.05,
    0.03,
    0.03,
    0.05,
    0.1,
    0.2,
    0.4,
    0.6,
    0.8,
    0.9,
    1.0,
    1.0,
    0.9,
    0.8,
    0.7,
    0.7,
    0.8,
    1.0,
    1.1,
    1.1,
    1.0,
    0.7,
    0.4,
]
# Weekend — later start, more midday activity.
_ECOMMERCE_HOURS_WEEKEND = [
    0.2,
    0.1,
    0.05,
    0.05,
    0.05,
    0.1,
    0.2,
    0.3,
    0.5,
    0.8,
    1.0,
    1.1,
    1.1,
    1.1,
    1.0,
    0.9,
    0.8,
    0.8,
    0.9,
    1.0,
    1.0,
    0.9,
    0.6,
    0.3,
]
# Ecommerce: Sat + Sun heaviest, midweek moderate.
_ECOMMERCE_DOW = [1.0, 1.0, 1.1, 1.0, 1.05, 1.4, 1.4]  # Mon..Sun


# business_hours: 09-18 peak
_BUSINESS_HOURS_WEEKDAY = [
    0.02,
    0.01,
    0.01,
    0.01,
    0.02,
    0.05,
    0.1,
    0.3,
    0.7,
    1.0,
    1.0,
    0.9,
    0.7,
    0.9,
    1.0,
    1.0,
    0.9,
    0.8,
    0.5,
    0.3,
    0.2,
    0.1,
    0.05,
    0.03,
]
_BUSINESS_HOURS_WEEKEND = [
    0.05,
    0.03,
    0.02,
    0.02,
    0.03,
    0.05,
    0.08,
    0.1,
    0.12,
    0.12,
    0.12,
    0.1,
    0.1,
    0.1,
    0.1,
    0.1,
    0.1,
    0.1,
    0.1,
    0.08,
    0.07,
    0.06,
    0.05,
    0.05,
]

# evening_peak: 18-23 peak
_EVENING_HOURS_WEEKDAY = [
    0.1,
    0.05,
    0.03,
    0.02,
    0.03,
    0.05,
    0.1,
    0.2,
    0.3,
    0.4,
    0.4,
    0.4,
    0.5,
    0.5,
    0.5,
    0.6,
    0.7,
    0.9,
    1.0,
    1.1,
    1.1,
    1.0,
    0.8,
    0.4,
]
_EVENING_HOURS_WEEKEND = [
    0.2,
    0.1,
    0.05,
    0.03,
    0.03,
    0.05,
    0.1,
    0.2,
    0.4,
    0.6,
    0.7,
    0.8,
    0.8,
    0.8,
    0.8,
    0.8,
    0.9,
    1.0,
    1.1,
    1.1,
    1.1,
    1.0,
    0.8,
    0.5,
]

# night_owl: 22-03 peak
_NIGHT_OWL_WEEKDAY = [
    0.6,
    0.5,
    0.4,
    0.3,
    0.2,
    0.1,
    0.1,
    0.1,
    0.15,
    0.2,
    0.25,
    0.3,
    0.3,
    0.3,
    0.3,
    0.35,
    0.4,
    0.5,
    0.6,
    0.7,
    0.8,
    0.9,
    1.0,
    0.9,
]
_NIGHT_OWL_WEEKEND = [
    0.9,
    0.8,
    0.7,
    0.5,
    0.3,
    0.15,
    0.1,
    0.1,
    0.15,
    0.2,
    0.3,
    0.4,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.6,
    0.7,
    0.8,
    0.9,
    1.0,
    1.1,
    1.1,
]

_WEEKDAYS_ONLY_DOW = [
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    0.1,
    0.05,
]  # Mon-Fri, almost nothing on weekends
_WEEKENDS_HEAVY_DOW = [0.5, 0.5, 0.6, 0.6, 0.9, 1.4, 1.5]  # Sat/Sun heaviest

_HOUR_WEIGHTS: dict[str, tuple[list[float], list[float]]] = {
    "ecommerce": (_ECOMMERCE_HOURS_WEEKDAY, _ECOMMERCE_HOURS_WEEKEND),
    "business_hours": (_BUSINESS_HOURS_WEEKDAY, _BUSINESS_HOURS_WEEKEND),
    "evening_peak": (_EVENING_HOURS_WEEKDAY, _EVENING_HOURS_WEEKEND),
    "night_owl": (_NIGHT_OWL_WEEKDAY, _NIGHT_OWL_WEEKEND),
}

_DOW_WEIGHTS: dict[str, list[float]] = {
    "ecommerce": _ECOMMERCE_DOW,
    "weekdays_only": _WEEKDAYS_ONLY_DOW,
    "weekends_heavy": _WEEKENDS_HEAVY_DOW,
}

_MONTHLY_MULTIPLIERS: dict[str, list[float]] = {
    # index 0 = January, ..., 11 = December
    "nov_dec_peak": [0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.25, 0.3, 0.5, 1.8, 2.5],
    "q4_heavy": [0.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.8, 0.9, 1.0, 1.2, 1.4, 1.8],
    "summer_peak": [0.6, 0.6, 0.7, 0.9, 1.1, 1.3, 1.5, 1.5, 1.2, 0.9, 0.7, 0.6],
    # flat → not in dict (returns 1.0)
}


def get_monthly_multiplier(monthly_seasonality: str, month: int) -> float:
    """month is 1-based (1=Jan, 12=Dec)."""
    weights = _MONTHLY_MULTIPLIERS.get(monthly_seasonality)
    if weights is None:
        return 1.0
    return weights[month - 1]


def get_hour_weights(domain: str, is_weekend: bool) -> list[float]:
    pair = _HOUR_WEIGHTS.get(domain)
    if pair is None:
        return list(_UNIFORM_24)
    weekday, weekend = pair
    return list(weekend if is_weekend else weekday)


def get_dow_weights(domain: str) -> list[float]:
    return list(_DOW_WEIGHTS.get(domain, _UNIFORM_7))


def sample_hour(rng: random.Random, weights: list[float]) -> int:
    return rng.choices(range(24), weights=weights, k=1)[0]


def sample_weighted_dow(rng: random.Random, weights: list[float]) -> int:
    return rng.choices(range(7), weights=weights, k=1)[0]
