# seeders/simulator/config.py
"""Configuration models for the simulation engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from seeders.simulator.markov import MarkovConfig

SCALE_PRESETS: dict[str, "ScaleConfig"] = {}


@dataclass(frozen=True)
class ScaleConfig:
    """Named scale tier — total_users and window_days."""

    total_users: int
    window_days: int

    @classmethod
    def from_named(cls, name: str) -> "ScaleConfig":
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
        base = ScaleConfig.from_named(self.axes.get("scale", "small"))
        if self.scale_config is None:
            return base
        return ScaleConfig(
            total_users=(
                self.scale_config.total_users
                if self.scale_config.total_users is not None
                else base.total_users
            ),
            window_days=(
                self.scale_config.window_days
                if self.scale_config.window_days is not None
                else base.window_days
            ),
        )
