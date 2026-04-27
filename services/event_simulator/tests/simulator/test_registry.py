import pytest

from services.event_simulator.simulator.protocols import SimulationState
from services.event_simulator.simulator.registry import AxisRegistry


class _FakeAxis:
    name = "growth"
    values = {"flat": None, "explosive": None}

    def apply(self, value: str, simulation: SimulationState) -> None:
        simulation.arrival_curve = value  # marker


class _FakeAxis2:
    name = "stickiness"
    values: dict[str, None] = {}

    def apply(self, value: str, simulation: SimulationState) -> None:
        pass


def test_axis_registry_register_and_lookup():
    reg = AxisRegistry()
    reg.register(_FakeAxis())
    assert reg.get("growth").name == "growth"
    assert "growth" in reg.all_names()


def test_axis_registry_duplicate_register_raises():
    reg = AxisRegistry()
    reg.register(_FakeAxis())
    with pytest.raises(ValueError, match="already registered"):
        reg.register(_FakeAxis())


def test_axis_registry_missing_raises():
    reg = AxisRegistry()
    with pytest.raises(KeyError, match="unknown axis"):
        reg.get("growth")


def test_axis_registry_iterates_in_insertion_order():
    reg = AxisRegistry()
    reg.register(_FakeAxis())
    reg.register(_FakeAxis2())
    assert list(reg.all_names()) == ["growth", "stickiness"]
