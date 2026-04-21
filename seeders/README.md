# Seeders

Parametrized seeder for the stratif.io analytics warehouse. Picks a preset
(e.g. `ecommerce_steady`, `casual_game_addictive`) and produces a realistic
events dataset for the configured connections.

---

## Quick-start

```bash
uv run seed                             # default preset (ecommerce_steady)
uv run seed --preset saas_pmf           # specific preset
uv run seed --list                      # list all available presets
uv run seed --describe saas_pmf         # print resolved config as JSON
uv run seed --seed 42                   # reproducible run
```

Override one or more axes inline:

```bash
uv run seed --preset ecommerce_steady --scale tiny --growth declining
```

Seed only one backend when you have multiple connections configured:

```bash
uv run seed --only duckdb
uv run seed --only databricks
```

---

## Options reference

### CLI flags

| Flag                         | Type   | Description                                                                                                                |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `--preset <name\|path>`      | string | Named preset from `seeders/presets/` or a path to a YAML file. Defaults to `SEED_PRESET` env var, then `ecommerce_steady`. |
| `--describe <name>`          | string | Print the fully-resolved config JSON and exit (mutually exclusive with `--preset`).                                        |
| `--list`                     | flag   | List available preset names and exit.                                                                                      |
| `--seed <N>`                 | int    | Pin the random seed for reproducible output.                                                                               |
| `--only <backend>`           | string | Seed only one connection backend (`duckdb`, `sqlite`, `postgresql`, `clickhouse`, `snowflake`, `databricks`).              |
| `--growth <value>`           | string | Override the `growth` axis.                                                                                                |
| `--stickiness <value>`       | string | Override the `stickiness` axis.                                                                                            |
| `--engagement_depth <value>` | string | Override the `engagement_depth` axis.                                                                                      |
| `--monetization <value>`     | string | Override the `monetization` axis.                                                                                          |
| `--virality <value>`         | string | Override the `virality` axis.                                                                                              |
| `--scale <value>`            | string | Override the `scale` axis (`tiny` / `small` / `medium` / `large`).                                                         |
| `--geography <value>`        | string | Override the `geography` axis.                                                                                             |
| `--anomalies <value>`        | string | Override the `anomalies` axis.                                                                                             |

### Environment variables

| Variable                    | Description                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SEED_PRESET`               | Default preset name when `--preset` is not passed.                                                          |
| `SEED_USERS`                | Override `total_users` from the scale tier (legacy; prefer `--scale`).                                      |
| `SEED_DAYS`                 | Override `window_days` from the scale tier (legacy; prefer `--scale`).                                      |
| `SEED_OVERRIDE_<AXIS>`      | Override any axis by name, e.g. `SEED_OVERRIDE_GROWTH=declining`. Equivalent to the corresponding CLI flag. |
| `STRATIFIO_SEED_TABLE_NAME` | Override the destination events table name. Set automatically by the CLI; rarely needed manually.           |

### Precedence order

Later entries win:

1. Preset YAML (`axes:` block + `scale_config:` block)
2. `SEED_USERS` / `SEED_DAYS` env vars (scale only)
3. `SEED_OVERRIDE_*` env vars
4. CLI flags (`--growth`, `--scale`, etc.)
5. `--seed` flag (random seed only)

---

## Presets

Presets are YAML files in `seeders/presets/`. Each one is a self-contained
simulation scenario: a domain, a full set of axis values, and optionally
anomalies.

### Preset catalog

| Preset                         | Domain      | Character                                      |
| ------------------------------ | ----------- | ---------------------------------------------- |
| `ecommerce_steady`             | ecommerce   | Stable site, no growth trend — **default**     |
| `ecommerce_explosive`          | ecommerce   | Viral launch, rapid growth                     |
| `retail_declining`             | retail      | Losing market share, declining arrivals        |
| `casual_game_addictive`        | casual_game | Whale-heavy IAP, high stickiness               |
| `casual_game_flash_in_the_pan` | casual_game | Spike then drop-off                            |
| `saas_pmf`                     | saas        | Steady growth, low churn, subscription revenue |
| `streaming_mature`             | streaming   | Binge sessions, high retention                 |
| `marketplace_scaling`          | marketplace | GMV growth, rising listings                    |
| `dating_app_churn`             | dating      | Quick activation, high churn                   |

### Preset YAML schema

```yaml
name: my_preset # required; used as table name prefix
description: | # optional; shown in --describe output
  Free-form text.

domain: ecommerce # required; see Domain catalog below

axes:
  growth: steady # required; one value per axis
  stickiness: normal
  engagement_depth: moderate
  monetization: one_off_purchase
  virality: weak
  scale: small # tiny | small | medium | large
  geography: global
  anomalies: clean

# Optional: pin exact user/day counts, overriding the named scale tier
scale_config:
  total_users: 5000 # omit to use the tier's default
  window_days: 60 # omit to use the tier's default

# Optional: fine-grained growth curve parameters
growth_config:
  rate: 0.04 # used by exponential_growth / exponential_decline shapes

# Optional: dated spikes/dips — only active when anomalies axis ≠ clean
anomalies:
  - type: marketing_campaign
    name: viral_launch
    start: -45d # relative to seed run time; or "YYYY-MM-DD"
    duration: 14d
    effect:
      arrivals: 2.5 # arrivals multiplier during the window
```

---

## Axes reference

### `scale` — data volume

| Value    | Users     | Days |
| -------- | --------- | ---- |
| `tiny`   | 1 000     | 30   |
| `small`  | 10 000    | 90   |
| `medium` | 100 000   | 180  |
| `large`  | 1 000 000 | 365  |

Use `scale_config` in the YAML (or `SEED_USERS` / `SEED_DAYS`) to set exact
values that don't map to a named tier.

### `growth` — shape of new-user arrivals

| Value             | Behavior                                                          |
| ----------------- | ----------------------------------------------------------------- |
| `explosive`       | Exponential (r=0.08/day) — users cluster at the end of the window |
| `strong`          | Exponential (r=0.02/day) — steady strong growth                   |
| `steady` / `flat` | Constant daily rate                                               |
| `declining`       | Exponential decline (r=0.015/day) — arrivals dry up over time     |
| `seasonal`        | Sine wave (30% amplitude, 365-day period), no net growth          |
| `hockey_stick`    | Flat for first 40% of window, exponential thereafter              |

### `stickiness` — user lifetime distribution

| Value         | Distribution            | Median lifetime           |
| ------------- | ----------------------- | ------------------------- |
| `addictive`   | Weibull(k=0.5, λ=120)   | ~60 d, heavy fat tail     |
| `sticky`      | Weibull(k=1.0, λ=180)   | ~125 d                    |
| `normal`      | Exponential(mean=90)    | ~62 d                     |
| `churn_heavy` | Exponential(mean=20)    | ~14 d                     |
| `one_shot`    | Degenerate (lifetime=0) | 0 d — single session only |

### `engagement_depth` — per-session depth

| Value      | Effect                                                        |
| ---------- | ------------------------------------------------------------- |
| `shallow`  | Sessions skew toward bounce / browser (less conversion)       |
| `moderate` | Baseline — no modifier                                        |
| `deep`     | Sessions skew toward researcher / converter (more conversion) |

### `geography` — country distribution

| Value       | Countries                      |
| ----------- | ------------------------------ |
| `global`    | US, UK, DE, FR, JP, BR, IN, AU |
| `us_only`   | US only                        |
| `eu_only`   | UK, DE, FR                     |
| `apac_only` | JP, IN, AU                     |

### `monetization` — revenue model

| Value              | Supported domains                               |
| ------------------ | ----------------------------------------------- |
| `one_off_purchase` | ecommerce, retail, marketplace                  |
| `subscription`     | saas, streaming, dating                         |
| `iap_whales`       | casual_game, gaming_hardcore                    |
| `ad_supported`     | social, casual_game, gaming_hardcore, streaming |
| `freemium`         | saas                                            |
| `marketplace_fee`  | marketplace                                     |

If a preset requests a value the domain doesn't support, the engine logs at
INFO and coerces to the domain's first supported mode.

### `virality` — referral weight

| Value          | Weight | Behavior             |
| -------------- | ------ | -------------------- |
| `none`         | 0.0    | No referral events   |
| `weak`         | 0.3    | Occasional referrals |
| `strong_viral` | 1.0    | Heavy referrals      |

### `anomalies` — whether the anomalies list is applied

| Value                                         | Behavior                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `clean`                                       | Ignore the preset's `anomalies:` list                                        |
| `explicit`                                    | Apply the preset's `anomalies:` list as-is                                   |
| `full` / `campaigns` / `outages` / `ab_tests` | Apply preset list (same as `explicit` today; category filtering lands later) |

---

## Domain catalog

Each domain defines its event vocabulary, session archetypes, and which
monetization modes it supports.

| Domain            | Sample events                                                                    | Monetization                       |
| ----------------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| `ecommerce`       | ProductView, AddToCart, CheckoutStarted, Purchase, SearchQuery                   | one_off_purchase                   |
| `retail`          | ecommerce events + StoreLocator, InStorePickup, LoyaltyRedemption                | one_off_purchase                   |
| `casual_game`     | LevelStart/Complete/Fail, IAPOffer/Purchase, AdShown/Clicked, DailyBonus         | iap_whales, ad_supported, freemium |
| `gaming_hardcore` | casual_game events + Matchmaking, MatchStart/End, ClanJoin, Chat                 | iap_whales, ad_supported           |
| `saas`            | SignUp, EmailVerified, Onboarded, ProjectCreated, ItemCreated, Invite, Upgrade   | subscription, freemium             |
| `streaming`       | Browse, TitlePageView, PlayStarted/Paused/Completed, Rated, AddedToList          | subscription, ad_supported         |
| `social`          | FeedLoaded, PostViewed/Liked/Shared, CommentPosted, FollowAdded, MessageSent     | ad_supported                       |
| `marketplace`     | ListingView/Created/Sold, MessageToSeller, Offer, Purchase                       | marketplace_fee                    |
| `dating`          | ProfileView, Swipe, Match, MessageSent/Read, DateScheduled, SubscriptionUpgraded | subscription                       |
| `fintech`         | AccountOpened, Deposit/Withdrawal, Transfer, CardPurchase, BalanceChecked        | one_off_purchase                   |

---

## Anomalies

Presets can declare dated spikes or dips that modulate arrival rates.

```yaml
anomalies:
  - type: marketing_campaign # see types below
    name: viral_launch
    start: -45d # relative to seed run time ("YYYY-MM-DD" also works)
    duration: 14d # "<N>d" for days, "<N>h" for hours
    effect:
      arrivals: 2.5 # multiplier — 2.5 = 2.5× arrivals during window
```

Supported types and their recognized effects:

| Type                 | Effects                          |
| -------------------- | -------------------------------- |
| `marketing_campaign` | `arrivals`, `conversion`         |
| `outage`             | `all_events`, `arrivals`         |
| `ab_test`            | `funnel_drop_off`, `conversion`  |
| `shopping_season`    | `arrivals`, `avg_order_value`    |
| `product_launch`     | `arrivals`, `feature_events`     |
| `feature_regression` | `conversion`, `session_duration` |

Only `arrivals` is applied today; other effect keys are parsed and stored but
not yet acted on.

The anomaly list is only active when `anomalies` axis ≠ `clean`.

---

## Realism layer

These effects apply automatically on every run — no configuration needed.

| Effect                      | Behavior                                                                         |
| --------------------------- | -------------------------------------------------------------------------------- |
| Hour-of-day curves          | Domain-aware peaks (ecommerce: lunch + evening; others: uniform)                 |
| Day-of-week weights         | Ecommerce heaviest on weekends; moderate mid-week bump                           |
| DST-aware timezones         | Each user's sessions land at a realistic local hour via `zoneinfo`               |
| Country holidays            | Sessions drop on public holidays (Christmas, Golden Week, Diwali, etc.)          |
| US shopping calendar        | Black Friday 3×, Cyber Monday 2.5×, Dec ramp, Valentine's / Mother's Day bumps   |
| Zipf product popularity     | 20% of products get ~80% of ProductView events                                   |
| Pareto user activity        | 20% of users generate ~80% of events                                             |
| Log-normal inter-event gaps | Realistic micro-timing from rapid clicks through checkout to slow research dwell |

Deferred to a later phase: device-aware behavior, payday effects, marketing
micro-bursts, referral clustering.

---

## Authoring a custom preset

1. Copy an existing preset as a starting point:

   ```bash
   cp seeders/presets/ecommerce_steady.yaml seeders/presets/my_scenario.yaml
   ```

2. Edit the YAML — set `name`, `domain`, `axes`, and optionally `scale_config`
   and `anomalies`.

3. Preview before seeding:

   ```bash
   uv run seed --describe my_scenario        # prints resolved config
   uv run python seeders/tests/visualize_preset.py my_scenario
   ```

4. Run it:

   ```bash
   uv run seed --preset my_scenario
   ```

The visualizer prints total events, event vocabulary counts, and a
daily-arrivals histogram — useful for sanity-checking growth curves.

```bash
uv run python seeders/tests/visualize_preset.py retail_declining
uv run python seeders/tests/visualize_preset.py ecommerce_explosive --total-users 2000 --window-days 90
uv run python seeders/tests/visualize_preset.py --list
```

---

## Seeder Studio

Seeder Studio is a browser-based editor that produces preset YAML without
requiring any knowledge of the schema.

```bash
uv run serve              # backend (exposes /api/simulator/presets)
bun run dev:studio        # frontend at http://localhost:5180
```

The Studio lets you:

- Load any shipped preset as a starting point
- Tune all axes via dropdowns (with plain-English labels and sparkline previews)
- Add and configure anomalies
- Preview four KPIs (users, events, sessions, conversions) live as you change axes
- Copy the generated YAML from the right-rail panel

To use the output: copy the YAML into `seeders/presets/<name>.yaml`, then run
`uv run seed --preset <name>`. The Studio does not write to the presets
directory itself.

---

## Examples

```bash
# Tiny dataset for local testing (fast)
uv run seed --preset ecommerce_steady --scale tiny

# Reproducible run for screenshot fixtures
uv run seed --preset saas_pmf --seed 42

# Ecommerce with high churn to stress-test retention charts
uv run seed --preset ecommerce_steady --stickiness churn_heavy

# Viral launch scenario on a medium dataset
uv run seed --preset ecommerce_explosive --scale medium --seed 1

# Only seed the DuckDB connection (skip remote warehouses)
uv run seed --only duckdb

# Inspect what a preset resolves to before running
uv run seed --describe casual_game_addictive
```
