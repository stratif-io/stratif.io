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
    id                       TEXT PRIMARY KEY,
    connection_id            TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    user_id_field            TEXT NOT NULL DEFAULT 'user_id',
    timestamp_field          TEXT NOT NULL DEFAULT 'timestamp',
    event_name_field         TEXT NOT NULL DEFAULT 'event_name',
    custom_properties        TEXT NOT NULL DEFAULT '[]',
    session_timeout_minutes  INTEGER NOT NULL DEFAULT 30,
    updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_filter_configs (
    id            TEXT PRIMARY KEY,
    connection_id TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filter_fields TEXT NOT NULL DEFAULT '[]',
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS auth_users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    display_name  TEXT,
    password_hash TEXT,
    google_id     TEXT UNIQUE,
    avatar_url    TEXT,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_google_id ON auth_users(google_id);
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


# ---------------------------------------------------------------------------
# Incremental migrations (safe to re-run)
# ---------------------------------------------------------------------------

_MIGRATIONS = [
    # 001 — session_timeout_minutes on schema configs
    "ALTER TABLE connection_schema_configs ADD COLUMN session_timeout_minutes INTEGER NOT NULL DEFAULT 30",
]


def run_migrations() -> None:
    """Apply incremental schema migrations; each is silently skipped if already applied."""
    import sqlite3

    db = get_product_db()
    conn = sqlite3.connect(db.db_path)
    try:
        for sql in _MIGRATIONS:
            try:
                conn.execute(sql)
            except sqlite3.OperationalError:
                pass  # column already exists
        conn.commit()
    finally:
        conn.close()
