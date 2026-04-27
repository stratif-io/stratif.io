"""Human-eyeball acceptance — print aggregate stats for a preset.

Usage:
    uv run python seeders/tests/visualize_preset.py retail_declining
    uv run python seeders/tests/visualize_preset.py ecommerce_explosive --total-users 2000 --window-days 90
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime

from services.event_simulator.seeder import BaseSeeder, SeedConfig
from services.event_simulator.simulator import Engine, list_presets, load_preset
from services.event_simulator.simulator.config import ScaleOverride


class _StubSeeder(BaseSeeder):
    def seed(self):
        return {}

    def _create_events_table(self):
        pass

    def _insert_events(self, events):
        pass


def summarize(preset_name: str, total_users: int, window_days: int, seed: int) -> None:
    cfg = load_preset(preset_name)
    cfg = cfg.model_copy(
        update={
            "scale_config": ScaleOverride(
                total_users=total_users, window_days=window_days
            ),
            "random_seed": seed,
        }
    )
    seeder = _StubSeeder(config=SeedConfig())
    batches = list(Engine(cfg, seeder).run())

    all_events = [ev for b in batches for ev in b]
    print(f"Preset: {preset_name}")
    print(f"  Total events: {len(all_events):,}")
    unique_users = len({ev[0] for ev in all_events})
    print(f"  Unique users: {unique_users:,}")
    print()
    print("  Event vocabulary:")
    for name, count in Counter(ev[1] for ev in all_events).most_common():
        print(f"    {name:<30} {count:>6}")
    print()

    print("  Daily arrivals (new users per day):")
    first_seen: dict[str, datetime] = {}
    for ev in all_events:
        uid, _name, ts, *_ = ev
        if uid not in first_seen or ts < first_seen[uid]:
            first_seen[uid] = ts
    by_day: Counter[str] = Counter()
    for ts in first_seen.values():
        by_day[ts.strftime("%Y-%m-%d")] += 1
    for day, count in sorted(by_day.items()):
        bar = "#" * min(count, 40)
        print(f"    {day}  {bar} ({count})")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="visualize_preset",
        description="Print aggregate stats for a preset.",
    )
    parser.add_argument("preset", nargs="?", help="Preset name (see --list)")
    parser.add_argument("--total-users", type=int, default=1000)
    parser.add_argument("--window-days", type=int, default=30)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--list", action="store_true", help="List preset names and exit"
    )
    args = parser.parse_args(argv)

    if args.list:
        for name in list_presets():
            print(name)
        return 0

    if not args.preset:
        parser.error("preset name is required (or use --list)")

    summarize(args.preset, args.total_users, args.window_days, args.seed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
