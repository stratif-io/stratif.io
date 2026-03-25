# Configuration

All configuration is via environment variables prefixed with `STRATIFIO_`.

Set them in a `.env` file at the project root, or pass directly to Docker.

## Required

| Variable | Description |
|---|---|
| `STRATIFIO_ENCRYPTION_KEY` | 32+ character key for encrypting database credentials. Generate with `openssl rand -base64 32`. |

## Server

| Variable | Default | Description |
|---|---|---|
| `STRATIFIO_DEBUG` | `false` | Enables `/docs`, `/redoc`, verbose error responses. Never use in production. |
| `STRATIFIO_CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed frontend origins. |
| `STRATIFIO_LOG_LEVEL` | `INFO` | Log level: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `STRATIFIO_LOG_FORMAT` | `json` | Log format: `json` or `console`. |
| `STRATIFIO_LOG_SQL` | `false` | Log all SQL queries (verbose, debug only). |

## Auth

| Variable | Default | Description |
|---|---|---|
| `STRATIFIO_AUTH_ENABLED` | `false` | Set `true` in production to enforce API key auth. |
| `STRATIFIO_API_KEY` | `""` | API key for auth when `AUTH_ENABLED=true`. |
| `STRATIFIO_ALLOW_REGISTRATION` | `false` | Allow new user registration. |

## Database

| Variable | Default | Description |
|---|---|---|
| `STRATIFIO_PRODUCT_DB_PATH` | `./stratifio_product.sqlite` | Path for the SQLite product database (connections, credentials). |
| `STRATIFIO_PRODUCT_DB_URL` | `""` | Full DB URL override (e.g. `postgresql://...`). Takes precedence over `PRODUCT_DB_PATH`. |

## Security Notes

- Never commit your `.env` file or the SQLite product database to git.
- Never use `STRATIFIO_DEBUG=true` in production.
- Set `STRATIFIO_CORS_ORIGINS` to your exact frontend domain — never `*` in production.
