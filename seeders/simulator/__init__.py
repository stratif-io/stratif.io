"""Parametrized-seeder simulation package.

Public surface:
    - Engine
    - SimulationConfig
    - load_preset, resolve_config, list_presets
    - AxisRegistry
    - AxisModifier, SimulationState (protocols)
"""

from seeders.simulator.config import ScaleConfig, ScaleOverride, SimulationConfig
from seeders.simulator.engine import Engine
from seeders.simulator.preset import (
    PresetNotFoundError,
    list_presets,
    load_preset,
    resolve_config,
)
from seeders.simulator.protocols import AxisModifier, SimulationState
from seeders.simulator.registry import AxisRegistry

__all__ = [
    "AxisModifier",
    "AxisRegistry",
    "Engine",
    "PresetNotFoundError",
    "ScaleConfig",
    "ScaleOverride",
    "SimulationConfig",
    "SimulationState",
    "list_presets",
    "load_preset",
    "resolve_config",
]
