"""Seeder CLI.

Usage:
    uv run seed                              # default preset or SEED_PRESET
    uv run seed --preset casual_game_addictive
    uv run seed --preset retail_declining --growth flat --scale tiny
    uv run seed --list                       # print available presets
    uv run seed --describe retail_declining  # print resolved config
    uv run seed --seed 42                    # reproducible run

Phase 1: running without --list/--describe invokes the existing seeder
bootstrap (bootstrap_all_connections) via SQLite by default.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence

from seeders.simulator.preset import (
    PresetNotFoundError,
    list_presets,
    resolve_config,
)

_AXIS_NAMES: tuple[str, ...] = (
    "growth",
    "stickiness",
    "engagement_depth",
    "monetization",
    "virality",
    "scale",
    "geography",
    "anomalies",
)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="seed", description="stratif.io parametrized seeder"
    )
    # --preset and --describe both pick which preset to load; forbid passing
    # both to avoid the footgun where --preset is silently ignored.
    preset_group = p.add_mutually_exclusive_group()
    preset_group.add_argument(
        "--preset", type=str, default=None, help="Named preset or path"
    )
    preset_group.add_argument(
        "--describe", type=str, default=None, help="Print resolved config"
    )
    p.add_argument("--list", action="store_true", help="List available presets")
    p.add_argument(
        "--seed", type=int, default=None, help="Random seed (reproducibility)"
    )
    p.add_argument(
        "--only",
        type=str,
        default=None,
        help="Seed only this backend (e.g. duckdb, sqlite, postgresql, clickhouse, snowflake, databricks)",
    )

    # Axis overrides — one flag per axis name. Only the values provided are applied.
    for axis in _AXIS_NAMES:
        p.add_argument(
            f"--{axis}", type=str, default=None, help=f"Override axis {axis!r}"
        )

    return p


def _axis_overrides_from_args(args: argparse.Namespace) -> dict:
    return {
        name: value
        for name in _AXIS_NAMES
        if (value := getattr(args, name)) is not None
    }


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.list:
        for name in list_presets():
            print(name)
        return 0

    try:
        cfg = resolve_config(
            preset_name=args.describe or args.preset,
            axis_overrides=_axis_overrides_from_args(args),
        )
    except PresetNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.seed is not None:
        cfg = cfg.model_copy(update={"random_seed": args.seed})

    if args.describe:
        print(json.dumps(cfg.model_dump(mode="json"), indent=2, default=str))
        return 0

    # Full run: delegate to the bootstrap function directly (bypassing its own
    # argparse entry point, which would reject our CLI flags). We still export
    # env vars for any downstream consumer that reads them.
    import os

    from seeders.bootstrap_all_connections import bootstrap

    scale = cfg.resolved_scale()
    os.environ["SEED_USERS"] = str(scale.total_users)
    os.environ["SEED_DAYS"] = str(scale.window_days)
    os.environ["SEED_PRESET"] = cfg.name
    if cfg.random_seed is not None:
        os.environ["SEED_RANDOM_SEED"] = str(cfg.random_seed)

    bootstrap(only=args.only)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
