"""Cohort retention model — mirrors the TypeScript twin's simulateCohorts logic.

Survival curve S[k] = P(user still active at tenure k):
  S[0] = 1
  S[k] = S[k-1] * (1 - churn_prob(k))
  churn_prob(k) = base + (peak - base) * 2^(-k / decay_days)

Reactivation kernel R[d-1] = P(reactivating after d dormant days):
  R[d-1] = reactivation_rate * reactivation_decay^(d-1)

Per-user simulation:
  1. Sample tenure from S (first churn day)
  2. After churning, sample dormant days from R → user reactivates
  3. Sample next tenure from S again
  4. Repeat until window_days
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass


@dataclass(frozen=True)
class RetentionParams:
    peak_churn_rate: float
    base_churn_rate: float
    churn_decay_days: float
    reactivation_rate: float
    reactivation_decay: float
    max_dormant_days: int


def build_survival(params: RetentionParams, max_tenure: int) -> list[float]:
    S = [0.0] * (max_tenure + 1)
    S[0] = 1.0
    for k in range(1, max_tenure + 1):
        cp = params.base_churn_rate + (
            params.peak_churn_rate - params.base_churn_rate
        ) * math.pow(2, -(k / params.churn_decay_days))
        S[k] = S[k - 1] * (1 - cp)
    return S


def build_reactivation_kernel(params: RetentionParams) -> list[float]:
    return [
        params.reactivation_rate * math.pow(params.reactivation_decay, d)
        for d in range(params.max_dormant_days)
    ]


def _sample_tenure(rng: random.Random, S: list[float]) -> int:
    """Sample a tenure (days active) from the survival curve via inverse CDF."""
    u = rng.random()
    for k in range(len(S) - 1):
        if S[k + 1] <= u:
            return k
    return len(S) - 1


def _sample_dormant_days(rng: random.Random, R: list[float]) -> int | None:
    """Return dormant days until reactivation, or None if user is lost."""
    u = rng.random()
    cumulative = 0.0
    for d, prob in enumerate(R):
        cumulative += prob
        if u < cumulative:
            return d + 1
    return None  # user churned permanently


def active_days_for_user(
    rng: random.Random,
    params: RetentionParams,
    join_day: int,
    window_days: int,
    *,
    S: list[float] | None = None,
    R: list[float] | None = None,
) -> list[int]:
    """Return the list of days (absolute) on which this user is active.

    Pass precomputed S and R to avoid rebuilding them for every user in a batch.
    """
    if S is None:
        S = build_survival(params, window_days)
    if R is None:
        R = build_reactivation_kernel(params)

    active: list[int] = []
    current_day = join_day

    while current_day < window_days:
        tenure = _sample_tenure(rng, S)
        last_active = min(current_day + tenure, window_days - 1)
        active.extend(range(current_day, last_active + 1))

        churn_day = last_active + 1
        if churn_day >= window_days:
            break

        dormant = _sample_dormant_days(rng, R)
        if dormant is None:
            break
        current_day = churn_day + dormant

    return active
