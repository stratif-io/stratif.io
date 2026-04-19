"""Cohort-level helpers — pure functions, no I/O, no state mutation."""

from __future__ import annotations

import math
import random

USER_ARCHETYPES: tuple[str, ...] = ("power", "regular", "casual")
SESSION_ARCHETYPES: tuple[str, ...] = ("bounce", "browser", "researcher", "converter")

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

# Session-archetype distribution per user archetype. Power users convert much
# more than casuals; casuals mostly bounce or browse.
_SESSION_MIX: dict[str, dict[str, float]] = {
    "power": {"bounce": 0.05, "browser": 0.20, "researcher": 0.35, "converter": 0.40},
    "regular": {"bounce": 0.10, "browser": 0.35, "researcher": 0.35, "converter": 0.20},
    "casual": {"bounce": 0.30, "browser": 0.40, "researcher": 0.25, "converter": 0.05},
}


def assign_user_archetype(rng: random.Random) -> str:
    """5 / 25 / 70 draw of user archetype (power / regular / casual)."""
    names = list(_USER_ARCHETYPE_WEIGHTS)
    weights = [_USER_ARCHETYPE_WEIGHTS[n] for n in names]
    return rng.choices(names, weights=weights, k=1)[0]


def _poisson(rng: random.Random, lam: float) -> int:
    """Small-lambda Poisson via Knuth; acceptable for our ``lam < ~10``."""
    if lam <= 0:
        return 0
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


def sample_session_archetype(
    rng: random.Random,
    user_archetype: str,
    modifier: dict[str, float] | None = None,
) -> str:
    mix = _SESSION_MIX.get(user_archetype, _SESSION_MIX["casual"])
    names = list(mix)
    weights = [mix[n] for n in names]
    if modifier is not None:
        weights = [
            w * modifier.get(n, 1.0) for w, n in zip(weights, names, strict=True)
        ]
    return rng.choices(names, weights=weights, k=1)[0]
