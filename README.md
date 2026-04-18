<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg"/>
    <img src="docs/logo.svg" alt="stratif.io"/>
  </picture>

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](package.json)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-latest-24292e?logo=github)](https://github.com/stratif-io/stratif.io/pkgs/container/stratif.io)

**The first open-source, self-hosted option for warehouse-native product analytics — works directly on your existing data warehouse.**

[Website](https://stratif.io) · [Live Demo](https://demo.stratif.io) · [Quick Start](#-quick-start) · [Docs](https://docs.stratif.io) · [Contributing](CONTRIBUTING.md)

</div>

---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mc_dark.png"/>
  <img src="docs/mc.png" alt="stratif.io Dashboard"/>
</picture>

---

## Why warehouse-native analytics?

**Your events are already in your warehouse. Stop sending them somewhere else.** Every SaaS analytics platform makes you re-pipe your data into their system — creating vendor lock-in, duplicating data, and adding cost. stratif.io connects directly to your existing DuckDB, Postgres, Snowflake, or ClickHouse. No ingestion. No pipelines. No data ever leaves your infrastructure.

**Open source and self-hosted.** No vendor lock-in, no surprise invoices. One install script and you own your analytics stack completely.

**Learn product analytics hands-on.** stratif.io ships with ~5,000 realistic sample events. Explore funnels, retention, and user journeys without needing your own data — no account, no credit card.

### What is warehouse-native analytics?

Warehouse-native analytics is a category of tools that run product analysis — funnels, retention, paths — directly on the events already in your data warehouse (DuckDB, Snowflake, ClickHouse, Databricks, Postgres). No ingestion pipeline. No SDK. No duplicate copy of your data in a third-party SaaS.

### Who is stratif.io for — and who is it not for?

**stratif.io is for you if** your product events are already in a SQL warehouse, you want self-hosted funnels, retention, and path analysis on that data, and you don't want to pay per event or hand your data to a SaaS vendor.

**stratif.io is _not_ a full-stack replacement for Mixpanel or Amplitude.** It does not ship SDKs, experimentation, session replay, or push notifications. If you need those, pair stratif.io with a platform that does event collection, or keep using your current tool for those specific capabilities.

---

## ⚡ Quick Start

```bash
curl -fsSL https://stratif.io/install.sh | sh
```

Open **http://localhost:6870** when it's done. For Docker Compose and advanced setup, see [docs.stratif.io](https://docs.stratif.io).

---

## 🗄️ Supported Databases

DuckDB · SQLite · PostgreSQL · ClickHouse · Snowflake · Databricks

- **Point stratif.io at your database** — one row per event, with a timestamp, a user ID, and an event name
- **Select your events table** — any additional columns are picked up automatically as filterable properties
- **Explore** funnels, retention, journeys, sessions, and SQL directly in the UI

---

## 📊 Comparison

|                                 | stratif.io | Amplitude / Mixpanel | PostHog | Warehouse-native SaaS\* |
| ------------------------------- | :--------: | :------------------: | :-----: | :---------------------: |
| Open source                     |     ✅     |          ❌          |   ✅    |           ❌            |
| Self-hosted                     |     ✅     |          ❌          |   ✅    |           ❌            |
| Warehouse-native (no ingestion) |     ✅     |          ❌          |   ❌    |           ✅            |
| No usage-based pricing          |     ✅     |          ❌          |   ❌    |           ❌            |
| Sample data to learn with       |     ✅     |          ❌          |   ❌    |           ❌            |

_\* Mitzu, Kubit, NetSpring, Houseware — all closed-source, cloud-only, paid._

---

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

**License:** Apache-2.0 © Carlo Abi Chahine

---

<p align="center">
  <a href="https://star-history.com/#stratif-io/stratif.io&Date">
    <img src="https://api.star-history.com/svg?repos=stratif-io/stratif.io&type=Date" alt="Star History" width="500"/>
  </a>
</p>

---

Built on the shoulders of giants — [React](https://react.dev), [FastAPI](https://fastapi.tiangolo.com), [SQLGlot](https://github.com/tobymao/sqlglot), [shadcn/ui](https://ui.shadcn.com), [TanStack Query](https://tanstack.com/query), [Zustand](https://zustand-demo.pmnd.rs), [Recharts](https://recharts.org), [Tailwind CSS](https://tailwindcss.com).
