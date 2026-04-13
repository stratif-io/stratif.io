# stratif.io Documentation

[← Back to README](../README.md)

## Docker Compose

```bash
git clone https://github.com/stratif-io/stratif.io.git
cd stratif.io
echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
docker compose up
```

Open **http://localhost:9999** when it's done.

---

## Local Development

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

## Configuration

Copy `.env.example` as a starting point (`cp .env.example .env`), then set `STRATIFIO_ENCRYPTION_KEY`.

| Variable                   | Default                                               | Description                                                      |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `STRATIFIO_ENCRYPTION_KEY` | _(required)_                                          | Encrypts stored credentials. Generate: `openssl rand -base64 32` |
| `STRATIFIO_PRODUCT_DB_URL` | `sqlite+aiosqlite:///./data/dbs/stratifio_product.db` | Product DB storing connection configs                            |
| `STRATIFIO_AUTH_ENABLED`   | `false`                                               | Enable API key authentication                                    |
| `STRATIFIO_API_KEY`        | _(empty)_                                             | Required when `AUTH_ENABLED=true`                                |
| `STRATIFIO_CORS_ORIGINS`   | `http://localhost:8000`                               | Allowed CORS origins (comma-separated)                           |
| `STRATIFIO_DEBUG`          | `false`                                               | Enable `/docs` and `/redoc` endpoints                            |

For production: set `STRATIFIO_DEBUG=false` and pin `STRATIFIO_CORS_ORIGINS` to your exact frontend domain.

---

## Data Schema

stratif.io works with any table where **each row is a single event**. The only requirements are three columns:

| Column       | Description                                     |
| ------------ | ----------------------------------------------- |
| `timestamp`  | When the event happened                         |
| `user_id`    | Who performed it                                |
| `event_name` | What happened (e.g. `page_viewed`, `signed_up`) |

Any additional columns — simple values or nested JSON — are picked up automatically as event properties you can filter and group by.

Most teams already have this. If your events live in a raw table, a log export, or a dbt model, you're ready. A one-time `SELECT` that aliases those three columns is all the preparation needed.

---

## Security

- **Credentials** encrypted with Fernet (AES-128-CBC + HMAC-SHA256)
- **Encryption key** stored in `STRATIFIO_ENCRYPTION_KEY` env var — never in code or git
- **Passwords** hashed with bcrypt + SHA-256 pre-hash
- **Sessions** use HTTP-only, Secure, SameSite=Lax JWT cookies
- **Rate limiting** on login (10 req/min) and registration (3 req/min)

**Production checklist:**

- [ ] `STRATIFIO_ENCRYPTION_KEY` is at least 32 characters
- [ ] `STRATIFIO_DEBUG=false`
- [ ] `STRATIFIO_CORS_ORIGINS` is set to your exact frontend domain (not `*`)
- [ ] The SQLite product DB file is not publicly accessible
- [ ] Never log or commit the encryption key
