"""Default AxisRegistry populated with all shipped axes."""

from __future__ import annotations

from functools import lru_cache

from services.event_simulator.simulator.registry import AxisRegistry


@lru_cache(maxsize=1)
def default_axis_registry() -> AxisRegistry:
    reg = AxisRegistry()
    # Local imports keep axis-implementation deps out of the registry module.
    from services.event_simulator.simulator.axes.anomalies import (
        AnomaliesAxis,
    )
    from services.event_simulator.simulator.axes.engagement_depth import (
        EngagementDepthAxis,
    )
    from services.event_simulator.simulator.axes.geography import (
        GeographyAxis,
    )
    from services.event_simulator.simulator.axes.growth import GrowthAxis
    from services.event_simulator.simulator.axes.monetization import (
        MonetizationAxis,
    )
    from services.event_simulator.simulator.axes.stickiness import StickinessAxis
    from services.event_simulator.simulator.axes.virality import (
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
