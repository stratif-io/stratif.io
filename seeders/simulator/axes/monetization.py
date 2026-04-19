"""Monetization axis — declares the revenue model for the domain.

Each domain pack publishes ``supported_monetization``; the Engine coerces
unsupported values to the domain's default at run time (not this module).
"""

from __future__ import annotations

from typing import Any

from seeders.simulator.protocols import AxisModifier, SimulationState

_VALUES = (
    "one_off_purchase",
    "subscription",
    "iap_whales",
    "ad_supported",
    "freemium",
    "marketplace_fee",
)


class MonetizationAxis:
    name: str = "monetization"
    values: dict[str, Any] = dict.fromkeys(_VALUES)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _VALUES:
            raise ValueError(
                f"unknown monetization value {value!r}; valid: {sorted(_VALUES)}"
            )
        simulation.monetization_mode = value


assert isinstance(MonetizationAxis(), AxisModifier)
