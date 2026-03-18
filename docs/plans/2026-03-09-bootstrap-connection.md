# Bootstrap Sample Connection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After seeding sample DuckDB data on first Docker run, automatically register the connection in the product SQLite DB so users land on a working dashboard with zero manual setup.

**Architecture:** A new `seeders/bootstrap_connection.py` script uses the app's existing `crypto` and `product_db` modules directly (no HTTP). It is idempotent — checks for an existing connection named "Sample DuckDB" before inserting. `entrypoint.sh` calls it after `seed-duckdb` completes.

**Tech Stack:** Python 3.12, sqlite3, `cryptography` (Fernet via `backend.services.crypto`), `backend.product_db`, `backend.product_db.migrations`

---

### Task 1: Write `seeders/bootstrap_connection.py`

**Files:**
- Create: `seeders/bootstrap_connection.py`

**Step 1: Write the script**

Create `/Users/carlo/my_work/stratifio/seeders/bootstrap_connection.py`:

```python
"""Bootstrap a sample DuckDB connection into the product SQLite DB.

Run after seed-duckdb on first Docker startup. Idempotent — safe to call
multiple times; skips insertion if "Sample DuckDB" already exists.

Usage:
    python -m seeders.bootstrap_connection
    python -m seeders.bootstrap_connection --path /data/sample.duckdb
"""

import argparse
import json
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from backend.product_db.database import get_product_db
from backend.product_db.migrations import init_product_db
from backend.services.crypto import encrypt_credentials


CONNECTION_NAME = "Sample DuckDB"
DEFAULT_PATH = "/data/sample.duckdb"


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def bootstrap(db_path: str = DEFAULT_PATH) -> None:
    """Insert the sample DuckDB connection if it doesn't already exist."""
    init_product_db()
    db = get_product_db()

    existing = db.fetchone(
        "SELECT id FROM connections WHERE name = ?", (CONNECTION_NAME,)
    )
    if existing:
        print(f"[stratifio] Connection '{CONNECTION_NAME}' already exists — skipping.")
        return

    conn_id = str(uuid.uuid4())
    now = _now()
    credentials_encrypted = encrypt_credentials({"path": db_path})

    db.execute(
        """
        INSERT INTO connections (id, name, db_type, credentials_encrypted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (conn_id, CONNECTION_NAME, "duckdb", credentials_encrypted, now, now),
    )
    db.execute(
        """
        INSERT INTO connection_schema_configs
            (id, connection_id, updated_at)
        VALUES (?, ?, ?)
        """,
        (str(uuid.uuid4()), conn_id, now),
    )
    db.execute(
        """
        INSERT INTO connection_filter_configs
            (id, connection_id, updated_at)
        VALUES (?, ?, ?)
        """,
        (str(uuid.uuid4()), conn_id, now),
    )

    print(f"[stratifio] Bootstrapped connection '{CONNECTION_NAME}' → {db_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap sample DuckDB connection")
    parser.add_argument(
        "--path",
        default=DEFAULT_PATH,
        help=f"Path to the DuckDB file (default: {DEFAULT_PATH})",
    )
    args = parser.parse_args()
    bootstrap(args.path)


if __name__ == "__main__":
    main()
```

**Step 2: Verify it parses (no import errors)**

```bash
cd /Users/carlo/my_work/stratifio && python -c "import seeders.bootstrap_connection; print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add seeders/bootstrap_connection.py
git commit -m "feat(docker): add bootstrap_connection script for first-run setup"
```

---

### Task 2: Write tests for `bootstrap_connection`

**Files:**
- Create: `seeders/tests/test_bootstrap_connection.py`

**Step 1: Create the test file**

Create `/Users/carlo/my_work/stratifio/seeders/tests/__init__.py` (empty).

Create `/Users/carlo/my_work/stratifio/seeders/tests/test_bootstrap_connection.py`:

```python
"""Tests for seeders.bootstrap_connection."""

import sqlite3
import uuid
from unittest.mock import patch

import pytest

from backend.services.crypto import decrypt_credentials


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_db(tmp_path):
    """Return a temp SQLite path and initialise the schema."""
    db_path = str(tmp_path / "test_product.sqlite")

    # Patch settings so product_db points to our temp file
    with patch("backend.config.settings") as mock_settings:
        mock_settings.product_db_path = db_path
        mock_settings.encryption_key = "test-encryption-key-for-testing-only"

        from backend.product_db import database as db_module
        db_module._product_db = None  # reset singleton

        from backend.product_db.migrations import init_product_db
        init_product_db()

    return db_path


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_bootstrap_inserts_connection(tmp_path):
    """First call inserts connection, schema config, and filter config."""
    db_path = str(tmp_path / "test_product.sqlite")

    with (
        patch("backend.config.settings") as mock_settings,
    ):
        mock_settings.product_db_path = db_path
        mock_settings.encryption_key = "test-encryption-key-for-testing-only"

        from backend.product_db import database as db_module
        db_module._product_db = None

        from backend.product_db.migrations import init_product_db
        init_product_db()

        from seeders.bootstrap_connection import bootstrap
        bootstrap("/data/sample.duckdb")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    connections = conn.execute("SELECT * FROM connections").fetchall()
    assert len(connections) == 1
    assert connections[0]["name"] == "Sample DuckDB"
    assert connections[0]["db_type"] == "duckdb"

    schema_configs = conn.execute("SELECT * FROM connection_schema_configs").fetchall()
    assert len(schema_configs) == 1
    assert schema_configs[0]["connection_id"] == connections[0]["id"]

    filter_configs = conn.execute("SELECT * FROM connection_filter_configs").fetchall()
    assert len(filter_configs) == 1
    assert filter_configs[0]["connection_id"] == connections[0]["id"]

    conn.close()


def test_bootstrap_credentials_encrypted_correctly(tmp_path):
    """Stored credentials decrypt to the correct path."""
    db_path = str(tmp_path / "test_product.sqlite")
    enc_key = "test-encryption-key-for-testing-only"

    with patch("backend.config.settings") as mock_settings:
        mock_settings.product_db_path = db_path
        mock_settings.encryption_key = enc_key

        from backend.product_db import database as db_module
        db_module._product_db = None

        from backend.product_db.migrations import init_product_db
        init_product_db()

        from seeders.bootstrap_connection import bootstrap
        bootstrap("/data/sample.duckdb")

    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT credentials_encrypted FROM connections").fetchone()
    conn.close()

    with patch("backend.config.settings") as mock_settings:
        mock_settings.encryption_key = enc_key
        creds = decrypt_credentials(row[0])

    assert creds == {"path": "/data/sample.duckdb"}


def test_bootstrap_idempotent(tmp_path):
    """Calling bootstrap twice does not create duplicate connections."""
    db_path = str(tmp_path / "test_product.sqlite")

    with patch("backend.config.settings") as mock_settings:
        mock_settings.product_db_path = db_path
        mock_settings.encryption_key = "test-encryption-key-for-testing-only"

        from backend.product_db import database as db_module
        db_module._product_db = None

        from backend.product_db.migrations import init_product_db
        init_product_db()

        from seeders.bootstrap_connection import bootstrap
        bootstrap("/data/sample.duckdb")
        bootstrap("/data/sample.duckdb")  # second call

    conn = sqlite3.connect(db_path)
    count = conn.execute("SELECT COUNT(*) FROM connections").fetchone()[0]
    conn.close()

    assert count == 1


def test_bootstrap_uses_custom_path(tmp_path):
    """Custom --path is stored in encrypted credentials."""
    db_path = str(tmp_path / "test_product.sqlite")
    enc_key = "test-encryption-key-for-testing-only"
    custom_path = "/custom/path/analytics.duckdb"

    with patch("backend.config.settings") as mock_settings:
        mock_settings.product_db_path = db_path
        mock_settings.encryption_key = enc_key

        from backend.product_db import database as db_module
        db_module._product_db = None

        from backend.product_db.migrations import init_product_db
        init_product_db()

        from seeders.bootstrap_connection import bootstrap
        bootstrap(custom_path)

    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT credentials_encrypted FROM connections").fetchone()
    conn.close()

    with patch("backend.config.settings") as mock_settings:
        mock_settings.encryption_key = enc_key
        creds = decrypt_credentials(row[0])

    assert creds == {"path": custom_path}
```

**Step 2: Run the tests and verify they pass**

```bash
cd /Users/carlo/my_work/stratifio && python -m pytest seeders/tests/test_bootstrap_connection.py -v
```

Expected: 4 tests PASS.

**Step 3: Commit**

```bash
git add seeders/tests/__init__.py seeders/tests/test_bootstrap_connection.py
git commit -m "test(docker): add tests for bootstrap_connection"
```

---

### Task 3: Wire bootstrap into `entrypoint.sh`

**Files:**
- Modify: `entrypoint.sh`

**Step 1: Read the current file**

Current `entrypoint.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SAMPLE_DB="/data/sample.duckdb"

if [ ! -f "$SAMPLE_DB" ]; then
  echo "[stratifio] Seeding sample analytics data (first run)…"
  DB_PATH_PREFIX=/data/sample \
  SEED_USERS=5000 \
  SEED_DAYS=90 \
  seed-duckdb
  echo "[stratifio] Seeding complete → $SAMPLE_DB"
fi

exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Step 2: Add bootstrap call after seeding**

Replace with:

```bash
#!/usr/bin/env bash
set -euo pipefail

SAMPLE_DB="/data/sample.duckdb"

if [ ! -f "$SAMPLE_DB" ]; then
  echo "[stratifio] Seeding sample analytics data (first run)…"
  DB_PATH_PREFIX=/data/sample \
  SEED_USERS=5000 \
  SEED_DAYS=90 \
  seed-duckdb
  echo "[stratifio] Seeding complete → $SAMPLE_DB"
fi

python -m seeders.bootstrap_connection --path "$SAMPLE_DB"

exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Key: `bootstrap_connection` runs on **every** startup (not just first run) — but it's idempotent, so it silently skips if the connection already exists. This handles the edge case where seeding succeeded but the bootstrap crashed.

**Step 3: Commit**

```bash
git add entrypoint.sh
git commit -m "feat(docker): run bootstrap_connection on every startup (idempotent)"
```

---

### Task 4: Smoke test end-to-end in Docker

**Step 1: Build the image**

```bash
cd /Users/carlo/my_work/stratifio && docker build -t stratifio:test .
```

Expected: build succeeds.

**Step 2: Run the container**

```bash
docker run --rm -d \
  --name stratifio_smoke \
  -p 8000:8000 \
  -e STRATIFIO_ENCRYPTION_KEY=testkeyfortestingonly1234567890ab \
  -e STRATIFIO_PRODUCT_DB_PATH=/data/stratifio_product.sqlite \
  -e STRATIFIO_CORS_ORIGINS=http://localhost:8000 \
  -v stratifio_test_data:/data \
  stratifio:test
```

**Step 3: Wait for startup and check logs**

```bash
sleep 25 && docker logs stratifio_smoke 2>&1 | grep -E "\[stratifio\]|Uvicorn"
```

Expected output includes:
```
[stratifio] Seeding sample analytics data (first run)…
[stratifio] Seeding complete → /data/sample.duckdb
[stratifio] Bootstrapped connection 'Sample DuckDB' → /data/sample.duckdb
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Step 4: Verify connection exists in the product DB**

```bash
docker exec stratifio_smoke python -c "
from backend.product_db.database import get_product_db
db = get_product_db()
rows = db.fetchall('SELECT name, db_type FROM connections')
for r in rows: print(dict(r))
"
```

Expected: `{'name': 'Sample DuckDB', 'db_type': 'duckdb'}`

**Step 5: Verify idempotency on restart**

```bash
docker restart stratifio_smoke
sleep 10
docker logs stratifio_smoke 2>&1 | grep "already exists"
```

Expected: `[stratifio] Connection 'Sample DuckDB' already exists — skipping.`

**Step 6: Clean up**

```bash
docker stop stratifio_smoke
docker volume rm stratifio_test_data
```

**Step 7: Commit any fixups found during smoke test**

```bash
git add -A && git commit -m "fix(docker): smoke test fixups for bootstrap_connection"
```
