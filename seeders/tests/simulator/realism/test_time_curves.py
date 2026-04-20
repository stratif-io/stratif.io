from __future__ import annotations

import random

from seeders.simulator.realism.time_curves import (
    get_dow_weights,
    get_hour_weights,
    sample_hour,
    sample_weighted_dow,
)


def test_hour_weights_24_entries():
    weights = get_hour_weights("ecommerce", is_weekend=False)
    assert len(weights) == 24
    assert all(w >= 0 for w in weights)


def test_ecommerce_weekday_evening_higher_than_3am():
    weights = get_hour_weights("ecommerce", is_weekend=False)
    assert weights[20] > weights[3]  # 8pm > 3am


def test_sample_hour_biased_toward_high_weights():
    weights = [0.0] * 24
    weights[14] = 1.0  # only 14:00 has weight
    rng = random.Random(1)
    for _ in range(200):
        assert sample_hour(rng, weights) == 14


def test_dow_weights_7_entries():
    weights = get_dow_weights("ecommerce")
    assert len(weights) == 7


def test_ecommerce_weekends_heavier_than_tuesdays():
    weights = get_dow_weights("ecommerce")
    assert weights[5] > weights[1]  # Sat > Tue
    assert weights[6] > weights[1]  # Sun > Tue


def test_unknown_domain_returns_uniform_weights():
    weekday = get_hour_weights("unknown_domain", is_weekend=False)
    assert all(abs(w - weekday[0]) < 1e-9 for w in weekday)
    dow = get_dow_weights("unknown_domain")
    assert all(abs(w - dow[0]) < 1e-9 for w in dow)


def test_sample_weighted_dow_respects_weights():
    weights = [0.0] * 7
    weights[3] = 1.0  # only Thursday
    rng = random.Random(1)
    sampled = {sample_weighted_dow(rng, weights) for _ in range(50)}
    assert sampled == {3}
