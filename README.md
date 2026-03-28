<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg"/>
    <img src="docs/logo.svg" alt="stratif.io"/>
  </picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](package.json)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)

**🔍 Self-hosted product analytics. Your database, your infrastructure, your rules. 📊**

[Quick Start](#-quick-start) · [Features](#-features) · [Databases](#-supported-databases) · [Local Dev](#-local-development)

</div>

---

![stratif.io Dashboard](docs/demo.gif)

---

## Why stratif.io?

Most analytics platforms force a choice: pay for a SaaS that owns your data, or spend months building custom dashboards from scratch.

**stratif.io does neither.** Connect it to your existing database — DuckDB, PostgreSQL, Snowflake, or others — and get a full analytics suite running on your own infrastructure in under 10 minutes. No data leaves your environment. No vendor lock-in. No surprise invoices.

---

## ⚡ Quick Start

```bash
curl -fsSL https://stratif.io/install.sh | bash
```

The script checks your dependencies, clones the repo, generates an encryption key, and starts the app. Open **http://localhost:9999** when it's done.

> **Manual (Docker Compose):**
>
> ```bash
> git clone https://github.com/stratifio/stratifio-oss.git
> cd stratifio-oss
> echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
> docker compose up
> ```

**First run:** Sample analytics data (~5,000 events) is seeded automatically into `/data/sample.duckdb`. Go to **Connections → Add → DuckDB → `/data/sample.duckdb`** to explore it.

> To reseed from scratch: `docker compose down -v && docker compose up`
> **Warning:** `-v` removes the `analytics_data` volume — this deletes all stored connections and credentials, not just the sample data.

---

## ✨ Features

| Feature                      | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| 📈 **Trends**                | Event counts over time with customizable granularity       |
| 🔁 **Retention**             | Cohort-based retention tables                              |
| 🚦 **Funnels**               | Step-by-step conversion analysis                           |
| 🗺️ **Paths**                 | User journey flows with Sankey diagrams                    |
| 🔀 **Pivot Tables**          | Drag-and-drop data exploration (Graphic Walker)            |
| 💻 **Sessions**              | Raw session browser with full event timelines              |
| 🔌 **Multi-database**        | One UI, many backends — DuckDB, Postgres, Snowflake & more |
| 🔐 **Encrypted credentials** | AES-128-CBC + HMAC-SHA256 via Fernet                       |
| 🐳 **Docker deploy**         | One `docker compose up` from dev to production             |

---

## 🗄️ Supported Databases

| Database       | Notes                                 |
| -------------- | ------------------------------------- |
| **DuckDB**     | Local file or S3-backed               |
| **SQLite**     | Local file                            |
| **PostgreSQL** | Connection string                     |
| **BigQuery**   | Coming soon                           |
| **Redshift**   | Coming soon                           |
| **Databricks** | SQL warehouse via HTTP path (Beta)    |
| **Snowflake**  | Account identifier + warehouse (Beta) |
| **ClickHouse** | Host/port, optional TLS               |

---

## 🏗️ Architecture

```
stratifio-oss/
├── apps/web/frontend/     # React 18, Vite 6, Tailwind CSS v4, shadcn/ui
│   ├── features/          # Analytics pages (trends, retention, funnels…)
│   ├── components/        # Shared UI (charts, tables, layout)
│   └── stores/            # Zustand client state
├── backend/               # FastAPI, SQLGlot
│   ├── api/               # Route handlers
│   ├── backends/          # Database adapters (DuckDB, PG, Snowflake…)
│   ├── services/          # Business logic & SQL transpilation
│   └── product_db/        # SQLite for connection configs
├── seeders/               # Sample data generators
├── Dockerfile             # Multi-stage build (Node → Python → Caddy → final)
└── docker-compose.yml
```

**Frontend state:** TanStack Query v5 for server state, Zustand for client state.
**Backend SQL:** SQLGlot transpiles a unified query dialect to each database's native SQL.

---

## ⚙️ Configuration

| Variable                    | Default                      | Description                                                      |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `STRATIFIO_ENCRYPTION_KEY`  | _(required)_                 | Encrypts stored credentials. Generate: `openssl rand -base64 32` |
| `STRATIFIO_PRODUCT_DB_PATH` | `./stratifio_product.sqlite` | SQLite file storing connection configs                           |
| `STRATIFIO_API_KEY`         | _(empty)_                    | Optional API key for the dashboard                               |
| `STRATIFIO_CORS_ORIGINS`    | `http://localhost:9999`      | Allowed CORS origins                                             |
| `STRATIFIO_DEBUG`           | `false`                      | Enable `/docs` and `/redoc` endpoints                            |
| `STRATIFIO_LOG_LEVEL`       | `INFO`                       | `DEBUG` / `INFO` / `WARNING` / `ERROR`                           |

Copy `.env.example` as a starting point:

```bash
cp .env.example .env
# Fill in STRATIFIO_ENCRYPTION_KEY
```

---

## 🔧 Local Development

**Prerequisites:** Node 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/)

```bash
git clone https://github.com/stratifio/stratifio-oss.git
cd stratifio-oss

npm install
uv sync

cp .env.example .env
# Set STRATIFIO_ENCRYPTION_KEY in .env

uv run seed-duckdb          # seed sample data (optional)

uv run serve                # backend  → http://localhost:8000
npm run dev                 # frontend → http://localhost:5173
```

**Quality checks:**

```bash
npm run test:run             # frontend unit tests (Vitest)
uv run pytest backend/       # backend tests
npm run lint                 # ESLint (zero warnings)
npm run build                # TypeScript + production build
npm run test:e2e             # end-to-end tests (Playwright)
```

---

## 🔒 Security

- **Credentials** encrypted with Fernet (AES-128-CBC + HMAC-SHA256)
- **Encryption key** stored in `STRATIFIO_ENCRYPTION_KEY` env var — never in code or git
- **Passwords** hashed with bcrypt + SHA-256 pre-hash
- **Sessions** use HTTP-only, Secure, SameSite=Lax JWT cookies
- **Rate limiting** on login (10 req/min) and registration (3 req/min)

**For production:** set `STRATIFIO_DEBUG=false` and pin `STRATIFIO_CORS_ORIGINS` to your frontend domain.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

```bash
# Run the full quality suite before submitting
npm run lint && npm run build && npm run test:run
```

---

## 📄 License

MIT © stratif.io Contributors
