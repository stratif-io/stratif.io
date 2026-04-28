"""Preview engine — runs simulation in-memory and returns daily timeseries.

Formula (matches the UI formula panel):
  G(t) = starting_rate × s(t)                       # rate × shape multiplier
  A(t) = G(t) · dow(t) · cal(t) · Πk mk(t)         # anomaly multipliers
  J(t) = A(t) · (1 + σZ),  Z ~ N(0,1)              # stochastic jitter
  V(t) = J(t) + K · (DAU(t-1) / cap) · G(t)        # viral amplification
  N(t) ~ Poisson(V(t) · arrival_cap)               # Poisson draw (capped)

Two modes:
  Rate-driven: starting_rate is given directly; total users emerges naturally.
  Goal-driven: binary search finds starting_rate that produces ≈ total_users.

Two-pass approach:
  Pass 1: compute J → draw N₀ → simulate cohorts → get DAU₀(t) for virality
  Pass 2: add viral term → draw final N(t) → final cohort simulation
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from services.event_simulator.simulator.anomalies import (
    arrivals_multiplier,
    parse_anomalies,
)
from services.event_simulator.simulator.axes._defaults import default_axis_registry
from services.event_simulator.simulator.cohort_model import active_days_for_user
from services.event_simulator.simulator.config import SimulationConfig
from services.event_simulator.simulator.protocols import SimulationState
from services.event_simulator.simulator.realism.time_curves import get_dow_weights

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
    seasonality_curve: list[float]  # S(t) = G(t) · dow(t) · cal(t), normalized
    anomaly_curve: list[float]
    jitter_curve: list[float]
    virality_curve: list[float]
    arrival_cap: float  # fraction applied before each Poisson draw; real λ = virality_curve[d] * arrival_cap
    report_scale: (
        float  # multiplier applied after Poisson draw; result = k * report_scale
    )
    start_date: str | None = None  # ISO date of day 0 (e.g. "2009-11-01")


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


_DEFAULT_AVG_EVENTS_PER_SESSION = 3.0  # fallback when Markov transitions are empty


def _avg_events_per_session(config: SimulationConfig) -> float:
    end_probs = [t.get("[end]", 0.0) for t in config.markov.transitions.values()]
    if not end_probs:
        return _DEFAULT_AVG_EVENTS_PER_SESSION
    avg_end = sum(end_probs) / len(end_probs)
    return min(max(1.0 / avg_end if avg_end > 0 else 5.0, 1.0), 20.0)


def _simulate_cohorts(
    arrivals: list[int],
    state: SimulationState,
    rng: random.Random,
) -> tuple[list[set[int]], dict[int, int]]:
    """Simulate user cohorts, returning (active_sets, first_day)."""
    window = len(arrivals)
    active_sets: list[set[int]] = [set() for _ in range(window)]
    first_day: dict[int, int] = {}
    uid = 0
    for d, n in enumerate(arrivals):
        for _ in range(n):
            first_day[uid] = d
            if state.retention_params is not None:
                days_active = active_days_for_user(
                    rng, state.retention_params, d, window
                )
            elif state.hazard_curve is not None:
                lifetime = state.hazard_curve(rng)
                days_active = list(range(d, min(d + lifetime + 1, window)))
            else:
                days_active = list(range(d, window))
            for ad in days_active:
                active_sets[ad].add(uid)
            uid += 1
    return active_sets, first_day


def _run_with_rate(config: SimulationConfig, starting_rate: float) -> PreviewResult:
    """Core rate-driven engine. Total users emerges naturally from starting_rate."""
    scale = config.resolved_scale()
    window = scale.window_days

    state = SimulationState(
        random_seed=config.random_seed or 0,
        total_users=0,  # unused in rate-driven path
        window_days=window,
        now=datetime.now(UTC),
    )
    state.anomalies = list(config.anomalies)
    # consumed by GrowthAxis.apply() via state.growth_config
    state.growth_config = dict(config.growth_config) if config.growth_config else None

    axis_reg = default_axis_registry()
    for name, value in config.axes.items():
        try:
            axis = axis_reg.get(name)
        except KeyError:
            continue
        axis.apply(value, state)

    parsed_anomalies = parse_anomalies(state.anomalies, state.now, window)

    # Anchor day_0 to the earliest ISO-dated anomaly when available so that
    # monthly seasonality multipliers apply to the correct historical months.
    _iso_starts = [
        a["start"]
        for a in (config.anomalies or [])
        if isinstance(a.get("start"), str)
        and len(a["start"]) == 10
        and a["start"][4] == "-"
    ]
    if _iso_starts:
        from datetime import date as _date

        _earliest = min(_date.fromisoformat(s) for s in _iso_starts)
        day_0 = datetime(_earliest.year, _earliest.month, _earliest.day, tzinfo=UTC)
    else:
        day_0 = state.now - timedelta(days=window)

    shape = state.arrival_curve or (lambda d: 1.0)
    seed = config.random_seed or 0
    rng_jitter = random.Random(seed + 0)  # jitter draws (phase 0)
    # rng1 uses seed+1 for pass-1 Poisson draws + cohort simulation
    dow_weights = (
        state.dow_weights
        if state.dow_weights is not None
        else get_dow_weights("generic")
    )
    cal_fn = state.calendar_multiplier  # None → cal_mult = 1.0

    sigma = state.jitter_sigma
    K = state.virality_weight

    # ── G(t) = λ₀ × shape(t) ─────────────────────────────────────────────────
    # λ₀ = starting_rate = arrival rate on day 0. shape(0) = 1 by construction
    # for all shape types, so G(0) = λ₀ exactly as the formula panel shows.
    g_curve: list[float] = []
    s_curve: list[float] = []
    a_curve: list[float] = []
    for d in range(window):
        local_date = (day_0 + timedelta(days=d)).date()
        dow_mult = dow_weights[local_date.weekday()]
        cal_mult = cal_fn(local_date) if cal_fn is not None else 1.0
        ano_mult = arrivals_multiplier(parsed_anomalies, local_date)
        g = starting_rate * shape(d)
        g_curve.append(g)
        s_curve.append(g * dow_mult * cal_mult)  # seasonality layer (before anomalies)
        a_curve.append(g * dow_mult * cal_mult * ano_mult)

    # ── J(t) = A(t) · (1 + σZ) ───────────────────────────────────────────────
    j_curve: list[float] = [
        max(0.0, a * (1.0 + sigma * rng_jitter.gauss(0.0, 1.0))) for a in a_curve
    ]

    # Cap for cohort simulation performance only (never affects displayed values).
    expected_total = max(sum(j_curve), 1.0)
    cohort_cap = min(1.0, _PREVIEW_USER_CAP / expected_total)
    report_scale = 1.0 / cohort_cap

    # ── Pass 1: preliminary capped arrivals → preliminary DAU (for virality) ──
    rng1 = random.Random(seed + 1)
    n0_capped = [round(j * cohort_cap) for j in j_curve]
    active_sets0, _ = _simulate_cohorts(n0_capped, state, rng1)
    dau0_capped = [len(s) for s in active_sets0]

    # ── V(t) = J(t) + K · DAU(t-1) / E[J] · G(t)  (full scale) ─────────────
    v_curve: list[float] = []
    for d in range(window):
        dau_prev = dau0_capped[d - 1] * report_scale if d > 0 else 0.0
        viral = K * (dau_prev / max(expected_total, 1)) * g_curve[d]
        v_curve.append(max(0.0, j_curve[d] + viral))

    # ── N(t) ~ Poisson(V(t))  (full scale, as the formula says) ─────────────
    rng_pass2 = random.Random(seed + 2)
    new_users = [_poisson(rng_pass2, v) for v in v_curve]

    # ── Cohort simulation at capped scale for DAU/churn/reactivation ─────────
    new_users_capped = [round(n * cohort_cap) for n in new_users]
    rng_cohort = random.Random(seed + 1)
    active_sets, first_day = _simulate_cohorts(new_users_capped, state, rng_cohort)
    active_users_raw = [len(s) for s in active_sets]

    churned_raw = [0] * window
    reactivated_raw = [0] * window
    for d in range(1, window):
        churned_raw[d] = len(active_sets[d - 1] - active_sets[d])
        gap = active_sets[d] - active_sets[d - 1]
        reactivated_raw[d] = sum(1 for u in gap if first_day[u] < d)

    avg_eps = _avg_events_per_session(config)
    session_mult = state.session_freq_multiplier

    stickiness: list[float] = []
    last_active: dict[int, int] = {}
    mau_set: set[int] = set()
    for d in range(window):
        for uid in active_sets[d]:
            last_active[uid] = d
            mau_set.add(uid)
        to_evict = [uid for uid in mau_set if last_active[uid] < d - 29]
        for uid in to_evict:
            mau_set.discard(uid)
        stickiness.append(active_users_raw[d] / max(len(mau_set), 1))

    def _norm_curve(curve: list[float]) -> list[float]:
        """Scale a pipeline curve to the same y-axis as new_users for chart overlay."""
        total = sum(curve)
        if total <= 0:
            return [0.0] * len(curve)
        new_users_total = float(sum(new_users))
        return [v * (new_users_total / total) for v in curve]

    return PreviewResult(
        days=list(range(window)),
        new_users=new_users,
        active_users=[round(v * report_scale) for v in active_users_raw],
        churned=[round(v * report_scale) for v in churned_raw],
        reactivated=[round(v * report_scale) for v in reactivated_raw],
        events=[
            round(active_users_raw[d] * report_scale * session_mult * avg_eps)
            for d in range(window)
        ],
        stickiness=stickiness,
        growth_curve=_norm_curve(g_curve),
        seasonality_curve=_norm_curve(s_curve),
        anomaly_curve=_norm_curve(a_curve),
        jitter_curve=_norm_curve(j_curve),
        virality_curve=v_curve,  # V(t) already at full scale
        arrival_cap=cohort_cap,
        report_scale=report_scale,
        start_date=day_0.date().isoformat(),
    )


def _solve_starting_rate(config: SimulationConfig, target_total: int) -> float:
    """Binary search for starting_rate that produces ~target_total new users."""
    lo, hi = 0.1, float(target_total) * 10.0
    for _ in range(20):
        mid = (lo + hi) / 2.0
        result = _run_with_rate(config, mid)
        if sum(result.new_users) < target_total:
            lo = mid
        else:
            hi = mid
        if (hi - lo) / max(target_total, 1) < 1e-4:  # converged to <0.01%
            break
    return (lo + hi) / 2.0


def run_preview(config: SimulationConfig) -> PreviewResult:
    """Dispatch to rate-driven or goal-driven mode based on config."""
    scale = config.resolved_scale()
    if scale.total_users is not None:
        starting_rate = _solve_starting_rate(config, scale.total_users)
        return _run_with_rate(config, starting_rate)
    starting_rate = scale.starting_rate or 100.0
    return _run_with_rate(config, starting_rate)
