"""Cohort-sampling helpers — archetype + session-count sampling."""

from __future__ import annotations

import random
from collections import Counter

import pytest

from seeders.simulator.cohort import (
    assign_user_archetype,
    sample_daily_session_count,
    sample_session_archetype,
)


def test_archetype_distribution_is_5_25_70():
    rng = random.Random(42)
    counts = Counter(assign_user_archetype(rng) for _ in range(10_000))
    assert 0.02 <= counts["power"] / 10_000 <= 0.08
    assert 0.22 <= counts["regular"] / 10_000 <= 0.28
    assert 0.65 <= counts["casual"] / 10_000 <= 0.75


def test_session_count_zero_on_day_zero_is_rare():
    rng = random.Random(42)
    counts = Counter(sample_daily_session_count(rng, "casual", 0) for _ in range(1000))
    # A casual user on day 0 rarely has > 1 session.
    assert counts[0] + counts[1] > 800


def test_power_user_session_count_much_higher_than_casual():
    rng = random.Random(42)
    power = sum(sample_daily_session_count(rng, "power", 10) for _ in range(1000))
    casual = sum(sample_daily_session_count(rng, "casual", 10) for _ in range(1000))
    assert power > 3 * casual


def test_session_count_decays_with_age():
    rng = random.Random(42)
    early = sum(sample_daily_session_count(rng, "regular", 5) for _ in range(1000))
    late = sum(sample_daily_session_count(rng, "regular", 300) for _ in range(1000))
    # At least 15% drop between day 5 and day 300 of cohort age.
    assert late < early * 0.85


@pytest.mark.parametrize("user_archetype", ["power", "regular", "casual"])
def test_session_archetype_always_one_of_four(user_archetype):
    rng = random.Random(42)
    valid = {"bounce", "browser", "researcher", "converter"}
    sampled = {sample_session_archetype(rng, user_archetype) for _ in range(200)}
    assert sampled <= valid


def test_power_users_convert_more_often_than_casuals():
    rng = random.Random(42)
    power_converts = sum(
        sample_session_archetype(rng, "power") == "converter" for _ in range(2000)
    )
    casual_converts = sum(
        sample_session_archetype(rng, "casual") == "converter" for _ in range(2000)
    )
    assert power_converts > casual_converts


def test_assign_user_archetype_is_deterministic_under_seeded_rng():
    rng1 = random.Random(100)
    rng2 = random.Random(100)
    seq1 = [assign_user_archetype(rng1) for _ in range(10)]
    seq2 = [assign_user_archetype(rng2) for _ in range(10)]
    assert seq1 == seq2


def test_sample_session_archetype_respects_modifier():
    import random

    from seeders.simulator.cohort import sample_session_archetype

    rng = random.Random(42)
    skew = {"bounce": 0.0, "browser": 0.0, "researcher": 0.0, "converter": 1.0}
    # With all weight on converter, every draw must be converter.
    for _ in range(50):
        assert sample_session_archetype(rng, "casual", modifier=skew) == "converter"
