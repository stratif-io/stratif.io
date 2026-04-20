import pytest

from seeders.simulator.axes.virality import ViralityAxis
from seeders.simulator.protocols import SimulationState


def _state() -> SimulationState:
    return SimulationState(random_seed=1, total_users=100, window_days=30)


@pytest.mark.parametrize(
    "value,expected_weight",
    [("none", 0.0), ("weak", 0.3), ("strong_viral", 1.0)],
)
def test_virality_weights(value, expected_weight):
    state = _state()
    ViralityAxis().apply(value, state)
    assert state.virality_weight == expected_weight


def test_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown virality value"):
        ViralityAxis().apply("pandemic", state)
