"""Parametrized-seeder simulation package.

Public surface:
    - Engine
    - SimulationConfig
    - load_preset, resolve_config, list_presets
    - AxisRegistry
    - AxisModifier, SimulationState (protocols)
"""

from services.event_simulator.simulator.config import (
    ScaleConfig,
    ScaleOverride,
    SimulationConfig,
)
from services.event_simulator.simulator.engine import Engine
from services.event_simulator.simulator.preset import (
    PresetNotFoundError,
    list_presets,
    load_preset,
    resolve_config,
)
from services.event_simulator.simulator.protocols import AxisModifier, SimulationState
from services.event_simulator.simulator.registry import AxisRegistry

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
