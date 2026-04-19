"""Engine cohort-based behavior tests."""

from __future__ import annotations

from collections import Counter
from datetime import datetime

import pytest

from seeders.seeder import BaseSeeder, SeedConfig
from seeders.simulator import Engine, SimulationConfig
from seeders.simulator.config import ScaleOverride


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def _cfg(**axes) -> SimulationConfig:
    defaults = {"scale": "tiny", "growth": "steady", "stickiness": "normal"}
    defaults.update(axes)
    return SimulationConfig(
        name="ecommerce_steady",
        domain="ecommerce",
        axes=defaults,
        scale_config=ScaleOverride(total_users=300, window_days=30),
        random_seed=42,
    )


def _drain(cfg):
    seeder = _StubSeeder(config=SeedConfig())
    return list(Engine(cfg, seeder).run())


def _event_names(batches) -> Counter[str]:
    return Counter(ev[1] for b in batches for ev in b)


def test_engine_produces_events():
    names = _event_names(_drain(_cfg()))
    assert sum(names.values()) > 0
    assert "Home" in names


def test_engine_event_vocabulary_matches_ecommerce():
    names = _event_names(_drain(_cfg()))
    assert names.keys() <= {"Home", "Search", "ProductView", "AddToCart", "Purchase"}


def test_declining_growth_has_fewer_users_late_than_early():
    batches = _drain(_cfg(growth="declining"))
    events = [ev for b in batches for ev in b]
    first_seen: dict[str, datetime] = {}
    for ev in events:
        uid, _name, ts, *_ = ev
        if uid not in first_seen or ts < first_seen[uid]:
            first_seen[uid] = ts
    ts_values = sorted(first_seen.values())
    first_quartile = ts_values[: len(ts_values) // 4]
    last_quartile = ts_values[-len(ts_values) // 4 :]
    assert len(first_quartile) >= len(last_quartile)


def test_explosive_growth_has_more_users_late_than_early():
    batches = _drain(_cfg(growth="explosive"))
    events = [ev for b in batches for ev in b]
    first_seen: dict[str, datetime] = {}
    for ev in events:
        uid, _name, ts, *_ = ev
        if uid not in first_seen or ts < first_seen[uid]:
            first_seen[uid] = ts
    ts_values = sorted(first_seen.values())
    first_q_count = len(ts_values) // 4
    last_q_count = len(ts_values) - 3 * (len(ts_values) // 4)
    assert last_q_count > first_q_count


def test_churn_heavy_users_have_shorter_active_windows_than_sticky():
    churn_batches = _drain(_cfg(stickiness="churn_heavy"))
    sticky_batches = _drain(_cfg(stickiness="sticky"))

    def median_user_span_days(batches):
        events = [ev for b in batches for ev in b]
        per_user_ts: dict[str, list[datetime]] = {}
        for ev in events:
            per_user_ts.setdefault(ev[0], []).append(ev[2])
        spans_days = []
        for tss in per_user_ts.values():
            if len(tss) < 2:
                continue
            span = (max(tss) - min(tss)).total_seconds() / 86400.0
            spans_days.append(span)
        spans_days.sort()
        return spans_days[len(spans_days) // 2] if spans_days else 0.0

    assert median_user_span_days(sticky_batches) > median_user_span_days(churn_batches)


def test_engine_is_deterministic_under_fixed_seed():
    a = _event_names(_drain(_cfg()))
    b = _event_names(_drain(_cfg()))
    assert a == b


def test_engine_raises_on_unknown_domain():
    cfg = SimulationConfig(
        name="bad",
        domain="made_up",
        axes={"scale": "tiny"},
        scale_config=ScaleOverride(total_users=10, window_days=5),
        random_seed=1,
    )
    seeder = _StubSeeder(config=SeedConfig())
    with pytest.raises(KeyError, match="unknown domain"):
        list(Engine(cfg, seeder).run())


def test_engine_ignores_unknown_axes():
    """Phase 2b axes (engagement_depth, monetization, …) are unknown today —
    they must be silently ignored, not raise."""
    cfg = _cfg(engagement_depth="moderate", monetization="one_off_purchase")
    _drain(cfg)  # must not raise
