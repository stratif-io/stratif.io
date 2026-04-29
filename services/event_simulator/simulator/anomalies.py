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
    end: date
    effects: dict[str, float]


def _parse_event(raw: dict, now: datetime, window_days: int) -> tuple[date, date]:
    """Return (start_date, end_date) for an event dict.

    New format: start_date + end_date (ISO dates).
    Legacy format (still accepted): start/date + duration strings.
    """
    if "start_date" in raw and "end_date" in raw:
        return date.fromisoformat(raw["start_date"]), date.fromisoformat(
            raw["end_date"]
        )

    # Legacy: resolve start date
    if "date" in raw:
        start = date.fromisoformat(raw["date"])
    elif "start" in raw:
        s = raw["start"]
        if isinstance(s, str) and s.lstrip("-").endswith("d"):
            days = int(s.rstrip("d"))
            if days < 0:
                start = (now + timedelta(days=days)).date()
            else:
                day_0 = now - timedelta(days=window_days)
                start = (day_0 + timedelta(days=days)).date()
        else:
            start = date.fromisoformat(s)
    else:
        raise ValueError(f"anomaly missing start_date/start/date: {raw!r}")

    # Legacy: resolve duration
    dur_str = raw.get("duration")
    if dur_str is None:
        duration_days = 1.0
    else:
        m = _DURATION_RE.match(dur_str)
        if not m:
            raise ValueError(f"unparseable duration {dur_str!r}")
        q = float(m.group(1))
        duration_days = q if m.group(2) == "d" else q / 24.0

    end = start + timedelta(days=duration_days)
    return start, end


def parse_anomalies(
    raw_list: list[dict],
    now: datetime,
    window_days: int = 90,
) -> list[AnomalyRecord]:
    records = []
    for raw in raw_list:
        start, end = _parse_event(raw, now, window_days)
        records.append(
            AnomalyRecord(
                type=raw["type"],
                name=raw.get("name"),
                start=start,
                end=end,
                effects=dict(raw.get("effect", {})),
            )
        )
    return records


def arrivals_multiplier(
    anomalies: list[AnomalyRecord],
    d: date,
) -> float:
    mult = 1.0
    for rec in anomalies:
        if rec.start <= d <= rec.end:
            a = rec.effects.get("arrivals")
            if a is not None:
                mult *= a
    return mult
