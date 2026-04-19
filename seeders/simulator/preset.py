"""Preset YAML loader + configuration resolver.

Precedence for any axis value:
    CLI flag  >  SEED_OVERRIDE_<AXIS> env var  >  preset YAML  >  default
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

from seeders.simulator.config import ScaleOverride, SimulationConfig

PRESETS_DIR = Path(__file__).resolve().parent.parent / "presets"
DEFAULT_PRESET = "ecommerce_steady"


class PresetNotFoundError(FileNotFoundError):
    """Raised when a requested preset cannot be located."""


def list_presets() -> list[str]:
    """Return preset names shipped in the presets/ directory."""
    if not PRESETS_DIR.is_dir():
        return []
    return sorted(p.stem for p in PRESETS_DIR.glob("*.yaml"))


def load_preset(name_or_path: str | Path) -> SimulationConfig:
    """Load a preset from a bare name (searched in presets/) or an explicit path."""
    path = _resolve_preset_path(name_or_path)
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return SimulationConfig(**data)


def resolve_config(
    preset_name: str | None,
    axis_overrides: dict[str, str],
) -> SimulationConfig:
    """Resolve a full configuration applying precedence rules.

    Called by the CLI (which passes explicit preset/axis overrides) and by
    ``BaseSeeder`` (which passes ``None`` so env vars / default apply).
    """
    chosen = preset_name or os.environ.get("SEED_PRESET") or DEFAULT_PRESET
    cfg = load_preset(chosen)

    # Start with YAML axes.
    axes = dict(cfg.axes)

    # Apply env overrides.
    for env_key, env_value in os.environ.items():
        if env_key.startswith("SEED_OVERRIDE_"):
            axis_name = env_key[len("SEED_OVERRIDE_") :].lower()
            axes[axis_name] = env_value

    # Apply CLI overrides (highest priority).
    axes.update(axis_overrides)

    # Honor legacy SEED_USERS / SEED_DAYS env vars as scale overrides.
    scale_override_data: dict[str, Any] = {}
    if (u := os.environ.get("SEED_USERS")) is not None:
        scale_override_data["total_users"] = int(u)
    if (d := os.environ.get("SEED_DAYS")) is not None:
        scale_override_data["window_days"] = int(d)
    scale_override = (
        ScaleOverride(**scale_override_data)
        if scale_override_data
        else cfg.scale_config
    )

    # Reconstruct with resolved axes + merged scale override.
    return cfg.model_copy(update={"axes": axes, "scale_config": scale_override})


def _resolve_preset_path(name_or_path: str | Path) -> Path:
    candidate = Path(name_or_path)
    if candidate.suffix == ".yaml" and candidate.is_file():
        return candidate
    bare = PRESETS_DIR / f"{name_or_path}.yaml"
    if bare.is_file():
        return bare
    raise PresetNotFoundError(
        f"preset {name_or_path!r} not found. Available: {list_presets()}"
    )
