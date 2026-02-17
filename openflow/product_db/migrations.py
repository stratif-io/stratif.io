"""Database schema initialization for the OpenFlow product database."""

from openflow.product_db.database import get_product_db

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    api_key_hash TEXT UNIQUE NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connections (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                  TEXT NOT NULL,
    db_type               TEXT NOT NULL CHECK(db_type IN ('duckdb', 'databricks', 'postgresql', 'sqlite')),
    credentials_encrypted TEXT NOT NULL,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_schema_configs (
    id                TEXT PRIMARY KEY,
    connection_id     TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    user_id_field     TEXT NOT NULL DEFAULT 'user_id',
    timestamp_field   TEXT NOT NULL DEFAULT 'timestamp',
    event_name_field  TEXT NOT NULL DEFAULT 'event_name',
    custom_properties TEXT NOT NULL DEFAULT '[]',
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_filter_configs (
    id            TEXT PRIMARY KEY,
    connection_id TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filter_fields TEXT NOT NULL DEFAULT '[]',
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""


def init_product_db() -> None:
    """Create all product database tables if they don't exist."""
    db = get_product_db()
    # executescript requires no active transaction; use direct connection
    import sqlite3

    conn = sqlite3.connect(db.db_path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
    print("✅ Product DB initialized")
