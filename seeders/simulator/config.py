# seeders/simulator/config.py
"""Configuration models for the simulation engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from seeders.simulator.markov import MarkovConfig

SCALE_PRESETS: dict[str, ScaleConfig] = {}


@dataclass(frozen=True)
class ScaleConfig:
    """Named scale tier — total_users and window_days, or starting_rate-driven."""

    window_days: int
    total_users: int | None = None
    starting_rate: float | None = None

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
    anomalies: list[dict[str, Any]] = Field(default_factory=list)

    def resolved_scale(self) -> ScaleConfig:
        override = self.scale_config

        # Rate-driven mode: starting_rate present in override
        if override is not None and override.starting_rate is not None:
            return ScaleConfig(
                starting_rate=override.starting_rate,
                window_days=override.window_days or 90,
            )

        # Goal-driven mode: total_users present in override
        if override is not None and override.total_users is not None:
            return ScaleConfig(
                total_users=override.total_users,
                window_days=override.window_days or 90,
            )

        # Legacy: scale axis shorthand → goal-driven
        base = ScaleConfig.from_named(self.axes.get("scale", "small"))
        window = (override.window_days if override else None) or base.window_days
        return ScaleConfig(
            total_users=base.total_users,
            window_days=window,
        )
