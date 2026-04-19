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

## Axis reference (Phase 2a)

Two axes are implemented today; all others are declared in presets but silently ignored until later phases.

### `growth` — shape of new-user arrivals

| Value             | Behavior                                                                |
| ----------------- | ----------------------------------------------------------------------- |
| `explosive`       | Exponential (r=0.08/day) — new users cluster at the end of the window   |
| `strong`          | Exponential (r=0.02/day) — steady strong growth                         |
| `steady` / `flat` | Constant daily rate                                                     |
| `declining`       | Exponential decline (r=0.015/day) — cohort peaks early, arrivals dry up |
| `seasonal`        | Sine wave (30% amplitude, 365-day period) with no net growth            |
| `hockey_stick`    | Flat for the first 40% of the window, exponential thereafter            |

### `stickiness` — user lifetime distribution

| Value         | Distribution              | Median lifetime           |
| ------------- | ------------------------- | ------------------------- |
| `addictive`   | Weibull(k=0.5, λ=120)     | ~60 d with heavy fat tail |
| `sticky`      | Weibull(k=1.0, λ=180)     | ~125 d                    |
| `normal`      | Exponential(mean=90)      | ~62 d                     |
| `churn_heavy` | Exponential(mean=20)      | ~14 d                     |
| `one_shot`    | Degenerate (lifetime = 0) | 0 d                       |

### Try it

```bash
uv run seed --preset ecommerce_steady --growth declining --stickiness churn_heavy
uv run seed --preset ecommerce_steady --growth explosive --stickiness sticky
```

Both produce ecommerce events with the same vocabulary but qualitatively different cohort and retention shapes.

## Status

**Phase 2a shipped.** Cohort-based engine + `growth` and `stickiness` axes + `ecommerce` domain pack.

Coming in later phases:

- Phase 2b — remaining axes (`engagement_depth`, `monetization`, `virality`, `geography`, `anomalies`)
- Phase 3 — realism layer (hour/dow/holiday calendars, Zipf popularity, log-normal timing, TZ-aware sessions)
- Phase 4 — 9 more domain packs (retail, casual_game, saas, streaming, ...)
- Phase 5 — anomalies + per-preset anomaly blocks
- Phase 6 — per-preset acceptance assertions + visual plots
