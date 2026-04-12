"""DDL and DML helpers for the deterministic test dataset.

Opens write connections directly via the backend registry.
The API is NOT used here — this is raw DDL/DML.

Table name: deterministic_events
Columns:    user_id, timestamp, event_name, properties
"""

from __future__ import annotations

import contextlib
from typing import Any

from backend.backends import get_backend
from backend.backends.base import DatabaseBackend
from backend.tests.deterministic.dataset import EVENTS, TABLE_NAME

# ---------------------------------------------------------------------------
# Per-dialect CREATE TABLE statements
# ---------------------------------------------------------------------------

_CREATE = {
    "duckdb": f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            user_id    VARCHAR,
            timestamp  TIMESTAMP,
            event_name VARCHAR,
            properties VARCHAR
        )
    """,
    "sqlite": f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            user_id    TEXT,
            timestamp  TEXT,
            event_name TEXT,
            properties TEXT
        )
    """,
    # PostgreSQL: JSONB so properties->>'key' operator works (see sql_builder.py "postgres" dialect)
    "postgres": f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            user_id    VARCHAR,
            timestamp  TIMESTAMP,
            event_name VARCHAR,
            properties JSONB
        )
    """,
    "clickhouse": f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            user_id    String,
            timestamp  DateTime,
            event_name String,
            properties String
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, user_id)
    """,
    # Snowflake: VARIANT so json_extract works via col:key::STRING syntax (see sql_builder.py)
    "snowflake": f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            user_id    VARCHAR,
            timestamp  TIMESTAMP_NTZ,
            event_name VARCHAR,
            properties VARIANT
        )
    """,
    "databricks": f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            user_id    STRING,
            timestamp  TIMESTAMP,
            event_name STRING,
            properties STRING
        )
    """,
}

_DROP = f"DROP TABLE IF EXISTS {TABLE_NAME}"

_INSERT_PROPS = {
    # Snowflake VARIANT requires PARSE_JSON to parse the JSON string at insert time
    "snowflake": f"INSERT INTO {TABLE_NAME} (user_id, timestamp, event_name, properties) VALUES (?, ?, ?, PARSE_JSON(?))",
    # PostgreSQL JSONB: backend.execute() converts ? → %s; ::jsonb casts the string to jsonb
    "postgres": f"INSERT INTO {TABLE_NAME} (user_id, timestamp, event_name, properties) VALUES (?, ?, ?, ?::jsonb)",
    # Databricks: inline param substitution passes strings; timestamp column needs explicit CAST
    "databricks": f"INSERT INTO {TABLE_NAME} (user_id, timestamp, event_name, properties) VALUES (?, CAST(? AS TIMESTAMP), ?, ?)",
}
_INSERT_DEFAULT = f"INSERT INTO {TABLE_NAME} (user_id, timestamp, event_name, properties) VALUES (?, ?, ?, ?)"


def _make_credentials(db_type: str, cred_dict: dict) -> Any:
    """Instantiate the backend-specific credentials model."""
    if db_type == "duckdb":
        from backend.backends.duckdb.credentials import DuckDBCredentials

        return DuckDBCredentials(**cred_dict)
    if db_type == "sqlite":
        from backend.backends.sqlite.credentials import SQLiteCredentials

        return SQLiteCredentials(**cred_dict)
    if db_type == "postgresql":
        from backend.backends.postgresql.credentials import PostgreSQLCredentials

        return PostgreSQLCredentials(**cred_dict)
    if db_type == "clickhouse":
        from backend.backends.clickhouse.credentials import ClickHouseCredentials

        return ClickHouseCredentials(**cred_dict)
    if db_type == "snowflake":
        from backend.backends.snowflake.credentials import SnowflakeCredentials

        return SnowflakeCredentials(**cred_dict)
    if db_type == "databricks":
        from backend.backends.databricks.credentials import DatabricksCredentials

        return DatabricksCredentials(**cred_dict)
    raise ValueError(f"Unknown db_type: {db_type!r}")


def open_write_connection(db_type: str, cred_dict: dict) -> tuple[DatabaseBackend, Any]:
    """Return (backend, conn) opened for writing."""
    backend = get_backend(db_type)
    creds = _make_credentials(db_type, cred_dict)
    conn = backend.open(creds, read_only=False)
    return backend, conn


def close_connection(backend: DatabaseBackend, conn: Any) -> None:
    """Close *conn* — best-effort, swallows errors."""
    with contextlib.suppress(Exception):
        conn.close()


def create_table(backend: DatabaseBackend, conn: Any) -> None:
    dialect = backend.dialect_name
    if dialect not in _CREATE:
        raise ValueError(f"No CREATE TABLE template for dialect {dialect!r}")
    backend.execute(conn, _CREATE[dialect], None)


def insert_rows(backend: DatabaseBackend, conn: Any) -> None:
    """Insert all EVENTS rows one at a time (batching via executemany not supported universally)."""
    dialect = backend.dialect_name
    sql = _INSERT_PROPS.get(dialect, _INSERT_DEFAULT)

    for row in EVENTS:
        backend.execute(
            conn,
            sql,
            [row["user_id"], row["timestamp"], row["event_name"], row["properties"]],
        )


def drop_table(backend: DatabaseBackend, conn: Any) -> None:
    backend.execute(conn, _DROP, None)
