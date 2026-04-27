---
title: Configure stratif.io — Environment Variables and Settings
description: Complete reference for every environment variable and configuration option in stratif.io — auth, encryption keys, CORS, rate limits, product DB path, and more.
---

Configuration is managed via environment variables loaded from `.env` at the project root. The install script creates this file automatically.

## Required

| Variable                   | Description                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STRATIFIO_ENCRYPTION_KEY` | 32+ character key used to encrypt warehouse credentials at rest. Generate with `openssl rand -base64 32`. **Never commit or expose this value.** |

## Product database

| Variable                   | Default                                               | Description                                                                                                                                |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `STRATIFIO_PRODUCT_DB_URL` | `sqlite+aiosqlite:///./data/dbs/stratifio_product.db` | Connection string for the internal product database (users, connections, encrypted credentials). Supports SQLite (default) and PostgreSQL. |

## Server

| Variable                 | Default                 | Description                                                                                            |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `STRATIFIO_PORT`         | `6870`                  | Port the server listens on                                                                             |
| `STRATIFIO_CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed CORS origins. Set to your exact frontend domain in production — never use `*`. |
| `STRATIFIO_DEBUG`        | `false`                 | Enables `/docs` and `/redoc` API endpoints. **Never enable in production.**                            |
| `STRATIFIO_LOG_LEVEL`    | `INFO`                  | Log verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR`                                                     |

## Auth

| Variable                 | Default | Description                                                                                                               |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `STRATIFIO_AUTH_ENABLED` | `false` | When `true`, all API requests must include an `X-API-Key` header matching `STRATIFIO_API_KEY`.                            |
| `STRATIFIO_API_KEY`      | —       | Required when `STRATIFIO_AUTH_ENABLED=true`. Set to a strong random value — clients must send it as `X-API-Key: <value>`. |

## Production checklist

- Set `STRATIFIO_ENCRYPTION_KEY` to a unique value per installation
- Add `.env` to `.gitignore` — never commit it
- Set `STRATIFIO_CORS_ORIGINS` to your exact frontend domain
- Keep `STRATIFIO_DEBUG=false`
- Use PostgreSQL for `STRATIFIO_PRODUCT_DB_URL` in multi-user deployments
