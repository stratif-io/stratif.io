# seeders/simulator/protocols.py
"""Structural Protocols for the simulator."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    from seeders.simulator.cohort_model import RetentionParams


@dataclass
class SimulationState:
    """Mutable state threaded through axis callbacks."""

    random_seed: int
    total_users: int
    window_days: int
    now: datetime = field(default_factory=lambda: datetime.now(UTC))

    arrival_curve: Any = None
    hazard_curve: Any = None
    retention_params: RetentionParams | None = None
    session_frequency: Any = None
    monetization_hooks: list = field(default_factory=list)

    anomalies: list = field(default_factory=list)

    allowed_countries: set[str] | None = None
    session_freq_multiplier: float = 1.0
    monetization_mode: str | None = None
    virality_weight: float = 0.0
    jitter_sigma: float = 0.0

    hour_weights_weekday: list[float] | None = None
    hour_weights_weekend: list[float] | None = None
    dow_weights: list[float] | None = None
    calendar_multiplier: Any = None

    growth_config: dict[str, Any] | None = None


@runtime_checkable
class AxisModifier(Protocol):
    """An axis — e.g. growth, stickiness."""

    name: str
    values: dict[str, Any]

    def apply(self, value: str, simulation: SimulationState) -> None: ...
