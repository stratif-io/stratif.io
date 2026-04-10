<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg"/>
    <img src="docs/logo.svg" alt="stratif.io"/>
  </picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](package.json)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-latest-24292e?logo=github)](https://github.com/cabichahine/stratif.io/pkgs/container/stratif.io)

**No event pipelines · Open source & self-hosted · Learn product analytics hands-on**

[Quick Start](#-quick-start) · [Comparison](#-comparison) · [Databases](#%EF%B8%8F-supported-databases) · [Local Dev](#-local-development)

</div>

---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mc_dark.png"/>
  <img src="docs/mc.png" alt="stratif.io Dashboard"/>
</picture>

---

## Why stratif.io?

**Your events are already in your warehouse. Stop sending them somewhere else.** Every SaaS analytics platform makes you re-pipe your data into their system — creating vendor lock-in, duplicating data, and adding cost. stratif.io connects directly to your existing DuckDB, Postgres, Snowflake, or ClickHouse. No ingestion. No pipelines. No data ever leaves your infrastructure.

**Open source and self-hosted.** No vendor lock-in, no surprise invoices. One install script and you own your analytics stack completely.

**Learn product analytics hands-on.** stratif.io ships with ~5,000 realistic sample events. Explore funnels, retention, and user journeys without needing your own data — no account, no credit card.

---

## 🔄 How it works

1. **Connect** your existing database — DuckDB, Postgres, Snowflake, ClickHouse, and more
2. **Explore** funnels, retention, journeys, sessions, and SQL directly in the UI
3. **Done** — no agents, no pipelines, no data ever leaves your infrastructure

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

## 🗄️ Supported Databases

DuckDB · SQLite · PostgreSQL · ClickHouse · Snowflake · Databricks

---

## ⚡ Quick Start

```bash
curl -fsSL https://stratif.io/install.sh | bash
```

Open **http://localhost:9999** when it's done.

> **Docker Compose:**
>
> ```bash
> git clone https://github.com/stratifio/stratifio-oss.git
> cd stratifio-oss
> echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
> docker compose up
> ```

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
git clone https://github.com/stratifio/stratifio-oss.git
cd stratifio-oss

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

## 🔒 Security

- **Credentials** encrypted with Fernet (AES-128-CBC + HMAC-SHA256)
- **Encryption key** stored in `STRATIFIO_ENCRYPTION_KEY` env var — never in code or git
- **Passwords** hashed with bcrypt + SHA-256 pre-hash
- **Sessions** use HTTP-only, Secure, SameSite=Lax JWT cookies
- **Rate limiting** on login (10 req/min) and registration (3 req/min)

For production: set `STRATIFIO_DEBUG=false` and pin `STRATIFIO_CORS_ORIGINS` to your frontend domain.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change. Have a question or idea? [Start a discussion](https://github.com/cabichahine/stratif.io/discussions).

```bash
# Run the full quality suite before submitting
bun run lint && bun run build && bun run test:run
```

---

## 📄 License

MIT © stratif.io Contributors

---

Built on the shoulders of giants — [React](https://react.dev), [FastAPI](https://fastapi.tiangolo.com), [SQLGlot](https://github.com/tobymao/sqlglot), [shadcn/ui](https://ui.shadcn.com), [TanStack Query](https://tanstack.com/query), [Zustand](https://zustand-demo.pmnd.rs), [Recharts](https://recharts.org), [Tailwind CSS](https://tailwindcss.com).
