"""Configuration models for the simulation engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

SCALE_PRESETS: dict[str, ScaleConfig] = {}


@dataclass(frozen=True)
class ScaleConfig:
    """Named scale tier — total_users and window_days. See spec §3.1."""

    total_users: int
    window_days: int

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
    """Optional override block for the ``scale`` axis."""

    model_config = ConfigDict(extra="forbid")

    total_users: int | None = None
    window_days: int | None = None


class SimulationConfig(BaseModel):
    """A resolved simulation configuration — the product of a preset YAML +
    optional axis overrides + env vars + CLI flags.
    """

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Preset name")
    description: str | None = None
    domain: str
    axes: dict[str, str]
    random_seed: int | None = None

    # Optional per-axis tuning blocks (freeform; each axis validates its own).
    growth_config: dict[str, Any] | None = None
    scale_config: ScaleOverride | None = None

    # Anomalies authored in YAML (shape validated in Phase 5).
    anomalies: list[dict[str, Any]] = Field(default_factory=list)

    def resolved_scale(self) -> ScaleConfig:
        """Resolve the named ``scale`` axis value + any overrides.

        ``None`` means "use the base tier's value"; any non-``None`` override
        wins (including 0, though ``0`` has no meaningful use today).
        """
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
