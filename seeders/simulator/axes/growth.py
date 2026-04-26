from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

from seeders.simulator.protocols import SimulationState

ShapeMultiplier = Callable[[int], float]


def _steady_shape() -> ShapeMultiplier:
    return lambda d: 1.0


def _exponential_growth_shape(r: float) -> ShapeMultiplier:
    return lambda d: math.exp(r * d)


def _exponential_decline_shape(r: float) -> ShapeMultiplier:
    return lambda d: math.exp(-r * d)


def _seasonal_shape(amplitude: float = 0.3) -> ShapeMultiplier:
    return lambda d: 1.0 + amplitude * math.sin(2 * math.pi * d / 365)


def _hockey_stick_shape(
    r: float = 0.06,
    split_fraction: float = 0.35,
    window: int = 180,
) -> ShapeMultiplier:
    split = max(1, int(window * split_fraction))

    def shape(d: int) -> float:
        if d < split:
            return 1.0
        return math.exp(r * (d - split))

    return shape


_VALUE_NAMES = (
    "explosive",
    "strong",
    "steady",
    "flat",
    "declining",
    "seasonal",
    "hockey_stick",
)


def _build_shape(
    value: str, growth_config: dict[str, Any] | None, window: int
) -> ShapeMultiplier:
    cfg = growth_config or {}
    if value == "explosive":
        return _exponential_growth_shape(r=float(cfg.get("rate", 0.08)))
    if value == "strong":
        return _exponential_growth_shape(r=float(cfg.get("rate", 0.02)))
    if value in ("steady", "flat"):
        return _steady_shape()
    if value == "declining":
        return _exponential_decline_shape(r=float(cfg.get("rate", 0.015)))
    if value == "seasonal":
        return _seasonal_shape(amplitude=float(cfg.get("amplitude", 0.3)))
    if value == "hockey_stick":
        return _hockey_stick_shape(
            r=float(cfg.get("rate", 0.06)),
            split_fraction=float(cfg.get("split_fraction", 0.35)),
            window=window,
        )
    raise ValueError(f"unknown growth value {value!r}; valid: {_VALUE_NAMES}")


class GrowthAxis:
    name: str = "growth"
    values: dict[str, Any] = dict.fromkeys(_VALUE_NAMES)

    def apply(self, value: str, simulation: SimulationState) -> None:
        simulation.arrival_curve = _build_shape(
            value,
            simulation.growth_config,
            simulation.window_days,
        )
