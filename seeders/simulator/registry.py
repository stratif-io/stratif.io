"""In-process registries for AxisModifier and DomainPack implementations.

Registries are instantiated on engine startup; Phase 2 / Phase 4 modules
register themselves via ``register_axis()`` / ``register_domain()``.
"""

from __future__ import annotations

from seeders.simulator.protocols import AxisModifier, DomainPack


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


class DomainRegistry:
    def __init__(self) -> None:
        self._domains: dict[str, DomainPack] = {}

    def register(self, domain: DomainPack) -> None:
        if domain.name in self._domains:
            raise ValueError(f"domain {domain.name!r} already registered")
        self._domains[domain.name] = domain

    def get(self, name: str) -> DomainPack:
        try:
            return self._domains[name]
        except KeyError as exc:
            raise KeyError(
                f"unknown domain {name!r}; valid: {list(self._domains)}"
            ) from exc

    def all_names(self) -> list[str]:
        return list(self._domains)
