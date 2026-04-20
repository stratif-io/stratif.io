"""Stickiness axis — shapes user lifetime (days active after acquisition).

Each value installs a function ``sample_lifetime(rng) -> int`` on
``state.hazard_curve``; the cohort engine assigns each user a churn day as
``d_0 + sample_lifetime()``.
"""

from __future__ import annotations

import math
import random
from collections.abc import Callable
from typing import Any

from seeders.simulator.protocols import AxisModifier, SimulationState

LifetimeSampler = Callable[[random.Random], int]


def _exponential_sampler(mean: float) -> LifetimeSampler:
    def sample(rng: random.Random) -> int:
        u = rng.random()
        if u <= 0.0:
            return 0
        return max(0, int(-mean * math.log(u)))

    return sample


def _weibull_sampler(k: float, scale: float) -> LifetimeSampler:
    def sample(rng: random.Random) -> int:
        u = rng.random()
        if u <= 0.0:
            return 0
        lt = scale * ((-math.log(u)) ** (1 / k))
        return max(0, int(lt))

    return sample


def _one_shot_sampler() -> LifetimeSampler:
    def sample(rng: random.Random) -> int:
        return 0

    return sample


_BUILDERS: dict[str, Callable[[], LifetimeSampler]] = {
    "addictive": lambda: _weibull_sampler(k=0.5, scale=120.0),
    "sticky": lambda: _weibull_sampler(k=1.0, scale=180.0),
    "normal": lambda: _exponential_sampler(mean=90.0),
    "churn_heavy": lambda: _exponential_sampler(mean=20.0),
    "one_shot": lambda: _one_shot_sampler(),
}


class StickinessAxis:
    name: str = "stickiness"
    values: dict[str, Any] = dict.fromkeys(_BUILDERS)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _BUILDERS:
            raise ValueError(
                f"unknown stickiness value {value!r}; valid: {sorted(_BUILDERS)}"
            )
        simulation.hazard_curve = _BUILDERS[value]()


assert isinstance(StickinessAxis(), AxisModifier)  # structural Protocol check
