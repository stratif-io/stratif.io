"""Anomalies axis — turns anomaly processing on or off.

Phase 2b only plumbs the config's anomaly list through to state; Phase 5
introduces the applicator that interprets each anomaly's effect.

``clean`` — empties out ``state.anomalies``.
``explicit`` / ``full`` / named category — leaves ``state.anomalies`` as-is.
The engine populates ``state.anomalies = config.anomalies`` before axis
application, so non-``clean`` values preserve whatever the preset declared.
"""

from __future__ import annotations

from typing import Any

from seeders.simulator.protocols import AxisModifier, SimulationState

_VALUES = (
    "none",
    "clean",
    "moderate",
    "campaigns",
    "outages",
    "ab_tests",
    "full",
    "explicit",
)


class AnomaliesAxis:
    name: str = "anomalies"
    values: dict[str, Any] = dict.fromkeys(_VALUES)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _VALUES:
            raise ValueError(
                f"unknown anomalies value {value!r}; valid: {sorted(_VALUES)}"
            )
        if value in ("none", "clean"):
            simulation.anomalies = []


assert isinstance(AnomaliesAxis(), AxisModifier)
