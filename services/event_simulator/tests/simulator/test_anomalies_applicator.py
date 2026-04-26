"""Anomaly parser + arrivals applicator tests."""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest

from services.event_simulator.simulator.anomalies import (
    AnomalyRecord,
    arrivals_multiplier,
    parse_anomalies,
)


def _now() -> datetime:
    return datetime(2026, 4, 20, tzinfo=UTC)


def test_parse_relative_start_and_duration():
    recs = parse_anomalies(
        [
            {
                "type": "marketing_campaign",
                "start": "-10d",
                "duration": "3d",
                "effect": {"arrivals": 2.5},
            }
        ],
        now=_now(),
    )
    assert len(recs) == 1
    r = recs[0]
    assert r.type == "marketing_campaign"
    assert r.start == date(2026, 4, 10)
    assert abs(r.duration_days - 3.0) < 1e-6
    assert r.effects == {"arrivals": 2.5}


def test_parse_absolute_date():
    recs = parse_anomalies(
        [
            {
                "type": "shopping_season",
                "date": "2024-11-29",
                "duration": "4d",
                "effect": {"arrivals": 3.0},
            }
        ],
        now=_now(),
    )
    assert recs[0].start == date(2024, 11, 29)


def test_parse_hours_duration():
    recs = parse_anomalies(
        [
            {
                "type": "outage",
                "start": "-5d",
                "duration": "6h",
                "effect": {"all_events": 0.0},
            }
        ],
        now=_now(),
    )
    assert abs(recs[0].duration_days - 0.25) < 1e-6


def test_arrivals_multiplier_composes_active_anomalies():
    recs = [
        AnomalyRecord(
            type="marketing_campaign",
            name=None,
            start=date(2026, 4, 10),
            duration_days=7,
            effects={"arrivals": 2.5},
        ),
        AnomalyRecord(
            type="shopping_season",
            name="black_friday",
            start=date(2026, 4, 10),
            duration_days=3,
            effects={"arrivals": 3.0},
        ),
    ]
    # Day inside both windows — product of multipliers.
    assert abs(arrivals_multiplier(recs, date(2026, 4, 12)) - 7.5) < 1e-6
    # Day outside any window.
    assert arrivals_multiplier(recs, date(2025, 1, 1)) == 1.0


def test_arrivals_multiplier_no_arrivals_effect_has_no_impact():
    recs = [
        AnomalyRecord(
            type="outage",
            name=None,
            start=date(2026, 4, 10),
            duration_days=1,
            effects={"all_events": 0.0},
        ),
    ]
    assert arrivals_multiplier(recs, date(2026, 4, 10)) == 1.0


def test_empty_list_returns_1():
    assert arrivals_multiplier([], date(2026, 4, 12)) == 1.0


def test_parse_positive_relative_start_is_relative_to_window_start():
    # "71d" in a 90-day window → day_0 + 71 days = (now - 90d) + 71d = now - 19d
    recs = parse_anomalies(
        [
            {
                "type": "product_launch",
                "start": "71d",
                "duration": "7d",
                "effect": {"arrivals": 9000},
            }
        ],
        now=_now(),
        window_days=90,
    )
    # day_0 = 2026-04-20 - 90d = 2026-01-20; day_0 + 71d = 2026-04-01
    assert recs[0].start == date(2026, 4, 1)


def test_unparseable_duration_raises():
    with pytest.raises(ValueError, match="unparseable duration"):
        parse_anomalies(
            [{"type": "outage", "start": "-5d", "duration": "5xyz"}],
            now=_now(),
        )
