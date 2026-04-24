import random
from collections import Counter

import pytest

from seeders.simulator.axes.engagement_depth import EngagementDepthAxis
from seeders.simulator.cohort import sample_session_archetype
from seeders.simulator.protocols import SimulationState


def _state() -> SimulationState:
    return SimulationState(random_seed=1, total_users=100, window_days=30)


@pytest.mark.parametrize("value", ["shallow", "moderate", "deep"])
def test_engagement_depth_values_register(value):
    assert value in EngagementDepthAxis().values


def test_shallow_produces_more_bouncers_than_deep():
    shallow = _state()
    deep = _state()
    EngagementDepthAxis().apply("shallow", shallow)
    EngagementDepthAxis().apply("deep", deep)

    rng = random.Random(42)
    shallow_counts = Counter(
        sample_session_archetype(rng, "regular", modifier=shallow.session_mix_modifier)
        for _ in range(5000)
    )
    rng = random.Random(42)
    deep_counts = Counter(
        sample_session_archetype(rng, "regular", modifier=deep.session_mix_modifier)
        for _ in range(5000)
    )

    assert shallow_counts["bounce"] > deep_counts["bounce"]
    assert deep_counts["converter"] > shallow_counts["converter"]


def test_moderate_is_identity():
    state = _state()
    EngagementDepthAxis().apply("moderate", state)
    mod = state.session_mix_modifier
    assert mod is not None
    assert all(v == 1.0 for v in mod.values())


def test_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown engagement_depth value"):
        EngagementDepthAxis().apply("abyssal", state)
