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

```yaml
services:
  stratifio:
    image: ghcr.io/stratif-io/stratif.io:latest
    ports:
      - "6870:6870"
    volumes:
      - ./data:/app/data
    environment:
      STRATIFIO_ENCRYPTION_KEY: your-32-char-key-here
```

Generate an encryption key:

```bash
openssl rand -base64 32
```

## Pinning a version

```bash
STRATIFIO_VERSION=v0.37.0 curl -fsSL https://stratif.io/install.sh | sh
```

## Updating

```bash
cd stratifio
git pull
uv sync --frozen --no-dev
```
