"""Default AxisRegistry populated with all shipped axes."""

from __future__ import annotations

from functools import lru_cache

from seeders.simulator.registry import AxisRegistry


@lru_cache(maxsize=1)
def default_axis_registry() -> AxisRegistry:
    reg = AxisRegistry()
    # Local imports keep axis-implementation deps out of the registry module.
    from seeders.simulator.axes.anomalies import (  # type: ignore[import-not-found]
        AnomaliesAxis,
    )
    from seeders.simulator.axes.engagement_depth import (  # type: ignore[import-not-found]
        EngagementDepthAxis,
    )
    from seeders.simulator.axes.geography import (  # type: ignore[import-not-found]
        GeographyAxis,
    )
    from seeders.simulator.axes.growth import GrowthAxis
    from seeders.simulator.axes.monetization import (  # type: ignore[import-not-found]
        MonetizationAxis,
    )
    from seeders.simulator.axes.stickiness import StickinessAxis
    from seeders.simulator.axes.virality import (  # type: ignore[import-not-found]
        ViralityAxis,
    )

    reg.register(GrowthAxis())
    reg.register(StickinessAxis())
    reg.register(EngagementDepthAxis())
    reg.register(GeographyAxis())
    reg.register(MonetizationAxis())
    reg.register(ViralityAxis())
    reg.register(AnomaliesAxis())
    return reg
