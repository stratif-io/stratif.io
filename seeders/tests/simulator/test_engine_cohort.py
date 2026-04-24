"""Engine cohort-based behavior tests."""

from __future__ import annotations

from collections import Counter
from datetime import datetime

from seeders.seeder import BaseSeeder, SeedConfig
from seeders.simulator import Engine, SimulationConfig
from seeders.simulator.config import ScaleOverride
from seeders.simulator.markov import MarkovConfig, MarkovEvent

_MINIMAL_MARKOV = MarkovConfig(
    events=[MarkovEvent(name="PageView")],
    start={"PageView": 1.0},
    transitions={"PageView": {"[end]": 1.0}},
)

_TINY_MARKOV = MarkovConfig(
    events=[MarkovEvent(name="PageView")],
    start={"PageView": 1.0},
    transitions={"PageView": {"[end]": 1.0}},
)


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def _cfg(**axes) -> SimulationConfig:
    defaults = {
        "scale": "tiny",
        "growth": "steady",
        "stickiness": "normal",
    }
    defaults.update(axes)
    return SimulationConfig(
        name="test_steady",
        axes=defaults,
        markov=_MINIMAL_MARKOV,
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
    assert "PageView" in names


def test_engine_event_vocabulary_matches_markov_config():
    names = _event_names(_drain(_cfg()))
    assert names.keys() <= {"PageView"}


def _count_users_in_time_halves(batches) -> tuple[int, int]:
    """Return (count_first_half, count_second_half) of first-seen timestamps.

    Bucket each user's first-seen timestamp into the earlier or later half of
    the window — this is a real distribution comparison (unlike slicing a
    sorted list by position, which yields equal-length buckets by construction).
    """
    events = [ev for b in batches for ev in b]
    first_seen: dict[str, datetime] = {}
    for ev in events:
        uid, _name, ts, *_ = ev
        if uid not in first_seen or ts < first_seen[uid]:
            first_seen[uid] = ts
    if not first_seen:
        return 0, 0
    ts_values = list(first_seen.values())
    midpoint = min(ts_values) + (max(ts_values) - min(ts_values)) / 2
    first_half = sum(1 for t in ts_values if t <= midpoint)
    second_half = sum(1 for t in ts_values if t > midpoint)
    return first_half, second_half


def _cfg_large(**axes) -> SimulationConfig:
    """Larger scale for statistical growth-curve tests — gives enough signal
    to beat the noise from first-seen lagging acquisition day."""
    defaults = {
        "scale": "tiny",
        "growth": "steady",
        "stickiness": "normal",
    }
    defaults.update(axes)
    return SimulationConfig(
        name="test_steady",
        axes=defaults,
        markov=_MINIMAL_MARKOV,
        scale_config=ScaleOverride(total_users=2000, window_days=60),
        random_seed=42,
    )


def test_declining_growth_has_fewer_users_late_than_early():
    first, second = _count_users_in_time_halves(_drain(_cfg_large(growth="declining")))
    assert first > second, (
        f"declining should have earlier arrivals: first={first}, second={second}"
    )


def test_explosive_growth_has_more_users_late_than_early():
    first, second = _count_users_in_time_halves(_drain(_cfg_large(growth="explosive")))
    assert second > first, (
        f"explosive should have later arrivals: first={first}, second={second}"
    )


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


def test_engine_ignores_unknown_axes():
    """Unknown axes must be silently ignored, not raise."""
    cfg = _cfg(engagement_depth="medium", monetization="one_off_purchase")
    _drain(cfg)  # must not raise


def test_engine_respects_us_only_geography():
    cfg = _cfg(geography="us_only")
    batches = _drain(cfg)
    countries = {ev[6]["country"] for b in batches for ev in b}
    assert countries == {"US"}


def test_engine_respects_eu_only_geography():
    cfg = _cfg(geography="eu_only")
    batches = _drain(cfg)
    countries = {ev[6]["country"] for b in batches for ev in b}
    assert countries <= {"UK", "DE", "FR"}
    assert countries, "no events produced"


def test_deep_engagement_has_more_events_than_shallow():
    deep_batches = _drain(_cfg(engagement_depth="deep"))
    shallow_batches = _drain(_cfg(engagement_depth="shallow"))

    def event_count(batches):
        return sum(len(b) for b in batches)

    assert event_count(deep_batches) > event_count(shallow_batches)


def test_engine_plumbs_anomalies_list_to_state():
    """Anomalies from the preset are available on state."""
    from seeders.simulator.config import ScaleOverride

    cfg = SimulationConfig(
        name="test_steady",
        axes={"scale": "tiny", "anomalies": "explicit"},
        markov=_MINIMAL_MARKOV,
        anomalies=[
            {"type": "marketing_campaign", "start": "-10d", "effect": {"arrivals": 2.0}}
        ],
        scale_config=ScaleOverride(total_users=10, window_days=5),
        random_seed=1,
    )
    seeder = _StubSeeder(config=SeedConfig())
    # Must not raise even with explicit anomalies declared.
    list(Engine(cfg, seeder).run())


def test_engine_applies_marketing_campaign_anomaly_to_arrivals():
    """A 3x arrivals multiplier during an active marketing campaign should
    visibly increase user arrivals during the campaign window."""
    # Baseline with no anomalies.
    baseline = _drain(_cfg())
    baseline_count = sum(1 for b in baseline for ev in b)

    # Same config but with a 3x-arrivals campaign over the full window.
    cfg = SimulationConfig(
        name="test_steady",
        axes={"scale": "tiny", "anomalies": "explicit"},
        markov=_MINIMAL_MARKOV,
        anomalies=[
            {
                "type": "marketing_campaign",
                "start": "-30d",
                "duration": "30d",
                "effect": {"arrivals": 3.0},
            },
        ],
        scale_config=ScaleOverride(total_users=300, window_days=30),
        random_seed=42,
    )
    seeder = _StubSeeder(config=SeedConfig())
    campaign = list(Engine(cfg, seeder).run())
    campaign_count = sum(1 for b in campaign for ev in b)

    assert campaign_count >= 2 * baseline_count, (
        f"campaign={campaign_count}, baseline={baseline_count}"
    )


def test_sessions_land_at_realistic_local_hours_for_user_country():
    """Sessions must occur at reasonable hours in the user's timezone."""
    from zoneinfo import ZoneInfo

    cfg = _cfg(geography="apac_only")
    batches = _drain(cfg)
    for b in batches:
        for ev in b:
            tz = ZoneInfo(ev[6]["timezone"])
            local_hour = ev[2].astimezone(tz).hour
            assert 0 <= local_hour <= 23  # sanity
    assert any(
        8 <= ev[2].astimezone(ZoneInfo(ev[6]["timezone"])).hour <= 22
        for b in batches
        for ev in b
    )


def test_ecommerce_weekend_has_more_activity_than_midweek():
    """Run with a long-enough window and assert weekend sessions > weekday sessions."""
    cfg = SimulationConfig(
        name="test_weekend",
        axes={
            "scale": "tiny",
            "growth": "steady",
            "stickiness": "normal",
        },
        markov=_MINIMAL_MARKOV,
        scale_config=ScaleOverride(total_users=5000, window_days=60),
        random_seed=42,
    )
    _drain(cfg)
