"""Structural Protocols for the simulator.

`AxisModifier` and `DomainPack` are Protocols (PEP 544); any class that
matches the shape is accepted by the engine. This keeps axes and domains
decoupled from a specific base class — registration is the only contract.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol, runtime_checkable


@dataclass
class SimulationState:
    """Mutable state threaded through axis/domain/realism callbacks.

    An axis's ``apply`` mutates this state (installs callbacks, sets
    curves) rather than returning values; that keeps composition clean
    when multiple axes touch the same quantity.
    """

    random_seed: int
    total_users: int
    window_days: int
    now: datetime = field(default_factory=lambda: datetime.now(UTC))

    # Callbacks / curves populated by axes — unused in Phase 1, defined here
    # so later phases can drop them in without touching this module.
    arrival_curve: Any = None  # Callable[[int], float] — users on day d
    hazard_curve: Any = None  # Callable[[int], float] — churn hazard
    session_frequency: Any = None  # Callable[[user, day], float]
    monetization_hooks: list = field(default_factory=list)

    # Anomaly list, applied after the base plan is computed.
    anomalies: list = field(default_factory=list)

    # Phase 2b fields — populated by their axes; consumed by Engine/domains in later phases.
    allowed_countries: set[str] | None = None  # set by geography; None = all countries
    session_mix_modifier: dict[str, float] | None = None  # set by engagement_depth
    monetization_mode: str | None = None  # set by monetization (coerced by domain)
    virality_weight: float = 0.0  # set by virality; 0.0 = no referrals

    # Phase 3 realism fields — populated by realism modules, consumed by Engine/domains.
    hour_weights_weekday: list[float] | None = None  # 24-element list; sum normalized
    hour_weights_weekend: list[float] | None = None
    dow_weights: list[float] | None = None  # 7-element list; Monday=0
    calendar_multiplier: Any = None  # Callable[[date, country], float]

    # Per-axis tuning blocks copied in from SimulationConfig (e.g. growth_config).
    # Axes read these to parameterize their curves (e.g. hockey_stick split / rate).
    growth_config: dict[str, Any] | None = None


@runtime_checkable
class AxisModifier(Protocol):
    """An axis — e.g. `growth`, `stickiness`. See spec §3.2."""

    name: str
    values: dict[str, Any]

    def apply(self, value: str, simulation: SimulationState) -> None:
        """Apply the named value to the simulation state."""
        ...


@runtime_checkable
class DomainPack(Protocol):
    """A domain — e.g. `ecommerce`, `casual_game`. See spec §4."""

    name: str
    events: tuple[str, ...]
    supported_monetization: tuple[str, ...]

    def build_session(
        self,
        user: dict,
        session_start: datetime,
        archetype: str,
        state: SimulationState,
        rng: random.Random,
    ) -> list[tuple]:
        """Produce a list of event tuples for one session."""
        ...
