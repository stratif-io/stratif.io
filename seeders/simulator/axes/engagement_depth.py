"""Engagement depth axis — adjusts session frequency multiplier."""

from __future__ import annotations

from typing import Any

from seeders.simulator.protocols import AxisModifier, SimulationState

_FREQ_MULTIPLIERS: dict[str, float] = {
    "shallow": 0.6,
    "moderate": 1.0,
    "deep": 1.5,
}


class EngagementDepthAxis:
    name: str = "engagement_depth"
    values: dict[str, Any] = dict.fromkeys(_FREQ_MULTIPLIERS)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _FREQ_MULTIPLIERS:
            raise ValueError(
                f"unknown engagement_depth value {value!r}; valid: {sorted(_FREQ_MULTIPLIERS)}"
            )
        simulation.session_freq_multiplier = _FREQ_MULTIPLIERS[value]


assert isinstance(EngagementDepthAxis(), AxisModifier)
