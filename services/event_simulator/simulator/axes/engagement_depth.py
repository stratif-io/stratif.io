# seeders/simulator/axes/engagement_depth.py
"""Engagement depth axis — scales daily session frequency."""

from __future__ import annotations

from typing import Any

from services.event_simulator.simulator.protocols import AxisModifier, SimulationState

_FREQ_MULTIPLIERS: dict[str, float] = {
    "shallow": 0.5,
    "medium": 1.0,
    "moderate": 1.0,  # alias for medium; kept for backward compatibility
    "deep": 2.0,
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
