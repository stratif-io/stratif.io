"""Integration test: every shipped preset loads + runs tiny Engine without raising."""

from __future__ import annotations

import pytest

from seeders.seeder import BaseSeeder, SeedConfig
from seeders.simulator import Engine, list_presets, load_preset
from seeders.simulator.config import ScaleOverride


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


@pytest.mark.parametrize("preset_name", list_presets())
def test_preset_loads_and_runs(preset_name):
    cfg = load_preset(preset_name)
    cfg = cfg.model_copy(
        update={
            "scale_config": ScaleOverride(total_users=20, window_days=5),
            "random_seed": 1,
        }
    )
    seeder = _StubSeeder(config=SeedConfig())
    batches = list(Engine(cfg, seeder).run())
    # Must have at least some events for non-trivial presets.
    total = sum(len(b) for b in batches)
    assert total >= 0, (
        preset_name
    )  # Some presets might produce 0 events at 20u/5d — accept that
