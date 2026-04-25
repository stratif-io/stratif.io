"""Preview engine — runs simulation in-memory and returns daily timeseries.

Caps simulated users at _PREVIEW_USER_CAP for performance, then scales
all counts back to the configured total_users.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from seeders.simulator.anomalies import arrivals_multiplier, parse_anomalies
from seeders.simulator.axes._defaults import default_axis_registry
from seeders.simulator.cohort_model import active_days_for_user
from seeders.simulator.config import SimulationConfig
from seeders.simulator.protocols import SimulationState
from seeders.simulator.realism.calendars import calendar_multiplier
from seeders.simulator.realism.time_curves import get_dow_weights

_PREVIEW_USER_CAP = 5_000


@dataclass
class PreviewResult:
    days: list[int]
    new_users: list[int]
    active_users: list[int]
    churned: list[int]
    reactivated: list[int]
    events: list[int]
    stickiness: list[float]
    growth_curve: list[float]


def _poisson(rng: random.Random, lam: float) -> int:
    if lam <= 0:
        return 0
    if lam > 30:
        return max(0, int(rng.gauss(lam, math.sqrt(lam)) + 0.5))
    limit = math.exp(-lam)
    k, p = 0, 1.0
    while True:
        k += 1
        p *= rng.random()
        if p < limit:
            return k - 1


def _avg_events_per_session(config: SimulationConfig) -> float:
    """Estimate expected events per session from the Markov transition matrix."""
    end_probs = [t.get("[end]", 0.0) for t in config.markov.transitions.values()]
    if not end_probs:
        return 3.0
    avg_end = sum(end_probs) / len(end_probs)
    return min(max(1.0 / avg_end if avg_end > 0 else 5.0, 1.0), 20.0)


def run_preview(config: SimulationConfig) -> PreviewResult:
    """Run the simulation engine in preview mode and return daily timeseries."""
    scale = config.resolved_scale()
    state = SimulationState(
        random_seed=config.random_seed or 0,
        total_users=scale.total_users,
        window_days=scale.window_days,
        now=datetime.now(UTC),
    )
    state.anomalies = list(config.anomalies)
    state.growth_config = dict(config.growth_config) if config.growth_config else None

    axis_reg = default_axis_registry()
    for name, value in config.axes.items():
        try:
            axis = axis_reg.get(name)
        except KeyError:
            continue  # unknown axis — silently skip
        axis.apply(value, state)

    parsed_anomalies = parse_anomalies(state.anomalies, state.now, state.window_days)
    day_0 = state.now - timedelta(days=state.window_days)
    arrival_curve = state.arrival_curve or (
        lambda d: state.total_users / state.window_days
    )
    rng = random.Random(config.random_seed or 0)
    dow_weights = get_dow_weights("generic")

    # Downsample arrivals for performance; scale reported numbers back up.
    arrival_cap = min(1.0, _PREVIEW_USER_CAP / max(state.total_users, 1))
    report_scale = 1.0 / arrival_cap if arrival_cap > 0 else 1.0

    # --- sample arrivals ---
    new_users_raw: list[int] = []
    growth_curve_raw: list[float] = []
    for d in range(state.window_days):
        local_date = (day_0 + timedelta(days=d)).date()
        dow_mult = dow_weights[local_date.weekday()]
        cal_mult = calendar_multiplier(local_date, "US", "generic")
        anomaly_mult = arrivals_multiplier(parsed_anomalies, local_date)
        g = arrival_curve(d) * arrival_cap
        growth_curve_raw.append(g * report_scale)
        lam = g * dow_mult * cal_mult * anomaly_mult
        new_users_raw.append(_poisson(rng, lam))

    # --- simulate individual users, track active day sets ---
    active_sets: list[set[int]] = [set() for _ in range(state.window_days)]
    first_day: dict[int, int] = {}  # uid → acquisition day
    uid = 0
    for d, n in enumerate(new_users_raw):
        for _ in range(n):
            first_day[uid] = d
            if state.retention_params is not None:
                days_active = active_days_for_user(
                    rng, state.retention_params, d, state.window_days
                )
            elif state.hazard_curve is not None:
                lifetime = state.hazard_curve(rng)
                days_active = list(range(d, min(d + lifetime + 1, state.window_days)))
            else:
                days_active = list(range(d, state.window_days))
            for ad in days_active:
                active_sets[ad].add(uid)
            uid += 1

    # --- build aggregates ---
    active_users_raw = [len(s) for s in active_sets]

    churned_raw = [0] * state.window_days
    reactivated_raw = [0] * state.window_days
    for d in range(1, state.window_days):
        churned_raw[d] = len(active_sets[d - 1] - active_sets[d])
        gap = active_sets[d] - active_sets[d - 1]
        reactivated_raw[d] = sum(1 for u in gap if first_day[u] < d)

    avg_eps = _avg_events_per_session(config)
    session_mult = state.session_freq_multiplier

    def _scale(v: float) -> int:
        return round(v * report_scale)

    cumulative = 0
    stickiness: list[float] = []
    for d in range(state.window_days):
        cumulative += new_users_raw[d]
        stickiness.append(active_users_raw[d] / max(cumulative, 1))

    return PreviewResult(
        days=list(range(state.window_days)),
        new_users=[_scale(v) for v in new_users_raw],
        active_users=[_scale(v) for v in active_users_raw],
        churned=[_scale(v) for v in churned_raw],
        reactivated=[_scale(v) for v in reactivated_raw],
        events=[
            _scale(active_users_raw[d] * session_mult * avg_eps)
            for d in range(state.window_days)
        ],
        stickiness=stickiness,
        growth_curve=growth_curve_raw,
    )
