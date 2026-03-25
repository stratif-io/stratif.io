"""Database schema initialization for the stratif.io product database."""

import sqlite3

from backend.product_db.database import SQLiteProductDB
from backend.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS connections (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    db_type               TEXT NOT NULL CHECK(db_type IN ('duckdb', 'databricks', 'postgresql', 'sqlite', 'clickhouse', 'snowflake')),
    credentials_encrypted TEXT NOT NULL,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_schema_configs (
    id                      TEXT PRIMARY KEY,
    connection_id           TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    user_id_field           TEXT NOT NULL DEFAULT 'user_id',
    timestamp_field         TEXT NOT NULL DEFAULT 'timestamp',
    event_name_field        TEXT NOT NULL DEFAULT 'event_name',
    events_table            TEXT NOT NULL DEFAULT 'events',
    custom_properties       TEXT NOT NULL DEFAULT '[]',
    session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_filter_configs (
    id            TEXT PRIMARY KEY,
    connection_id TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    filter_fields TEXT NOT NULL DEFAULT '[]',
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""


def init_product_db() -> None:
    db = SQLiteProductDB(settings.product_db_path)
    conn = sqlite3.connect(db.db_path)
    try:
        conn.executescript(SCHEMA)
        # Migrate existing connections table to allow clickhouse and snowflake db_types.
        # SQLite doesn't support ALTER COLUMN, so we recreate the table.
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS connections_new (
                id                    TEXT PRIMARY KEY,
                name                  TEXT NOT NULL,
                db_type               TEXT NOT NULL CHECK(db_type IN ('duckdb', 'databricks', 'postgresql', 'sqlite', 'clickhouse', 'snowflake')),
                credentials_encrypted TEXT NOT NULL,
                created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            );
            INSERT OR IGNORE INTO connections_new SELECT * FROM connections;
            DROP TABLE connections;
            ALTER TABLE connections_new RENAME TO connections;
        """)
        conn.commit()
    finally:
        conn.close()
