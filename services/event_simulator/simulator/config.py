# seeders/simulator/config.py
"""Configuration models for the simulation engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from services.event_simulator.simulator.markov import MarkovConfig

_DEFAULT_WINDOW_DAYS = 90
SCALE_PRESETS: dict[str, ScaleConfig] = {}


@dataclass(frozen=True)
class ScaleConfig:
    """Named scale tier — total_users and window_days, or starting_rate-driven."""

    window_days: int
    total_users: int | None = None
    starting_rate: float | None = None

    def __post_init__(self) -> None:
        if (self.total_users is None) == (self.starting_rate is None):
            raise ValueError(
                "ScaleConfig requires exactly one of total_users or starting_rate"
            )

    @classmethod
    def from_named(cls, name: str) -> ScaleConfig:
        try:
            return SCALE_PRESETS[name]
        except KeyError as exc:
            raise ValueError(
                f"unknown scale {name!r}; valid: {sorted(SCALE_PRESETS)}"
            ) from exc


SCALE_PRESETS.update(
    {
        "tiny": ScaleConfig(total_users=1_000, window_days=30),
        "small": ScaleConfig(total_users=10_000, window_days=90),
        "medium": ScaleConfig(total_users=100_000, window_days=180),
        "large": ScaleConfig(total_users=1_000_000, window_days=365),
    }
)


class ScaleOverride(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_users: int | None = None
    window_days: int | None = None
    starting_rate: float | None = None
    start_date: str | None = None  # ISO date, e.g. "2012-11-14"
    end_date: str | None = None  # ISO date, e.g. "2026-04-28"


class SimulationConfig(BaseModel):
    """A resolved simulation configuration."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Preset name")
    description: str | None = None
    axes: dict[str, str]
    markov: MarkovConfig
    random_seed: int | None = None

    growth_config: dict[str, Any] | None = None
    scale_config: ScaleOverride | None = None
    events: list[dict[str, Any]] = Field(default_factory=list)

    def resolved_scale(self) -> ScaleConfig:
        override = self.scale_config

        # Compute window_days from start/end dates if provided
        computed_window: int | None = None
        if override is not None and override.start_date and override.end_date:
            from datetime import date as _date

            computed_window = (
                _date.fromisoformat(override.end_date)
                - _date.fromisoformat(override.start_date)
            ).days + 1

        effective_window = computed_window or (
            override.window_days if override else None
        )

        # Rate-driven mode: starting_rate present in override
        if override is not None and override.starting_rate is not None:
            return ScaleConfig(
                starting_rate=override.starting_rate,
                window_days=effective_window or _DEFAULT_WINDOW_DAYS,
            )

        # Goal-driven mode: total_users present in override
        if override is not None and override.total_users is not None:
            return ScaleConfig(
                total_users=override.total_users,
                window_days=effective_window or _DEFAULT_WINDOW_DAYS,
            )

        # Legacy: scale axis shorthand → goal-driven
        base = ScaleConfig.from_named(self.axes.get("scale", "small"))
        window = effective_window or base.window_days
        return ScaleConfig(
            total_users=base.total_users,
            window_days=window,
        )
