"""Bootstrap a sample DuckDB connection into the product SQLite DB.

Run after seed-duckdb on first Docker startup. Idempotent — safe to call
multiple times; skips insertion if "Sample DuckDB" already exists.

Usage:
    python -m seeders.bootstrap_connection
    python -m seeders.bootstrap_connection --path /data/sample.duckdb
"""

import argparse
import sqlite3 as _sqlite3
import uuid
from datetime import UTC, datetime

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
        print(f"[openflow] Connection '{CONNECTION_NAME}' already exists — skipping.")
        return

    conn_id = str(uuid.uuid4())
    now = _now()
    credentials_encrypted = encrypt_credentials({"file_path": db_path})

    # Use a direct connection for atomic insertion of all three rows
    with _sqlite3.connect(db.db_path) as raw_conn:
        raw_conn.execute("PRAGMA foreign_keys=ON")
        raw_conn.execute(
            """
            INSERT INTO connections (id, name, db_type, credentials_encrypted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (conn_id, CONNECTION_NAME, "duckdb", credentials_encrypted, now, now),
        )
        raw_conn.execute(
            """
            INSERT INTO connection_schema_configs
                (id, connection_id, updated_at)
            VALUES (?, ?, ?)
            """,
            (str(uuid.uuid4()), conn_id, now),
        )
        raw_conn.execute(
            """
            INSERT INTO connection_filter_configs
                (id, connection_id, updated_at)
            VALUES (?, ?, ?)
            """,
            (str(uuid.uuid4()), conn_id, now),
        )

    print(f"[openflow] Bootstrapped connection '{CONNECTION_NAME}' → {db_path}")


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
