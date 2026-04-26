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


_HOUR_WEIGHTS: dict[str, tuple[list[float], list[float]]] = {
    "ecommerce": (_ECOMMERCE_HOURS_WEEKDAY, _ECOMMERCE_HOURS_WEEKEND),
}

_DOW_WEIGHTS: dict[str, list[float]] = {
    "ecommerce": _ECOMMERCE_DOW,
}


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
