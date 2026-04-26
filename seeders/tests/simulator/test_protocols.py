"""Protocols are structural — these tests verify implementers satisfy them."""

from __future__ import annotations

from dataclasses import dataclass

from seeders.simulator.protocols import AxisModifier, SimulationState


def test_simulation_state_has_required_fields():
    state = SimulationState(
        random_seed=42,
        total_users=1000,
        window_days=30,
    )
    assert state.random_seed == 42
    assert state.total_users == 1000
    assert state.window_days == 30


def test_axis_modifier_protocol_satisfied_by_minimal_impl():
    @dataclass
    class NoopAxis:
        name: str = "noop"
        values: dict | None = None

        def __post_init__(self):
            self.values = {"default": None}

        def apply(self, value: str, simulation: SimulationState) -> None:
            return None

    impl = NoopAxis()
    assert isinstance(impl, AxisModifier)  # runtime_checkable Protocol
    assert impl.name == "noop"
