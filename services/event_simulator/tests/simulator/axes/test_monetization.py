import pytest

from services.event_simulator.simulator.axes.monetization import MonetizationAxis
from services.event_simulator.simulator.protocols import SimulationState


def _state() -> SimulationState:
    return SimulationState(random_seed=1, total_users=100, window_days=30)


@pytest.mark.parametrize(
    "value",
    [
        "one_off_purchase",
        "subscription",
        "iap_whales",
        "ad_supported",
        "freemium",
        "marketplace_fee",
    ],
)
def test_monetization_values_register(value):
    assert value in MonetizationAxis().values


def test_monetization_sets_mode_on_state():
    state = _state()
    MonetizationAxis().apply("subscription", state)
    assert state.monetization_mode == "subscription"


def test_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown monetization value"):
        MonetizationAxis().apply("bitcoin", state)
