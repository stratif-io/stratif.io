"""Engagement depth axis — shifts session-archetype mix toward bounce or converter."""

from __future__ import annotations

from typing import Any

from seeders.simulator.protocols import AxisModifier, SimulationState

_MODIFIERS: dict[str, dict[str, float]] = {
    "shallow": {"bounce": 1.5, "browser": 1.2, "researcher": 0.8, "converter": 0.6},
    "moderate": {"bounce": 1.0, "browser": 1.0, "researcher": 1.0, "converter": 1.0},
    "deep": {"bounce": 0.5, "browser": 0.8, "researcher": 1.3, "converter": 1.5},
}


class EngagementDepthAxis:
    name: str = "engagement_depth"
    values: dict[str, Any] = dict.fromkeys(_MODIFIERS)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _MODIFIERS:
            raise ValueError(
                f"unknown engagement_depth value {value!r}; valid: {sorted(_MODIFIERS)}"
            )
        simulation.session_mix_modifier = _MODIFIERS[value]


assert isinstance(EngagementDepthAxis(), AxisModifier)
