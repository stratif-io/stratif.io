"""Default AxisRegistry populated with Phase 2a built-ins (growth, stickiness).

``default_axis_registry()`` returns the cached singleton; Phase 2b+ axes
register themselves on this same registry by importing their module from
this package.
"""

from __future__ import annotations

from functools import lru_cache

from seeders.simulator.registry import AxisRegistry


@lru_cache(maxsize=1)
def default_axis_registry() -> AxisRegistry:
    reg = AxisRegistry()
    # Import-and-register pattern: each axis module exposes a module-level
    # instance that is appended to the registry here. This keeps the registry
    # module free of axis-implementation imports.
    from seeders.simulator.axes.growth import GrowthAxis  # type: ignore
    from seeders.simulator.axes.stickiness import StickinessAxis  # type: ignore

    reg.register(GrowthAxis())
    reg.register(StickinessAxis())
    return reg
