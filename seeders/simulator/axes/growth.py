"""Growth axis — shapes new-user arrivals over the simulation window.

Each curve returns a callable that maps ``day`` (0-indexed) to the expected
number of arrivals on that day. The caller (cohort engine) Poisson-samples
around this value.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

from seeders.simulator.protocols import AxisModifier, SimulationState

ArrivalCurve = Callable[[int], float]


def _steady(total: int, window: int) -> ArrivalCurve:
    per_day = total / window
    return lambda d: per_day


def _exponential_growth(total: int, window: int, r: float) -> ArrivalCurve:
    # Geometric series: a + a·e^r + ... + a·e^(r·(W-1)) = total
    # → a = total · (e^r − 1) / (e^(r·W) − 1)
    a = total * (math.exp(r) - 1) / (math.exp(r * window) - 1)
    return lambda d: a * math.exp(r * d)


def _exponential_decline(total: int, window: int, r: float) -> ArrivalCurve:
    # Same geometric series with negative rate.
    a = total * (1 - math.exp(-r)) / (1 - math.exp(-r * window))
    return lambda d: a * math.exp(-r * d)


def _seasonal(total: int, window: int, amplitude: float = 0.3) -> ArrivalCurve:
    base = total / window
    return lambda d: base * (1 + amplitude * math.sin(2 * math.pi * d / 365))


def _hockey_stick(total: int, window: int, r: float = 0.06) -> ArrivalCurve:
    split = int(window * 0.4)
    # Continuity at the split: post-split day 0 = `a`, growth from there.
    # Flat sum:    a · split
    # Growth sum:  a · (e^(r·(W-split)) − 1) / (e^r − 1)
    post = (math.exp(r * (window - split)) - 1) / (math.exp(r) - 1)
    a = total / (split + post)

    def curve(d: int) -> float:
        if d < split:
            return a
        return a * math.exp(r * (d - split))

    return curve


_BUILDERS: dict[str, Callable[[int, int], ArrivalCurve]] = {
    "explosive": lambda t, w: _exponential_growth(t, w, r=0.08),
    "strong": lambda t, w: _exponential_growth(t, w, r=0.02),
    "steady": _steady,
    "flat": _steady,  # Semantic alias — flat = steady for a mature product.
    "declining": lambda t, w: _exponential_decline(t, w, r=0.015),
    "seasonal": lambda t, w: _seasonal(t, w),
    "hockey_stick": _hockey_stick,
}


class GrowthAxis:
    name: str = "growth"
    values: dict[str, Any] = dict.fromkeys(_BUILDERS)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _BUILDERS:
            raise ValueError(
                f"unknown growth value {value!r}; valid: {sorted(_BUILDERS)}"
            )
        simulation.arrival_curve = _BUILDERS[value](
            simulation.total_users, simulation.window_days
        )


# Runtime Protocol check (inexpensive) — catches signature drift early.
assert isinstance(GrowthAxis(), AxisModifier)
