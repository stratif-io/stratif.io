"""After Phase 2a lands, importing seeders.simulator.axes / domains triggers
registration of the built-in axes (growth, stickiness) and the built-in
ecommerce domain. This test guards that contract."""

from __future__ import annotations


def test_default_axis_registry_has_phase_2a_axes():
    from seeders.simulator.axes._defaults import default_axis_registry

    names = default_axis_registry().all_names()
    assert "growth" in names
    assert "stickiness" in names


def test_default_domain_registry_has_ecommerce():
    from seeders.simulator.domains._defaults import default_domain_registry

    names = default_domain_registry().all_names()
    assert "ecommerce" in names


def test_default_registries_are_cached_singletons():
    from seeders.simulator.axes._defaults import default_axis_registry
    from seeders.simulator.domains._defaults import default_domain_registry

    assert default_axis_registry() is default_axis_registry()
    assert default_domain_registry() is default_domain_registry()
