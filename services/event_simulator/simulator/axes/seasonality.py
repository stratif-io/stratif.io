"""Seasonality axes — daily_pattern, weekly_pattern, monthly_seasonality."""

from __future__ import annotations

from typing import Any

from services.event_simulator.simulator.protocols import AxisModifier, SimulationState
from services.event_simulator.simulator.realism.time_curves import (
    _UNIFORM_7,
    _UNIFORM_24,
    get_monthly_multiplier,
)


class DailyPatternAxis:
    name: str = "daily_pattern"
    values: dict[str, Any] = {
        "business_hours": None,
        "evening_peak": None,
        "always_on": None,
        "night_owl": None,
    }

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value == "always_on":
            simulation.hour_weights_weekday = list(_UNIFORM_24)
            simulation.hour_weights_weekend = list(_UNIFORM_24)
        else:
            from services.event_simulator.simulator.realism.time_curves import (
                _HOUR_WEIGHTS,
            )

            pair = _HOUR_WEIGHTS.get(value)
            if pair is None:
                raise ValueError(f"unknown daily_pattern {value!r}")
            simulation.hour_weights_weekday = list(pair[0])
            simulation.hour_weights_weekend = list(pair[1])


assert isinstance(DailyPatternAxis(), AxisModifier)


class WeeklyPatternAxis:
    name: str = "weekly_pattern"
    values: dict[str, Any] = {
        "weekdays_only": None,
        "weekends_heavy": None,
        "flat": None,
    }

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value == "flat":
            simulation.dow_weights = list(_UNIFORM_7)
        else:
            from services.event_simulator.simulator.realism.time_curves import (
                _DOW_WEIGHTS,
            )

            weights = _DOW_WEIGHTS.get(value)
            if weights is None:
                raise ValueError(f"unknown weekly_pattern {value!r}")
            simulation.dow_weights = list(weights)


assert isinstance(WeeklyPatternAxis(), AxisModifier)


class MonthlySeasonalityAxis:
    name: str = "monthly_seasonality"
    values: dict[str, Any] = {
        "nov_dec_peak": None,
        "nov_dec_extreme": None,
        "q4_heavy": None,
        "summer_peak": None,
        "flat": None,
    }

    def apply(self, value: str, simulation: SimulationState) -> None:
        if value == "flat":
            simulation.calendar_multiplier = None
            return
        pattern = value
        simulation.calendar_multiplier = lambda d: get_monthly_multiplier(
            pattern, d.month
        )


assert isinstance(MonthlySeasonalityAxis(), AxisModifier)
