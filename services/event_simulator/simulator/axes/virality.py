"""Virality axis — how strongly users bring in other users.

Sets a float weight on state; Phase 4 domains consume it when they emit
referral events.
"""

from __future__ import annotations

from typing import Any

from services.event_simulator.simulator.protocols import AxisModifier, SimulationState

_WEIGHTS: dict[str, float] = {
    "none": 0.0,
    "weak": 0.3,
    "moderate": 0.6,
    "strong_viral": 1.0,
}


class ViralityAxis:
    name: str = "virality"
    values: dict[str, Any] = dict.fromkeys(_WEIGHTS)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _WEIGHTS:
            raise ValueError(
                f"unknown virality value {value!r}; valid: {sorted(_WEIGHTS)}"
            )
        simulation.virality_weight = _WEIGHTS[value]


assert isinstance(ViralityAxis(), AxisModifier)
