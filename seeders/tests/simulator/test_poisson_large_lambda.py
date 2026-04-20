"""Guard against the large-λ Poisson underflow that used to infinite-loop.

Before the fix, ``_poisson`` used Knuth's algorithm which requires
``math.exp(-λ)``; that underflows to 0 around λ ≈ 709 and the inner while
loop never terminates. Symptom reported by Carlo: seeding with 720-day
window and 37631 users hung.
"""

from __future__ import annotations

import random
import statistics

import pytest

from seeders.simulator.cohort import _poisson as cohort_poisson
from seeders.simulator.engine import _poisson as engine_poisson


@pytest.mark.parametrize(
    "fn", [cohort_poisson, engine_poisson], ids=["cohort", "engine"]
)
@pytest.mark.parametrize("lam", [100, 500, 2894, 10000])
def test_poisson_does_not_hang_for_large_lambda(fn, lam):
    """If this test hangs, the Gaussian-approximation fallback was lost."""
    rng = random.Random(0)
    # Just proving it returns — no assertion on value other than nonneg int.
    result = fn(rng, float(lam))
    assert result >= 0
    assert isinstance(result, int)


@pytest.mark.parametrize("fn", [cohort_poisson, engine_poisson])
def test_poisson_large_lambda_mean_matches(fn):
    """Over many draws, the mean of large-λ Poisson equals λ within ~5%."""
    rng = random.Random(42)
    samples = [fn(rng, 500.0) for _ in range(500)]
    assert 475 <= statistics.mean(samples) <= 525


@pytest.mark.parametrize("fn", [cohort_poisson, engine_poisson])
def test_poisson_small_lambda_still_works(fn):
    """Knuth's path (the small-λ branch) must still fire and be correct."""
    rng = random.Random(42)
    samples = [fn(rng, 2.0) for _ in range(2000)]
    mean = statistics.mean(samples)
    assert 1.7 <= mean <= 2.3
