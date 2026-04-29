"""Stickiness axis — sets RetentionParams on SimulationState.

Each value maps to a RetentionParams instance that mirrors the TypeScript twin's
axisSpec.ts stickiness presets. The cohort engine uses these params via cohort_model.
"""

from __future__ import annotations

from typing import Any

from services.event_simulator.simulator.cohort_model import RetentionParams
from services.event_simulator.simulator.protocols import AxisModifier, SimulationState

_PARAMS: dict[str, RetentionParams] = {
    "one_shot": RetentionParams(
        peak_churn_rate=0.97,
        base_churn_rate=0.60,
        churn_decay_days=2,
        reactivation_rate=0.005,
        reactivation_decay=0.5,
        max_dormant_days=7,
    ),
    "churn_heavy": RetentionParams(
        # High D1 churn (50%): many trial users leave after first session.
        # But base long-term churn is moderate (1.5%/day ≈ 50-day avg lifetime),
        # so engaged users stay weeks. Reactivation is meaningful (8%) — people
        # come back after a break. Models dating apps, casual social, content apps.
        peak_churn_rate=0.50,
        base_churn_rate=0.015,
        churn_decay_days=5,
        reactivation_rate=0.08,
        reactivation_decay=0.80,
        max_dormant_days=45,
    ),
    "normal": RetentionParams(
        peak_churn_rate=0.50,
        base_churn_rate=0.05,
        churn_decay_days=10,
        reactivation_rate=0.05,
        reactivation_decay=0.8,
        max_dormant_days=45,
    ),
    "sticky": RetentionParams(
        peak_churn_rate=0.25,
        base_churn_rate=0.01,
        churn_decay_days=14,
        reactivation_rate=0.10,
        reactivation_decay=0.85,
        max_dormant_days=90,
    ),
    "addictive": RetentionParams(
        peak_churn_rate=0.05,
        base_churn_rate=0.001,
        churn_decay_days=30,
        reactivation_rate=0.30,
        reactivation_decay=0.95,
        max_dormant_days=180,
    ),
    "no_one_churns": RetentionParams(
        peak_churn_rate=0.001,
        base_churn_rate=0.0001,
        churn_decay_days=1,
        reactivation_rate=0.80,
        reactivation_decay=0.99,
        max_dormant_days=365,
    ),
}


class StickinessAxis:
    name: str = "stickiness"
    values: dict[str, Any] = dict.fromkeys(_PARAMS)

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value not in _PARAMS:
            raise ValueError(
                f"unknown stickiness value {value!r}; valid: {sorted(_PARAMS)}"
            )
        simulation.retention_params = _PARAMS[value]
        simulation.hazard_curve = None


assert isinstance(StickinessAxis(), AxisModifier)  # structural Protocol check
