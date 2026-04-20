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


def _hockey_stick(
    total: int,
    window: int,
    r: float = 0.06,
    split_fraction: float = 0.4,
) -> ArrivalCurve:
    """Flat for the first ``split_fraction`` of the window, then exponential.

    ``split_fraction`` and ``r`` are tunable via a preset's ``growth_config``
    block (``{"split_fraction": 0.25, "rate": 0.015}``).
    """
    split = max(1, int(window * split_fraction))
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


_VALUE_NAMES: tuple[str, ...] = (
    "explosive",
    "strong",
    "steady",
    "flat",
    "declining",
    "seasonal",
    "hockey_stick",
)


def _build_curve(
    value: str, total: int, window: int, cfg: dict[str, Any]
) -> ArrivalCurve:
    """Construct the arrival curve for ``value``, honoring ``cfg`` overrides."""
    if value == "explosive":
        return _exponential_growth(total, window, r=float(cfg.get("rate", 0.08)))
    if value == "strong":
        return _exponential_growth(total, window, r=float(cfg.get("rate", 0.02)))
    if value == "steady" or value == "flat":
        return _steady(total, window)
    if value == "declining":
        return _exponential_decline(total, window, r=float(cfg.get("rate", 0.015)))
    if value == "seasonal":
        amplitude = float(cfg.get("amplitude", 0.3))
        return _seasonal(total, window, amplitude=amplitude)
    if value == "hockey_stick":
        return _hockey_stick(
            total,
            window,
            r=float(cfg.get("rate", 0.06)),
            split_fraction=float(cfg.get("split_fraction", 0.4)),
        )
    raise ValueError(f"unknown growth value {value!r}; valid: {list(_VALUE_NAMES)}")


class GrowthAxis:
    name: str = "growth"
    values: dict[str, Any] = dict.fromkeys(_VALUE_NAMES)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in self.values:
            raise ValueError(
                f"unknown growth value {value!r}; valid: {sorted(self.values)}"
            )
        cfg = simulation.growth_config or {}
        simulation.arrival_curve = _build_curve(
            value, simulation.total_users, simulation.window_days, cfg
        )


# Runtime Protocol check (inexpensive) — catches signature drift early.
assert isinstance(GrowthAxis(), AxisModifier)
