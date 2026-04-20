"""Default DomainRegistry populated with Phase 2a+4 built-ins."""

from __future__ import annotations

from functools import lru_cache

from seeders.simulator.registry import DomainRegistry


@lru_cache(maxsize=1)
def default_domain_registry() -> DomainRegistry:
    reg = DomainRegistry()
    from seeders.simulator.domains.casual_game import CasualGamePack
    from seeders.simulator.domains.dating import DatingPack
    from seeders.simulator.domains.ecommerce import EcommercePack
    from seeders.simulator.domains.fintech import FintechPack
    from seeders.simulator.domains.gaming_hardcore import GamingHardcorePack
    from seeders.simulator.domains.marketplace import MarketplacePack
    from seeders.simulator.domains.retail import RetailPack
    from seeders.simulator.domains.saas import SaasPack
    from seeders.simulator.domains.social import SocialPack
    from seeders.simulator.domains.streaming import StreamingPack

    for pack in (
        EcommercePack(),
        RetailPack(),
        CasualGamePack(),
        GamingHardcorePack(),
        SaasPack(),
        StreamingPack(),
        SocialPack(),
        MarketplacePack(),
        DatingPack(),
        FintechPack(),
    ):
        reg.register(pack)
    return reg
