import pytest

from services.event_simulator.simulator.axes.engagement_depth import EngagementDepthAxis
from services.event_simulator.simulator.protocols import SimulationState


def _state() -> SimulationState:
    return SimulationState(random_seed=1, total_users=100, window_days=30)


@pytest.mark.parametrize("value", ["shallow", "moderate", "deep"])
def test_engagement_depth_values_register(value):
    assert value in EngagementDepthAxis().values


def test_shallow_sets_lower_freq_multiplier_than_deep():
    shallow = _state()
    deep = _state()
    EngagementDepthAxis().apply("shallow", shallow)
    EngagementDepthAxis().apply("deep", deep)

    assert shallow.session_freq_multiplier < deep.session_freq_multiplier


def test_moderate_is_identity():
    state = _state()
    EngagementDepthAxis().apply("moderate", state)
    assert state.session_freq_multiplier == 1.0


def test_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown engagement_depth value"):
        EngagementDepthAxis().apply("abyssal", state)
