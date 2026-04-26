"""Anomaly parser + applicator.

Parses anomaly dicts from preset YAMLs into typed records, then composes
per-date arrivals multipliers. Non-arrivals effects (conversion,
funnel_drop_off, etc.) are parsed but not yet applied — Phase 5 wires only
the arrivals multiplier into the Engine.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta

_DURATION_RE = re.compile(r"^(\d+(?:\.\d+)?)([dh])$")


@dataclass(frozen=True)
class AnomalyRecord:
    type: str
    name: str | None
    start: date
    duration_days: float
    effects: dict[str, float]


def _parse_duration(value: str | None) -> float:
    if value is None:
        return 1.0
    match = _DURATION_RE.match(value)
    if not match:
        raise ValueError(f"unparseable duration {value!r}")
    quantity = float(match.group(1))
    unit = match.group(2)
    if unit == "d":
        return quantity
    return quantity / 24.0


def _parse_start(raw: dict, now: datetime, window_days: int) -> date:
    if "date" in raw:
        return date.fromisoformat(raw["date"])
    if "start" in raw:
        start = raw["start"]
        if isinstance(start, str) and start.lstrip("-").endswith("d"):
            days = int(start.rstrip("d"))
            if days < 0:
                # negative: relative to now (e.g. "-60d" = 60 days ago)
                return (now + timedelta(days=days)).date()
            else:
                # positive: day N from window start (e.g. "71d" = day 71)
                day_0 = now - timedelta(days=window_days)
                return (day_0 + timedelta(days=days)).date()
        if isinstance(start, str):
            return date.fromisoformat(start)
    raise ValueError(f"anomaly missing date/start: {raw!r}")


def parse_anomalies(
    raw_list: list[dict],
    now: datetime,
    window_days: int = 90,
) -> list[AnomalyRecord]:
    return [
        AnomalyRecord(
            type=raw["type"],
            name=raw.get("name"),
            start=_parse_start(raw, now, window_days),
            duration_days=_parse_duration(raw.get("duration")),
            effects=dict(raw.get("effect", {})),
        )
        for raw in raw_list
    ]


def arrivals_multiplier(
    anomalies: list[AnomalyRecord],
    d: date,
) -> float:
    mult = 1.0
    for rec in anomalies:
        end = rec.start + timedelta(days=rec.duration_days)
        if rec.start <= d <= end:
            a = rec.effects.get("arrivals")
            if a is not None:
                mult *= a
    return mult
