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

## Domain catalog (Phase 4)

10 domains shipped; each defines its event vocabulary + session archetypes + supported monetization modes.

| Domain            | Events                                                                                       | Supported monetization             |
| ----------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| `ecommerce`       | 5 funnel events                                                                              | one_off_purchase                   |
| `retail`          | ecommerce + StoreLocator/InStorePickup/LoyaltyRedemption                                     | one_off_purchase                   |
| `casual_game`     | LevelStart/Complete/Fail, IAPOffer/Purchase, AdShown/Clicked, DailyBonus                     | iap_whales, ad_supported, freemium |
| `gaming_hardcore` | casual_game + Matchmaking/MatchStart/End, ClanJoin, Chat                                     | iap_whales, ad_supported           |
| `saas`            | SignUp, EmailVerified, Onboarded, ProjectCreated, ItemCreated, Invite*, Upgrade*             | subscription, freemium             |
| `streaming`       | Browse, TitlePageView, Play\* (Started/Paused/Completed), Rated, AddedToList                 | subscription, ad_supported         |
| `social`          | FeedLoaded, Post\* (Viewed/Liked/Shared), CommentPosted, FollowAdded, MessageSent            | ad_supported                       |
| `marketplace`     | Listing\* (View/Created/Sold), MessageToSeller, Offer, Purchase                              | marketplace_fee                    |
| `dating`          | ProfileView, Swipe, Match, MessageSent/Read, DateScheduled, SubscriptionUpgraded             | subscription                       |
| `fintech`         | AccountOpened, Deposit/Withdrawal, Transfer\*, CardPurchase, BalanceChecked, StatementViewed | one_off_purchase                   |

## Preset catalog

8 presets shipped. Each pairs a domain with axis values.

| Preset                  | Domain      | Dynamic                          |
| ----------------------- | ----------- | -------------------------------- |
| `ecommerce_steady`      | ecommerce   | baseline, default                |
| `ecommerce_explosive`   | ecommerce   | viral growth                     |
| `retail_declining`      | retail      | losing market share              |
| `casual_game_addictive` | casual_game | whale-heavy IAP, high stickiness |
| `saas_pmf`              | saas        | steady growth, low churn         |
| `streaming_mature`      | streaming   | binge sessions, high retention   |
| `marketplace_scaling`   | marketplace | GMV growth                       |
| `dating_app_churn`      | dating      | quick activation, high churn     |

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

### `engagement_depth` — per-session depth

| Value      | Effect                                                        |
| ---------- | ------------------------------------------------------------- |
| `shallow`  | Sessions skew toward bounce / browser (less conversion)       |
| `moderate` | Baseline — no modifier                                        |
| `deep`     | Sessions skew toward researcher / converter (more conversion) |

### `geography` — country filter

| Value       | Countries                                   |
| ----------- | ------------------------------------------- |
| `global`    | All (US / UK / DE / FR / JP / BR / IN / AU) |
| `us_only`   | US only                                     |
| `eu_only`   | UK, DE, FR                                  |
| `apac_only` | JP, IN, AU                                  |

### `monetization` — revenue model (with domain coercion)

| Value              | Domains that support it        |
| ------------------ | ------------------------------ |
| `one_off_purchase` | ecommerce, retail, marketplace |
| `subscription`     | saas, streaming, dating        |
| `iap_whales`       | casual_game, gaming_hardcore   |
| `ad_supported`     | social, gaming_casual          |
| `freemium`         | saas                           |
| `marketplace_fee`  | marketplace                    |

If a preset requests a value the domain doesn't support, the Engine logs at INFO and coerces to the domain's default.

### `virality` — referral weight

| Value          | Weight | Behavior                                          |
| -------------- | ------ | ------------------------------------------------- |
| `none`         | 0.0    | No referral events                                |
| `weak`         | 0.3    | Occasional referrals (Phase 4 domains emit these) |
| `strong_viral` | 1.0    | Heavy referrals (Phase 4)                         |

### `anomalies` — dated spikes/dips

| Value                                         | Behavior                                                 |
| --------------------------------------------- | -------------------------------------------------------- |
| `clean`                                       | No anomalies (default)                                   |
| `campaigns` / `outages` / `ab_tests` / `full` | Preserve the preset's `anomalies:` list; Phase 5 applies |
| `explicit`                                    | Use the preset's `anomalies:` list as-is                 |

Anomaly application lands in Phase 5.

### Try it

```bash
uv run seed --preset ecommerce_steady --growth declining --stickiness churn_heavy
uv run seed --preset ecommerce_steady --growth explosive --stickiness sticky
```

Both produce ecommerce events with the same vocabulary but qualitatively different cohort and retention shapes.

## Realism layer (Phase 3)

8 of the 14 spec'd realism effects now apply automatically. The rest ship in a later phase.

| Effect                            | Behavior                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hour-of-day curves (domain-aware) | Ecommerce sessions peak at lunch (11-13) and evenings (19-22); weekends shift later. Other domains fall back to uniform weights.                 |
| Day-of-week curves                | Ecommerce: Sat + Sun heaviest; Wed slight bump; others moderate.                                                                                 |
| DST-aware timezones               | Every session lands at a realistic local hour for the user's country via `zoneinfo`. A Japanese user is active at JST evening, not UTC midnight. |
| Country holidays                  | Christmas, New Year, Golden Week (JP), Carnival (BR), Diwali (IN), etc. — sessions drop on holidays (0.3x, 0.1x for ecommerce on Dec 25).        |
| US shopping calendar              | Dec 1-24 ramp (1.0x → 2.0x), Dec 25 crash (0.1x), Black Friday (3.0x), Cyber Monday (2.5x), Valentine's / Mother's Day / back-to-school bumps.   |
| Zipf product popularity           | 20% of products receive ~80% of ProductView events — a realistic long-tail catalog.                                                              |
| Pareto user activity              | 20% of users generate ~80% of events — heavy-tailed distribution of engagement.                                                                  |
| Log-normal inter-event gaps       | Realistic micro-timing: rapid clicks (seconds) through checkout, slower dwell time on research/browse steps, lognormal tails.                    |

**Deferred to a later phase:** device-aware behavior (R8), payday effects (R9), marketing micro-bursts (R10), referral clustering (R13 — needs Phase 4 domain support).

## Status

**Phase 4 shipped.** 10 domain packs + 8 preset YAMLs. Any preset can be loaded, described, or seeded end-to-end.

Coming in later phases:

- Phase 3b — deferred realism (device-aware, payday, marketing micro-bursts)
- Phase 5 — anomaly applicator (Black Friday spikes, outages, A/B tests, etc.)
- Phase 6 — per-preset acceptance assertions + visual plots
