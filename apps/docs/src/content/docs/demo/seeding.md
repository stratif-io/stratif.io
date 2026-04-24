---
title: Generating Sample Data
description: Use the stratif.io seeder to generate realistic synthetic analytics events for any warehouse. Choose a preset scenario, tune axes, and seed your database in one command.
---

The stratif.io seeder generates realistic synthetic analytics events and loads them
directly into your configured warehouse. It is useful for demos, local development,
and testing analytics queries before your real data arrives.

## Quick start

```bash
uv run seed                             # default scenario (ecommerce_steady)
uv run seed --preset saas_pmf           # specific scenario
uv run seed --preset ecommerce_steady --scale tiny   # fast, ~1 000 users
uv run seed --list                      # list all scenarios
uv run seed --describe saas_pmf         # inspect resolved config
```

## Scenarios (presets)

Each preset is a named scenario: a business domain, a growth shape, a churn rate,
and a monetization model. Pick the one that most resembles the product you want
to demo.

| Preset                         | Domain      | What it looks like                             |
| ------------------------------ | ----------- | ---------------------------------------------- |
| `ecommerce_steady`             | E-commerce  | Stable store, no growth trend — **default**    |
| `ecommerce_explosive`          | E-commerce  | Viral launch, rapid user growth                |
| `retail_declining`             | Retail      | Losing market share, arrivals drop over time   |
| `casual_game_addictive`        | Casual game | Whale-heavy IAP, very high retention           |
| `casual_game_flash_in_the_pan` | Casual game | Big spike then sharp drop-off                  |
| `saas_pmf`                     | SaaS        | Steady growth, low churn, subscription revenue |
| `streaming_mature`             | Streaming   | Binge sessions, strong retention               |
| `marketplace_scaling`          | Marketplace | GMV growth, rising listings                    |
| `dating_app_churn`             | Dating app  | Quick activation, high churn                   |

## Data volume

Control how much data is generated with the `--scale` flag:

| Scale    | Users     | Days | Typical use                  |
| -------- | --------- | ---- | ---------------------------- |
| `tiny`   | 1 000     | 30   | Local dev, fast iteration    |
| `small`  | 10 000    | 90   | Default for most presets     |
| `medium` | 100 000   | 180  | Load testing, perf demos     |
| `large`  | 1 000 000 | 365  | Full-scale warehouse testing |

```bash
uv run seed --preset ecommerce_steady --scale tiny    # fast
uv run seed --preset saas_pmf --scale medium          # more data
```

## Tweaking a scenario

Every aspect of a preset can be overridden on the command line without editing
any files.

### Growth shape

How new users arrive over time:

```bash
--growth explosive    # users cluster at the end of the window
--growth declining    # arrivals dry up over time
--growth steady       # flat constant rate (default for most presets)
--growth hockey_stick # flat then exponential
--growth seasonal     # sine-wave seasonality
```

### User stickiness

How long users stay active after they sign up:

```bash
--stickiness addictive    # long-lived, fat-tail — median ~60 days
--stickiness sticky       # healthy — median ~125 days
--stickiness normal       # average — median ~62 days
--stickiness churn_heavy  # most users leave quickly — median ~14 days
--stickiness one_shot     # each user appears exactly once
```

### Session depth

How deeply users engage within a session:

```bash
--engagement_depth deep      # more researcher / converter sessions
--engagement_depth moderate  # baseline (default)
--engagement_depth shallow   # mostly bounce / browser sessions
```

### Geography

Which countries users come from:

```bash
--geography global    # US, UK, DE, FR, JP, BR, IN, AU (default)
--geography us_only
--geography eu_only
--geography apac_only
```

### Combining overrides

Flags compose freely:

```bash
# E-commerce with heavy churn — good for retention chart demos
uv run seed --preset ecommerce_steady --stickiness churn_heavy

# Viral SaaS launch on a medium dataset, pinned seed for reproducibility
uv run seed --preset saas_pmf --growth explosive --scale medium --seed 42
```

## Reproducible runs

Pass `--seed <N>` to pin the random seed. The same seed + same preset + same
axis values always produces the exact same dataset:

```bash
uv run seed --preset ecommerce_steady --seed 42
```

## Seeding a specific backend

If you have multiple warehouses configured, you can target just one:

```bash
uv run seed --only duckdb
uv run seed --only snowflake
uv run seed --only databricks
```

## Authoring a custom scenario

For use cases not covered by the built-in presets, drop a YAML file into
`seeders/presets/`:

```yaml
name: my_scenario
description: My custom scenario.
domain: saas # ecommerce | retail | saas | streaming | casual_game | …

axes:
  growth: strong
  stickiness: normal
  engagement_depth: deep
  monetization: subscription
  virality: weak
  scale: small
  geography: us_only
  anomalies: clean
```

Then run it:

```bash
uv run seed --preset my_scenario
```

To preview what the dataset will look like before seeding:

```bash
uv run python seeders/tests/visualize_preset.py my_scenario
```

This prints total event counts, the event vocabulary, and a daily-arrivals
histogram — useful for checking that the growth curve looks right.

## Seeder Studio

Seeder Studio is a browser-based editor that lets you build and preview a
scenario visually before running the seeder.

```bash
uv run serve              # backend API (port 8000)
bun run dev:studio        # studio UI at http://localhost:5180
```

The Studio lets you:

- Load any built-in preset as a starting point
- Tune all axes with dropdowns and sparkline previews
- Add dated anomalies (spikes and dips) on a timeline
- Preview estimated users, events, sessions, and conversions live
- Copy the generated YAML for use as a custom preset

The Studio never writes to disk — copy the YAML from the right-rail panel into
`seeders/presets/<name>.yaml`, then run `uv run seed --preset <name>`.
