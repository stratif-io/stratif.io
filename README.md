<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg"/>
    <img src="docs/logo.svg" alt="stratif.io"/>
  </picture>

[![License: ELv2](https://img.shields.io/badge/License-ELv2-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](package.json)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-latest-24292e?logo=github)](https://github.com/stratif-io/stratif.io/pkgs/container/stratif.io)

**Your events are already in your warehouse. Connect directly — no pipelines, no ingestion, no vendor lock-in.**

[Quick Start](#-quick-start) · [Docs](docs/docs.md) · [Contributing](CONTRIBUTING.md)

</div>

---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mc_dark.png"/>
  <img src="docs/mc.png" alt="stratif.io Dashboard"/>
</picture>

---

## ⚡ Quick Start

```bash
curl -fsSL https://stratif.io/install.sh | sh
```

Open **http://localhost:8000** when it's done.

> **Docker Compose:**
>
> ```bash
> git clone https://github.com/stratif-io/stratif.io.git
> cd stratif.io
> echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
> docker compose up
> ```
>
> Open **http://localhost:9999** when it's done.

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
| Free                            |     ✅     |          ❌          |   ❌    |           ❌            |
| Sample data to learn with       |     ✅     |          ❌          |   ❌    |           ❌            |

_\* Mitzu, Kubit, NetSpring, Houseware — all closed-source, cloud-only, paid._

---

## 🔧 Local Development

**Prerequisites:** [Bun](https://bun.sh), Python 3.12+, [uv](https://docs.astral.sh/uv/)

```bash
git clone https://github.com/stratif-io/stratif.io.git
cd stratif.io

bun install
uv sync

cp .env.example .env
# Set STRATIFIO_ENCRYPTION_KEY in .env

uv run seed-duckdb          # seed sample data (optional)

uv run serve                # backend  → http://localhost:8000
bun run dev                 # frontend → http://localhost:5173
```

**Quality checks:**

```bash
bun run test:run             # frontend unit tests (Vitest)
uv run pytest backend/       # backend tests
bun run lint                 # ESLint (zero warnings)
bun run build                # TypeScript + production build
bun run test:e2e             # end-to-end tests (Playwright)
```

---

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

**License:** Elastic License 2.0 © Carlo Abi Chahine

---

Built on the shoulders of giants — [React](https://react.dev), [FastAPI](https://fastapi.tiangolo.com), [SQLGlot](https://github.com/tobymao/sqlglot), [shadcn/ui](https://ui.shadcn.com), [TanStack Query](https://tanstack.com/query), [Zustand](https://zustand-demo.pmnd.rs), [Recharts](https://recharts.org), [Tailwind CSS](https://tailwindcss.com).
