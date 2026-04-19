"""Simulation engine.

Phase 1: thin delegation to the legacy event-generation path on
``BaseSeeder``. The default preset ``ecommerce_steady`` uses this path,
so behavior is unchanged.

Phase 2 replaces the legacy delegation with the real cohort-based loop.
"""

from __future__ import annotations

import random
from collections.abc import Iterator
from typing import TYPE_CHECKING

from seeders.simulator.config import SimulationConfig

if TYPE_CHECKING:
    from seeders.seeder import BaseSeeder


class Engine:
    def __init__(self, config: SimulationConfig, base_seeder: BaseSeeder) -> None:
        self.config = config
        self.base_seeder = base_seeder

    def run(self) -> Iterator[list[tuple]]:
        """Yield batches of event tuples for the dialect seeder to insert.

        Seeding and setup happen eagerly (at call time, not on first iteration)
        so that ``random.seed`` takes effect immediately regardless of whether
        the caller drives the iterator lazily.
        """
        if self.config.random_seed is not None:
            random.seed(self.config.random_seed)

        # Sync legacy config fields BEFORE calling the generation methods.
        # _generate_users reads seed_users to size its loop, and
        # _generate_events_batched reads seed_days to size the time window.
        # A bare SeedConfig (both fields None) would otherwise produce zero
        # users / zero events. The mutation is intentional: a base_seeder
        # reused across Engine instances inherits the later Engine's scale.
        scale = self.config.resolved_scale()
        self.base_seeder.config.seed_users = scale.total_users
        self.base_seeder.config.seed_days = scale.window_days

        # Phase 1: mirror BaseSeeder's current two-step flow.
        #   products → users → batched events
        self.base_seeder._generate_products()
        users = self.base_seeder._generate_users()

        return self.base_seeder._generate_events_batched(users)
