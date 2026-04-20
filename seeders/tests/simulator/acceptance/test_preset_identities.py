"""Per-preset acceptance tests — each preset has a small identity property."""

from __future__ import annotations

from collections import Counter
from datetime import datetime

import pytest

from seeders.seeder import BaseSeeder, SeedConfig
from seeders.simulator import Engine, load_preset
from seeders.simulator.config import ScaleOverride


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def _drain(
    preset_name: str, total_users: int = 800, window_days: int = 40, seed: int = 42
):
    cfg = load_preset(preset_name)
    cfg = cfg.model_copy(
        update={
            "scale_config": ScaleOverride(
                total_users=total_users, window_days=window_days
            ),
            "random_seed": seed,
        }
    )
    seeder = _StubSeeder(config=SeedConfig())
    return list(Engine(cfg, seeder).run())


def _event_names(batches) -> Counter[str]:
    return Counter(ev[1] for b in batches for ev in b)


def _first_seen_per_user(batches) -> dict[str, datetime]:
    seen: dict[str, datetime] = {}
    for b in batches:
        for ev in b:
            uid, _name, ts, *_ = ev
            if uid not in seen or ts < seen[uid]:
                seen[uid] = ts
    return seen


def _user_spans_days(batches) -> list[float]:
    per_user_ts: dict[str, list[datetime]] = {}
    for b in batches:
        for ev in b:
            per_user_ts.setdefault(ev[0], []).append(ev[2])
    spans = []
    for tss in per_user_ts.values():
        if len(tss) < 2:
            continue
        span = (max(tss) - min(tss)).total_seconds() / 86400.0
        spans.append(span)
    return spans


def test_ecommerce_steady_identity():
    counts = _event_names(_drain("ecommerce_steady"))
    for step in ("Home", "Search", "ProductView", "AddToCart", "Purchase"):
        assert counts[step] > 0, step
    assert counts["Home"] > counts["Purchase"]


def test_ecommerce_explosive_identity():
    seen = _first_seen_per_user(
        _drain("ecommerce_explosive", total_users=2000, window_days=60)
    )
    ts = list(seen.values())
    midpoint = min(ts) + (max(ts) - min(ts)) / 2
    first_half = sum(1 for t in ts if t <= midpoint)
    second_half = sum(1 for t in ts if t > midpoint)
    assert second_half > first_half, (first_half, second_half)


def test_retail_declining_identity():
    seen = _first_seen_per_user(
        _drain("retail_declining", total_users=2000, window_days=60)
    )
    ts = list(seen.values())
    midpoint = min(ts) + (max(ts) - min(ts)) / 2
    first_half = sum(1 for t in ts if t <= midpoint)
    second_half = sum(1 for t in ts if t > midpoint)
    assert first_half > second_half, (first_half, second_half)


def test_casual_game_addictive_identity():
    counts = _event_names(_drain("casual_game_addictive"))
    assert counts["IAPPurchase"] > 0


def test_saas_pmf_identity():
    counts = _event_names(_drain("saas_pmf"))
    assert counts["PlanUpgraded"] > 0


def test_streaming_mature_identity():
    counts = _event_names(_drain("streaming_mature"))
    assert counts["PlayCompleted"] > 0


def test_marketplace_scaling_identity():
    counts = _event_names(_drain("marketplace_scaling"))
    assert counts["Purchase"] > 0


def test_dating_app_churn_identity():
    batches = _drain("dating_app_churn", total_users=2000, window_days=60)
    spans = _user_spans_days(batches)
    if not spans:
        pytest.skip("no multi-session users — can't measure span")
    spans.sort()
    median = spans[len(spans) // 2]
    assert median < 30.0, median
