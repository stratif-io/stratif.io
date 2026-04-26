"""Geography axis — narrows user sampling to a set of country codes."""

from __future__ import annotations

from typing import Any

from services.event_simulator.simulator.protocols import AxisModifier, SimulationState

_COUNTRY_SETS: dict[str, set[str] | None] = {
    "global": None,
    "us_only": {"US"},
    "eu_only": {"UK", "DE", "FR"},
    "apac_only": {"JP", "IN", "AU"},
}


class GeographyAxis:
    name: str = "geography"
    values: dict[str, Any] = dict.fromkeys(_COUNTRY_SETS)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _COUNTRY_SETS:
            raise ValueError(
                f"unknown geography value {value!r}; valid: {sorted(_COUNTRY_SETS)}"
            )
        simulation.allowed_countries = _COUNTRY_SETS[value]


assert isinstance(GeographyAxis(), AxisModifier)
