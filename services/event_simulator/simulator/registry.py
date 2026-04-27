"""In-process registry for AxisModifier implementations.

The registry is instantiated on engine startup; axis modules register themselves
via ``register_axis()``.
"""

from __future__ import annotations

from services.event_simulator.simulator.protocols import AxisModifier


class AxisRegistry:
    def __init__(self) -> None:
        self._axes: dict[str, AxisModifier] = {}

    def register(self, axis: AxisModifier) -> None:
        if axis.name in self._axes:
            raise ValueError(f"axis {axis.name!r} already registered")
        self._axes[axis.name] = axis

    def get(self, name: str) -> AxisModifier:
        try:
            return self._axes[name]
        except KeyError as exc:
            raise KeyError(f"unknown axis {name!r}; valid: {list(self._axes)}") from exc

    def all_names(self) -> list[str]:
        return list(self._axes)
