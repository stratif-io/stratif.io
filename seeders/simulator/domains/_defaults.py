"""Default DomainRegistry populated with Phase 2a built-ins (ecommerce)."""

from __future__ import annotations

from functools import lru_cache

from seeders.simulator.registry import DomainRegistry


@lru_cache(maxsize=1)
def default_domain_registry() -> DomainRegistry:
    reg = DomainRegistry()
    from seeders.simulator.domains.ecommerce import EcommercePack

    reg.register(EcommercePack())
    return reg
