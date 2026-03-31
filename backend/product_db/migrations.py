"""Database schema initialization for the stratif.io product database."""

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
    id                        TEXT PRIMARY KEY,
    connection_id             TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    user_id_field             TEXT NOT NULL DEFAULT 'user_id',
    timestamp_field           TEXT NOT NULL DEFAULT 'timestamp',
    event_name_field          TEXT NOT NULL DEFAULT 'event_name',
    events_table              TEXT NOT NULL DEFAULT 'events',
    custom_properties         TEXT NOT NULL DEFAULT '[]',
    session_timeout_minutes   INTEGER NOT NULL DEFAULT 30,
    resurrection_window_days  INTEGER NOT NULL DEFAULT 30,
    power_user_threshold_days INTEGER NOT NULL DEFAULT 4,
    email_field               TEXT,
    first_name_field          TEXT,
    last_name_field           TEXT,
    date_of_birth_field       TEXT,
    phone_field               TEXT,
    pinned_metrics            TEXT NOT NULL DEFAULT '[]',
    updated_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS connection_filter_configs (
    id            TEXT PRIMARY KEY,
    connection_id TEXT UNIQUE NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    filter_fields TEXT NOT NULL DEFAULT '[]',
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""


def init_product_db(db=None) -> None:
    if db is None:
        from backend.product_db.deps import get_product_db
        db = get_product_db()
    db.executescript(SCHEMA)
    # Migrate existing connections table to allow clickhouse and snowflake db_types.
    # SQLite doesn't support ALTER COLUMN, so we recreate the table.
    # Guard: only run if the old CHECK constraint (without clickhouse/snowflake) is present.
    needs_migration = db.fetchone(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='connections' "
        "AND sql NOT LIKE '%clickhouse%'"
    )
    if needs_migration:
        db.executescript("""
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
    # Migrate: add resurrection_window_days, power_user_threshold_days, pinned_metrics
    existing_cols = db.fetchall("PRAGMA table_info(connection_schema_configs)")
    existing_names = {r["name"] for r in existing_cols}
    if "resurrection_window_days" not in existing_names:
        db.executescript(
            "ALTER TABLE connection_schema_configs ADD COLUMN resurrection_window_days INTEGER NOT NULL DEFAULT 30;"
        )
    if "power_user_threshold_days" not in existing_names:
        db.executescript(
            "ALTER TABLE connection_schema_configs ADD COLUMN power_user_threshold_days INTEGER NOT NULL DEFAULT 4;"
        )
    if "pinned_metrics" not in existing_names:
        db.executescript(
            "ALTER TABLE connection_schema_configs ADD COLUMN pinned_metrics TEXT NOT NULL DEFAULT '[]';"
        )
    for col in ("email_field", "first_name_field", "last_name_field",
                "date_of_birth_field", "phone_field"):
        if col not in existing_names:
            db.executescript(
                f"ALTER TABLE connection_schema_configs ADD COLUMN {col} TEXT;"
            )
