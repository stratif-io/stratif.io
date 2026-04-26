"""Power-law distributions for user activity (Pareto) and content popularity (Zipf)."""

from __future__ import annotations

import random


def pareto_activity_multiplier(rng: random.Random, alpha: float = 1.16) -> float:
    """Standard Pareto(α): returns ≥ 1.0 with a fat tail.

    α=1.16 gives the classic 80/20 rule (20% of users → 80% of activity).
    """
    u = rng.random()
    if u <= 0.0:
        u = 1e-12
    return (1 - u) ** (-1 / alpha)


def build_zipf_weights(n: int, s: float = 1.07) -> list[float]:
    """n weights: w_k = 1 / (k+1)^s for k=0..n-1."""
    return [1.0 / ((k + 1) ** s) for k in range(n)]


def zipf_sample(rng: random.Random, n: int, s: float = 1.07) -> int:
    """Sample an index 0..n-1 where 0 is most popular."""
    weights = build_zipf_weights(n, s)
    return rng.choices(range(n), weights=weights, k=1)[0]
