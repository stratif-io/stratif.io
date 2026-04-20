from __future__ import annotations

import random
from collections import Counter

from seeders.simulator.realism.power_law import (
    build_zipf_weights,
    pareto_activity_multiplier,
    zipf_sample,
)


def test_pareto_always_geq_1():
    rng = random.Random(1)
    for _ in range(1000):
        assert pareto_activity_multiplier(rng) >= 1.0


def test_pareto_heavy_tail():
    rng = random.Random(1)
    samples = [pareto_activity_multiplier(rng) for _ in range(5000)]
    samples.sort(reverse=True)
    top20 = samples[: len(samples) // 5]
    share = sum(top20) / sum(samples)
    assert share > 0.6


def test_zipf_sample_returns_valid_index():
    rng = random.Random(1)
    for _ in range(200):
        idx = zipf_sample(rng, 50)
        assert 0 <= idx < 50


def test_zipf_weights_sum_to_positive():
    weights = build_zipf_weights(10)
    assert all(w > 0 for w in weights)
    assert sum(weights) > 0


def test_zipf_weights_descending():
    weights = build_zipf_weights(20)
    for i in range(len(weights) - 1):
        assert weights[i] >= weights[i + 1]


def test_zipf_top_ranks_dominate():
    rng = random.Random(1)
    counts = Counter(zipf_sample(rng, 60) for _ in range(10_000))
    top_10 = sum(counts[i] for i in range(10))
    total = sum(counts.values())
    assert top_10 / total > 0.4
