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
        self.base = base_seeder

    def run(self) -> Iterator[list[tuple]]:
        """Yield batches of event tuples for the dialect seeder to insert.

        Seeding and setup happen eagerly (at call time, not on first iteration)
        so that ``random.seed`` takes effect immediately regardless of whether
        the caller drives the iterator lazily.
        """
        if self.config.random_seed is not None:
            random.seed(self.config.random_seed)

        # Phase 1: mirror BaseSeeder's current two-step flow.
        #   products → users → batched events
        self.base._generate_products()
        users = self.base._generate_users()

        # Sync legacy config fields so _generate_events_batched keeps working
        # regardless of whether the caller went through the new CLI or the old
        # env-var path.
        scale = self.config.resolved_scale()
        self.base.config.seed_users = scale.total_users
        self.base.config.seed_days = scale.window_days

        return self.base._generate_events_batched(users)
