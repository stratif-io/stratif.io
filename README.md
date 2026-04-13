<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg"/>
    <img src="docs/logo.svg" alt="stratif.io"/>
  </picture>

**Warehouse-native product analytics. Your events are already there.**

[![License: ELv2](https://img.shields.io/badge/License-ELv2-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](package.json)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-latest-24292e?logo=github)](https://github.com/stratif-io/stratif.io/pkgs/container/stratif.io)

</div>

---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mc_dark.png"/>
  <img src="docs/mc.png" alt="stratif.io Dashboard"/>
</picture>

---

```bash
curl -fsSL https://stratif.io/install.sh | sh
```

Open **http://localhost:9999** when it's done.

---

## Why stratif.io?

→ **No pipelines.** Your events are already in your warehouse — stop re-piping them into yet another SaaS.  
→ **Self-hosted.** You own the stack. No vendor lock-in, no surprise invoices.  
→ **Works today.** Connects to DuckDB, Postgres, Snowflake, ClickHouse. One table, three columns, done.

Actively developed — new features and connectors ship regularly. Follow the repo or check [Issues](https://github.com/stratif-io/stratif.io/issues) for what's coming.

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

## 🔄 How it works

1. **Point stratif.io at your database** — DuckDB, Postgres, Snowflake, ClickHouse, and more
2. **Select your events table** — one row per event, with a timestamp, a user ID, and an event name
3. **Explore** funnels, retention, journeys, sessions, and SQL directly in the UI

No agents, no pipelines, no data ever leaves your infrastructure.

---

## 🗄️ Supported Databases

DuckDB · SQLite · PostgreSQL · ClickHouse · Snowflake · Databricks

---

## 📋 What your data needs to look like

stratif.io works with any table where **each row is a single event**. The only requirements are three columns:

| Column     | Description                                     |
| ---------- | ----------------------------------------------- |
| timestamp  | When the event happened                         |
| user_id    | Who performed it                                |
| event_name | What happened (e.g. `page_viewed`, `signed_up`) |

Any additional columns — simple values or nested JSON — are picked up automatically as event properties you can filter and group by.

Most teams already have this. If your events live in a raw table, a log export, or a dbt model, you're ready. A one-time `SELECT` that aliases those three columns is all the preparation needed.

---

## ⚙️ Configuration

| Variable                   | Default                                      | Description                                                      |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `STRATIFIO_ENCRYPTION_KEY` | _(required)_                                 | Encrypts stored credentials. Generate: `openssl rand -base64 32` |
| `STRATIFIO_PRODUCT_DB_URL` | `sqlite+aiosqlite:///./stratifio_product.db` | Product DB storing connection configs                            |
| `STRATIFIO_AUTH_ENABLED`   | `false`                                      | Enable API key authentication                                    |
| `STRATIFIO_API_KEY`        | _(empty)_                                    | Required when `AUTH_ENABLED=true`                                |
| `STRATIFIO_CORS_ORIGINS`   | `http://localhost:8000`                      | Allowed CORS origins                                             |
| `STRATIFIO_DEBUG`          | `false`                                      | Enable `/docs` and `/redoc` endpoints                            |

Copy `.env.example` as a starting point:

```bash
cp .env.example .env
# Fill in STRATIFIO_ENCRYPTION_KEY
```

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

## 🤝 Contributing

Pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the full process.

The short version: open an issue first for features and new connectors, then submit a PR. Bug fixes can go straight to a PR. All PRs are reviewed and merged by the maintainer — there are no direct pushes.

```bash
# Run the full quality suite before submitting
bun run lint && bun run build && bun run test:run
```

---

## 🔒 Security

- **Credentials** encrypted with Fernet (AES-128-CBC + HMAC-SHA256)
- **Encryption key** stored in `STRATIFIO_ENCRYPTION_KEY` env var — never in code or git
- **Passwords** hashed with bcrypt + SHA-256 pre-hash
- **Sessions** use HTTP-only, Secure, SameSite=Lax JWT cookies
- **Rate limiting** on login (10 req/min) and registration (3 req/min)

For production: set `STRATIFIO_DEBUG=false` and pin `STRATIFIO_CORS_ORIGINS` to your frontend domain.

---

## 📄 License

Elastic License 2.0 © Carlo Abi Chahine

---

Built on the shoulders of giants — [React](https://react.dev), [FastAPI](https://fastapi.tiangolo.com), [SQLGlot](https://github.com/tobymao/sqlglot), [shadcn/ui](https://ui.shadcn.com), [TanStack Query](https://tanstack.com/query), [Zustand](https://zustand-demo.pmnd.rs), [Recharts](https://recharts.org), [Tailwind CSS](https://tailwindcss.com).
