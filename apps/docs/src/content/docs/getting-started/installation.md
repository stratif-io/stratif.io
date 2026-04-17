---
title: Installation
description: Install stratif.io on your own server or laptop
---

## Prerequisites

- Python 3.12 or higher
- `git`, `curl`, `openssl` (standard on macOS and Linux)
- A supported warehouse — DuckDB is bundled, no extra setup needed

## One-liner install

```bash
curl -fsSL https://stratif.io/install.sh | sh
```

The script:

1. Checks prerequisites and installs `uv` (Python package manager) if missing
2. Clones the latest release of stratif.io
3. Installs Python dependencies
4. Generates an encryption key for credential storage
5. Creates `.env`, `connections.yaml`, and `start.sh`
6. Seeds a sample DuckDB dataset (5,000 events, 90 days)
7. Starts the server on port **6870**

Open [http://localhost:6870](http://localhost:6870) when complete.

## Docker Compose

Clone the repo and start with Docker Compose:

```bash
git clone https://github.com/stratif-io/stratif.io.git
cd stratif.io
echo "STRATIFIO_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env
docker compose up -d
```

Open [http://localhost:9999](http://localhost:9999) when the health check passes (~30 seconds).

The default compose setup runs the app behind a Caddy reverse proxy on port **9999**. To customise the port, set `STRATIFIO_PORT` or edit `docker-compose.yml`.

## Pinning a version

To install a specific version on a **fresh machine** (no existing `~/.stratifio`):

```bash
STRATIFIO_VERSION=v0.36.0 curl -fsSL https://stratif.io/install.sh | sh
```

To switch an existing installation to a different version, remove the install directory first:

```bash
rm -rf ~/.stratifio
STRATIFIO_VERSION=v0.36.0 curl -fsSL https://stratif.io/install.sh | sh
```

## Install script variables

| Variable             | Default               | Description                                                                          |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `STRATIFIO_VERSION`  | latest                | Version tag to install (e.g. `v0.30.0`)                                              |
| `STRATIFIO_DIR`      | `~/.stratifio`        | Directory to install stratif.io into                                                 |
| `STRATIFIO_PORT`     | `6870`                | Port to run the server on                                                            |
| `STRATIFIO_DATA_DIR` | `$STRATIFIO_DIR/data` | Directory for the DuckDB sample data and product database                            |
| `GITHUB_TOKEN`       | —                     | GitHub personal access token — set this to avoid API rate limits on slow connections |

Example — install v0.30.0 on a custom port into a custom directory:

```bash
STRATIFIO_VERSION=v0.30.0 \
STRATIFIO_DIR=/opt/stratifio \
STRATIFIO_PORT=8080 \
curl -fsSL https://stratif.io/install.sh | sh
```

## Updating

```bash
cd stratifio
git pull
uv sync --frozen --no-dev
```
