import pytest

from seeders.simulator.axes.geography import GeographyAxis
from seeders.simulator.protocols import SimulationState


def _state() -> SimulationState:
    return SimulationState(random_seed=1, total_users=100, window_days=30)


@pytest.mark.parametrize("value", ["global", "us_only", "eu_only", "apac_only"])
def test_geography_values_register(value):
    assert value in GeographyAxis().values


def test_global_leaves_allowed_countries_none():
    state = _state()
    GeographyAxis().apply("global", state)
    assert state.allowed_countries is None


def test_us_only_sets_single_country():
    state = _state()
    GeographyAxis().apply("us_only", state)
    assert state.allowed_countries == {"US"}


def test_eu_only_covers_european_codes():
    state = _state()
    GeographyAxis().apply("eu_only", state)
    assert state.allowed_countries == {"UK", "DE", "FR"}


def test_apac_only_covers_apac_codes():
    state = _state()
    GeographyAxis().apply("apac_only", state)
    assert state.allowed_countries == {"JP", "IN", "AU"}


def test_unknown_value_raises():
    state = _state()
    with pytest.raises(ValueError, match="unknown geography value"):
        GeographyAxis().apply("mars", state)
