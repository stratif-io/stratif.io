"""Generate reference KPI aggregates from the Python simulator for contract tests.

Outputs one JSON per shipped preset into ``fixtures/``. Each file contains
``events``, ``active_users``, ``new_users``, ``stickiness`` arrays, plus the
original preset's axes + overrides so the Node contract test can reproduce
the same config when it calls the TS twin.

Events are tuples: (user_id, event_name, timestamp_datetime, ...)
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from services.event_simulator.seeder import BaseSeeder, SeedConfig
from services.event_simulator.simulator import Engine
from services.event_simulator.simulator.config import ScaleOverride
from services.event_simulator.simulator.preset import list_presets, load_preset

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
REFERENCE_USERS = 2000
REFERENCE_DAYS = 60


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def _day_ordinal(ts: datetime) -> int:
    if hasattr(ts, "toordinal"):
        return ts.toordinal()
    if hasattr(ts, "date"):
        return ts.date().toordinal()
    return 0


def aggregate(batches) -> dict[str, list[float]]:
    """Aggregate raw event tuple batches into daily KPI arrays.

    Each event tuple is: (user_id, event_name, timestamp, ...)
    """
    daily_events: dict[int, int] = defaultdict(int)
    daily_new: dict[int, int] = defaultdict(int)
    daily_active: dict[int, set[str]] = defaultdict(set)
    first_seen: dict[str, int] = {}

    for batch in batches:
        for ev in batch:
            user_id, _event_name, ts, *_ = ev
            day = _day_ordinal(ts)
            daily_events[day] += 1
            daily_active[day].add(user_id)
            if user_id not in first_seen:
                first_seen[user_id] = day
                daily_new[day] += 1

    all_days = set(daily_events) | set(daily_new) | set(daily_active)
    if not all_days:
        return {"events": [], "active_users": [], "new_users": [], "stickiness": []}

    start, end = min(all_days), max(all_days)
    events = [daily_events.get(d, 0) for d in range(start, end + 1)]
    active = [len(daily_active.get(d, set())) for d in range(start, end + 1)]
    new_users = [daily_new.get(d, 0) for d in range(start, end + 1)]

    stickiness: list[float] = []
    for t in range(len(active)):
        lo = max(0, t - 27)
        window_users: set[str] = set()
        for d in range(start + lo, start + t + 1):
            window_users.update(daily_active.get(d, set()))
        mau = max(1, len(window_users))
        stickiness.append(active[t] / mau)

    return {
        "events": events,
        "active_users": active,
        "new_users": new_users,
        "stickiness": stickiness,
    }


def main() -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    seeder = _StubSeeder(config=SeedConfig())

    for name in list_presets():
        cfg = load_preset(name)
        override = ScaleOverride(
            total_users=REFERENCE_USERS,
            window_days=REFERENCE_DAYS,
        )
        cfg = cfg.model_copy(update={"scale_config": override, "random_seed": 42})

        batches = Engine(cfg, seeder).run()
        agg = aggregate(batches)

        payload = {
            "name": cfg.name,
            "axes": cfg.axes,
            "scale_config": cfg.scale_config.model_dump(exclude_none=True)
            if cfg.scale_config
            else None,
            "growth_config": cfg.growth_config,
            "anomalies": cfg.anomalies,
            "kpi": agg,
            "reference_users": REFERENCE_USERS,
            "reference_days": REFERENCE_DAYS,
        }
        out = FIXTURE_DIR / f"{cfg.name}.json"
        out.write_text(json.dumps(payload, indent=2, default=str))
        print(f"wrote fixtures/{cfg.name}.json ({len(agg['events'])} days)")


if __name__ == "__main__":
    main()
