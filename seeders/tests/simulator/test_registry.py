import pytest

from seeders.simulator.protocols import SimulationState
from seeders.simulator.registry import AxisRegistry, DomainRegistry


class _FakeAxis:
    name = "growth"
    values = {"flat": None, "explosive": None}

    def apply(self, value: str, simulation: SimulationState) -> None:
        simulation.arrival_curve = value  # marker


class _FakeDomain:
    name = "ecommerce"
    events = ("PageView", "Purchase")
    supported_monetization = ("one_off_purchase",)

    def build_session(self, user, session_start, archetype, state, rng):
        return []


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


def test_domain_registry_register_and_lookup():
    reg = DomainRegistry()
    reg.register(_FakeDomain())
    assert reg.get("ecommerce").events == ("PageView", "Purchase")


class _FakeAxis2:
    name = "stickiness"
    values: dict[str, None] = {}

    def apply(self, value: str, simulation: SimulationState) -> None:
        pass


def test_axis_registry_iterates_in_insertion_order():
    reg = AxisRegistry()
    reg.register(_FakeAxis())
    reg.register(_FakeAxis2())
    assert list(reg.all_names()) == ["growth", "stickiness"]
