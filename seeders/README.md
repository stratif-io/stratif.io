# Seeders

Parametrized seeder for the stratif.io analytics warehouse. Picks a preset
(e.g. `ecommerce_steady`, `casual_game_addictive`) and produces a realistic
events dataset for the configured connections.

## Quickstart

```bash
uv run seed                             # default preset (ecommerce_steady)
uv run seed --preset ecommerce_steady   # explicit
uv run seed --list                      # list presets
uv run seed --describe <preset>         # show resolved config (JSON)
uv run seed --seed 42                   # reproducible run
```

## Axis overrides

```bash
uv run seed --preset ecommerce_steady --scale tiny --growth flat
```

Or via env vars:

```bash
SEED_PRESET=ecommerce_steady SEED_OVERRIDE_SCALE=tiny uv run seed
```

Legacy env vars `SEED_USERS` and `SEED_DAYS` still work as overrides on the
`scale` axis's `total_users` / `window_days`.

## Authoring a custom preset

Drop a YAML into `seeders/presets/`. See `seeders/presets/ecommerce_steady.yaml`.

## Status

Phase 1 (infrastructure) shipped. Phases 2-6 (axes, realism, domain packs,
anomalies, acceptance) layer behavior on this foundation; until then every
preset resolves to the `ecommerce_steady` event distribution.
