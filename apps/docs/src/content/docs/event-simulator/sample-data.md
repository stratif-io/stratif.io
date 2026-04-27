---
title: Sample Data — Learn Product Analytics with ~5000 Realistic Events
description: stratif.io ships with a realistic synthetic event dataset (~5000 events, 250 users). Explore funnels, retention, and user journeys without connecting your own warehouse.
---

The live demo at [demo.stratif.io](https://demo.stratif.io) and the default local installation come pre-loaded with a sample e-commerce dataset.

## What's in it

- **5,000 users** with randomised traits (country, device, plan)
- **90 days** of event history
- **E-commerce funnel** with these events:

| Event         | Description                     |
| ------------- | ------------------------------- |
| `Home`        | User visits the homepage        |
| `Search`      | User searches for a product     |
| `ProductView` | User views a product page       |
| `AddToCart`   | User adds an item to their cart |
| `Purchase`    | User completes a purchase       |

## Suggested exploration

1. **Trends** — plot `Purchase` over time to see daily conversion volume
2. **Funnel** — build `Home → Search → ProductView → AddToCart → Purchase` to measure conversion rates
3. **Retention** — set `Home` as the first action; see how many users return week-over-week
4. **Paths** — start from `AddToCart` to explore what users do before and after
5. **People** — browse individual user profiles and their full event history

## Connecting your own data

To replace the sample data:

1. Go to **Connections → New Connection**
2. Select your warehouse type and fill in credentials
3. In the **Schema** tab, map your columns to `user_id`, `event_name`, and `timestamp`
4. Save the connection and set it as active

The sample DuckDB file is at `~/.stratifio/data/sample.duckdb` (or `$STRATIFIO_DATA_DIR/sample.duckdb` if you customised the install path) and can be deleted once you've connected your own warehouse.
