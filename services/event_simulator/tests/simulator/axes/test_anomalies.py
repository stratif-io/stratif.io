import pytest

from services.event_simulator.simulator.axes.anomalies import AnomaliesAxis
from services.event_simulator.simulator.protocols import SimulationState


def _state_with_anomalies(anomaly_list) -> SimulationState:
    state = SimulationState(random_seed=1, total_users=100, window_days=30)
    state.anomalies = list(anomaly_list)
    return state


@pytest.mark.parametrize(
    "value",
    ["clean", "campaigns", "outages", "ab_tests", "full", "explicit"],
)
def test_anomalies_values_register(value):
    assert value in AnomaliesAxis().values


def test_clean_empties_anomaly_list():
    state = _state_with_anomalies([{"type": "outage"}])
    AnomaliesAxis().apply("clean", state)
    assert state.anomalies == []


def test_explicit_preserves_anomaly_list():
    state = _state_with_anomalies([{"type": "outage", "duration": "4h"}])
    AnomaliesAxis().apply("explicit", state)
    assert state.anomalies == [{"type": "outage", "duration": "4h"}]


def test_full_preserves_anomaly_list():
    state = _state_with_anomalies([{"type": "campaign"}])
    AnomaliesAxis().apply("full", state)
    assert state.anomalies == [{"type": "campaign"}]


def test_unknown_value_raises():
    state = _state_with_anomalies([])
    with pytest.raises(ValueError, match="unknown anomalies value"):
        AnomaliesAxis().apply("chaos", state)
