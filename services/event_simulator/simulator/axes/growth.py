from __future__ import annotations

import math
from collections.abc import Callable
from typing import Any

from services.event_simulator.simulator.protocols import SimulationState

ShapeMultiplier = Callable[[int], float]


# ---------------------------------------------------------------------------
# Rate resolution helpers
# ---------------------------------------------------------------------------


def _daily_rate(
    cfg: dict[str, Any],
    window: int,
    *,
    default_total_log: float,
) -> float:
    """Resolve the daily exponential rate from growth_config.

    Priority (highest → lowest):
    1. ``annual_rate``: YoY multiplier, e.g. 1.5 → 50 % growth per year.
       Converted to per-day: ln(annual_rate) / 365.
    2. ``rate``: explicit per-day rate (legacy, backward-compatible).
    3. Window-normalised default: ``default_total_log / window``.
       This means the shape ratio from day 0 → day N is always exp(default_total_log)
       regardless of how long the window is, preventing exponential blow-up on
       multi-year simulations.
    """
    if "annual_rate" in cfg:
        yoy = float(cfg["annual_rate"])
        return math.log(max(yoy, 1e-9)) / 365.0
    if "rate" in cfg:
        return float(cfg["rate"])
    # Window-normalised default
    return default_total_log / max(window, 1)


# ---------------------------------------------------------------------------
# Shape constructors
# ---------------------------------------------------------------------------


def _exponential_growth_shape(r: float) -> ShapeMultiplier:
    return lambda d: math.exp(r * d)


def _exponential_decline_shape(r: float) -> ShapeMultiplier:
    return lambda d: math.exp(-r * d)


def _steady_shape(r: float = 0.01) -> ShapeMultiplier:
    """Linear growth: shape(d) = 1 + r*d."""
    return lambda d: max(1.0 + r * d, 1e-9)


def _hockey_stick_shape(
    r: float,
    split_fraction: float,
    window: int,
) -> ShapeMultiplier:
    split = max(1, int(window * split_fraction))

    def shape(d: int) -> float:
        if d < split:
            return 1.0
        return math.exp(r * (d - split))

    return shape


def _s_curve_shape(
    window: int,
    mid_fraction: float = 0.40,
    sigma_fraction: float = 0.30,
    total_log: float = 3.0,
) -> ShapeMultiplier:
    """Gaussian bell-curve acquisition pattern: rises to a peak, then declines.

    Models apps that grow rapidly to a peak acquisition rate, then mature/plateau.
    ``shape(d) = 1 + (peak_mult - 1) * exp(-0.5 * ((d - d_peak) / sigma)²)``

    - Always ≥ 1 (there's always some baseline acquisition)
    - Peaks at d = window * mid_fraction
    - σ = window * sigma_fraction controls the width of the peak
    - peak_mult = exp(total_log) sets the peak/baseline ratio

    Unlike a monotonic logistic, this correctly models the early-growth ↗ then
    plateau/maturity ↘ pattern seen in consumer apps (Tinder, Uber, etc.).
    """
    d_peak = window * mid_fraction
    sigma = max(window * sigma_fraction, 1.0)
    peak_mult = math.exp(total_log)

    def shape(d: int) -> float:
        return 1.0 + (peak_mult - 1.0) * math.exp(-0.5 * ((d - d_peak) / sigma) ** 2)

    return shape


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_VALUE_NAMES = (
    "explosive",
    "strong",
    "steady",
    "flat",
    "declining",
    "hockey_stick",
    "seasonal",
    "s_curve",
)

# Window-normalised total log growth: exp(total_log) = shape ratio day-0 → day-N.
# Designed so that on a 90-day window the implied per-day rates are close to the
# old hardcoded values (explosive≈0.044, strong≈0.022, steady≈0.011),
# while on a 5000-day window they remain sensible (≈0.0008, 0.0004, 0.0002).
_DEFAULT_TOTAL_LOG = {
    "explosive": 4.0,  # ~55× over the window
    "strong": 2.0,  # ~7× over the window
    "steady": 1.0,  # ~2.7× over the window
    "declining": 1.0,  # declines to ~0.37× (sign flipped in _build_shape)
    "hockey_stick": 3.0,  # post-inflection growth factor
    "seasonal": 2.0,  # sinusoidal variant, same base growth
}


def _build_shape(
    value: str, growth_config: dict[str, Any] | None, window: int
) -> ShapeMultiplier:
    cfg = growth_config or {}

    if value == "explosive":
        r = _daily_rate(cfg, window, default_total_log=_DEFAULT_TOTAL_LOG["explosive"])
        return _exponential_growth_shape(r)

    if value == "strong":
        r = _daily_rate(cfg, window, default_total_log=_DEFAULT_TOTAL_LOG["strong"])
        return _exponential_growth_shape(r)

    if value == "flat":
        return _steady_shape(r=0.0)

    if value == "steady":
        # steady uses linear to avoid exponential; normalise total linear rise to 2.7× by default
        if "annual_rate" in cfg:
            r = _daily_rate(cfg, window, default_total_log=1.0)
        elif "rate" in cfg:
            r = float(cfg["rate"])
        else:
            r = _DEFAULT_TOTAL_LOG["steady"] / max(window, 1)
        return _steady_shape(r)

    if value == "declining":
        r = _daily_rate(cfg, window, default_total_log=_DEFAULT_TOTAL_LOG["declining"])
        return _exponential_decline_shape(r)

    if value == "hockey_stick":
        split_fraction = float(cfg.get("split_fraction", 0.35))
        post_window = window * (1 - split_fraction)
        r = _daily_rate(
            cfg,
            int(max(post_window, 1)),
            default_total_log=_DEFAULT_TOTAL_LOG["hockey_stick"],
        )
        return _hockey_stick_shape(
            r=r,
            split_fraction=split_fraction,
            window=window,
        )

    if value in ("seasonal", "s_curve"):
        mid = float(cfg.get("s_mid", 0.40))
        sigma = float(cfg.get("s_sigma", 0.30))
        total_log = float(cfg.get("total_log", 3.0))
        return _s_curve_shape(
            window, mid_fraction=mid, sigma_fraction=sigma, total_log=total_log
        )

    raise ValueError(f"unknown growth value {value!r}; valid: {_VALUE_NAMES}")


class GrowthAxis:
    name: str = "growth"
    values: dict[str, Any] = dict.fromkeys(_VALUE_NAMES)

    def apply(self, value: str, simulation: SimulationState) -> None:
        simulation.arrival_curve = _build_shape(
            value,
            simulation.growth_config,
            simulation.window_days,
        )
