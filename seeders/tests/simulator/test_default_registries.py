"""After Phase 2a lands, importing seeders.simulator.axes triggers
registration of the built-in axes. This test guards that contract."""

from __future__ import annotations


def test_default_axis_registry_has_all_axes():
    from seeders.simulator.axes._defaults import default_axis_registry

    names = default_axis_registry().all_names()
    for axis in [
        "growth",
        "stickiness",
        "engagement_depth",
        "geography",
        "monetization",
        "virality",
        "anomalies",
    ]:
        assert axis in names, axis


def test_default_axis_registry_is_cached_singleton():
    from seeders.simulator.axes._defaults import default_axis_registry

    assert default_axis_registry() is default_axis_registry()
