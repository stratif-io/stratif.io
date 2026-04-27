"""Cohort-level helpers — pure functions, no I/O, no state mutation."""

from __future__ import annotations

import math
import random

USER_ARCHETYPES: tuple[str, ...] = ("power", "regular", "casual")

# User archetype distribution — 5% power, 25% regular, 70% casual.
_USER_ARCHETYPE_WEIGHTS: dict[str, float] = {
    "power": 0.05,
    "regular": 0.25,
    "casual": 0.70,
}

# Mean daily sessions at day 0 per user archetype (Poisson rate).
_BASE_DAILY_SESSIONS: dict[str, float] = {
    "power": 1.4,
    "regular": 0.4,
    "casual": 0.15,
}


def assign_user_archetype(rng: random.Random) -> str:
    """5 / 25 / 70 draw of user archetype (power / regular / casual)."""
    names = list(_USER_ARCHETYPE_WEIGHTS)
    weights = [_USER_ARCHETYPE_WEIGHTS[n] for n in names]
    return rng.choices(names, weights=weights, k=1)[0]


def _poisson(rng: random.Random, lam: float) -> int:
    """Poisson sampler — Knuth for small λ, Gaussian approximation for λ > 30.

    ``math.exp(-λ)`` underflows to 0 around λ ≈ 709, so Knuth's algorithm
    spins forever once the tail kicks in. Normal(λ, √λ) is an accurate
    approximation for Poisson at moderate-to-large λ.
    """
    if lam <= 0:
        return 0
    if lam > 30:
        return max(0, int(rng.gauss(lam, math.sqrt(lam)) + 0.5))
    limit = math.exp(-lam)
    k = 0
    p = 1.0
    while True:
        k += 1
        p *= rng.random()
        if p < limit:
            return k - 1


def sample_daily_session_count(
    rng: random.Random, user_archetype: str, days_since_acquisition: int
) -> int:
    """Poisson daily session count with slow exponential decay over user age.

    Decay half-life of 180 days — captures the generic stickiness decay on top
    of the hard churn hazard. Realism Phase 3 layers day-of-week/calendar on top.
    """
    base = _BASE_DAILY_SESSIONS.get(user_archetype, 0.15)
    decay = 2 ** (-days_since_acquisition / 180.0)
    return _poisson(rng, base * decay)
