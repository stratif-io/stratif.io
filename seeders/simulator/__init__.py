"""Parametrized-seeder simulation package.

Public surface:
    - Engine
    - SimulationConfig
    - load_preset, resolve_config, list_presets
    - AxisRegistry, DomainRegistry
    - AxisModifier, DomainPack, SimulationState (protocols)
"""

from seeders.simulator.config import ScaleConfig, ScaleOverride, SimulationConfig
from seeders.simulator.engine import Engine
from seeders.simulator.preset import (
    PresetNotFoundError,
    list_presets,
    load_preset,
    resolve_config,
)
from seeders.simulator.protocols import AxisModifier, DomainPack, SimulationState
from seeders.simulator.registry import AxisRegistry, DomainRegistry

__all__ = [
    "AxisModifier",
    "AxisRegistry",
    "DomainPack",
    "DomainRegistry",
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
