"""Stickiness axis — sets RetentionParams on SimulationState.

Each value maps to a RetentionParams instance that mirrors the TypeScript twin's
axisSpec.ts stickiness presets. The cohort engine uses these params via cohort_model.
"""

from __future__ import annotations

from typing import Any

from seeders.simulator.cohort_model import RetentionParams
from seeders.simulator.protocols import AxisModifier, SimulationState

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
        peak_churn_rate=0.75,
        base_churn_rate=0.20,
        churn_decay_days=4,
        reactivation_rate=0.02,
        reactivation_decay=0.7,
        max_dormant_days=20,
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
