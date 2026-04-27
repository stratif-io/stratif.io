"""DDL and DML helpers for the deterministic test dataset.

Opens write connections directly via the backend registry.
The API is NOT used here — this is raw DDL/DML.

Table name: deterministic_events
Columns:    user_id, timestamp, event_name, properties

Insertion policy
----------------
- Databricks MUST go through UC volume staging (Parquet → COPY INTO).
  Direct row-by-row INSERT is forbidden — it is orders of magnitude too slow.
  Credentials must include catalog, schema, and staging_volume.
- All other backends use row-by-row INSERT (acceptable speed for small test sets).
"""

from __future__ import annotations

import contextlib
from typing import Any

from services.analytics.backends import get_backend
from services.analytics.backends.base import DatabaseBackend
from services.analytics.tests.deterministic.dataset import EVENTS, TABLE_NAME

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
}
_INSERT_DEFAULT = f"INSERT INTO {TABLE_NAME} (user_id, timestamp, event_name, properties) VALUES (?, ?, ?, ?)"


def _make_credentials(db_type: str, cred_dict: dict) -> Any:
    """Instantiate the backend-specific credentials model."""
    if db_type == "duckdb":
        from services.analytics.backends.duckdb.credentials import DuckDBCredentials

        return DuckDBCredentials(**cred_dict)
    if db_type == "sqlite":
        from services.analytics.backends.sqlite.credentials import SQLiteCredentials

        return SQLiteCredentials(**cred_dict)
    if db_type == "postgresql":
        from services.analytics.backends.postgresql.credentials import (
            PostgreSQLCredentials,
        )

        return PostgreSQLCredentials(**cred_dict)
    if db_type == "clickhouse":
        from services.analytics.backends.clickhouse.credentials import (
            ClickHouseCredentials,
        )

        return ClickHouseCredentials(**cred_dict)
    if db_type == "snowflake":
        from services.analytics.backends.snowflake.credentials import (
            SnowflakeCredentials,
        )

        return SnowflakeCredentials(**cred_dict)
    if db_type == "databricks":
        from services.analytics.backends.databricks.credentials import (
            DatabricksCredentials,
        )

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


def insert_rows(
    backend: DatabaseBackend, conn: Any, cred_dict: dict | None = None
) -> None:
    """Insert all EVENTS rows into the table.

    Databricks MUST supply cred_dict with catalog / schema / staging_volume so
    data is staged via a UC volume (Parquet → COPY INTO).  Direct row-by-row
    INSERT is explicitly forbidden for Databricks — raise early rather than
    silently run for minutes.
    """
    dialect = backend.dialect_name

    if dialect == "databricks":
        if not cred_dict:
            raise ValueError(
                "Databricks insert_rows requires cred_dict with catalog, schema, "
                "and staging_volume.  Direct row-by-row INSERT is forbidden."
            )
        _insert_rows_databricks_volume(backend, conn, cred_dict)
        return

    sql = _INSERT_PROPS.get(dialect, _INSERT_DEFAULT)
    for row in EVENTS:
        backend.execute(
            conn,
            sql,
            [row["user_id"], row["timestamp"], row["event_name"], row["properties"]],
        )


def _insert_rows_databricks_volume(
    backend: DatabaseBackend, conn: Any, cred_dict: dict
) -> None:
    """Fast Databricks bulk insert via Unity Catalog volume staging.

    1. Serialise EVENTS to Parquet in memory using pyarrow.
    2. PUT the Parquet file to /Volumes/{catalog}/{schema}/{staging_volume}/seed.parquet
       via the SQL connector staging PUT (no Files API token scope required).
    3. COPY INTO the table from the volume path.

    Raises ValueError if catalog / schema / staging_volume are missing — there is
    no row-by-row fallback.
    """
    catalog = cred_dict.get("catalog")
    schema = cred_dict.get("schema") or cred_dict.get("schema_name")
    staging_volume = cred_dict.get("staging_volume")

    if not (catalog and schema and staging_volume):
        raise ValueError(
            f"Databricks seeding requires catalog, schema, and staging_volume in "
            f"credentials (got catalog={catalog!r}, schema={schema!r}, "
            f"staging_volume={staging_volume!r}).  "
            f"Add them to connections.yaml under databricks.credentials."
        )

    import io

    import databricks.sql as dsql
    import pyarrow as pa
    import pyarrow.parquet as pq

    host = cred_dict["host"]
    http_path = cred_dict["http_path"]
    token = cred_dict["token"]
    volume_path = (
        f"/Volumes/{catalog}/{schema}/{staging_volume}/deterministic_seed.parquet"
    )

    # --- Build Parquet in memory ---
    table = pa.table(
        {
            "user_id": pa.array([r["user_id"] for r in EVENTS], type=pa.string()),
            "timestamp": pa.array([r["timestamp"] for r in EVENTS], type=pa.string()),
            "event_name": pa.array([r["event_name"] for r in EVENTS], type=pa.string()),
            "properties": pa.array([r["properties"] for r in EVENTS], type=pa.string()),
        }
    )
    buf = io.BytesIO()
    pq.write_table(table, buf)
    buf.seek(0)

    # --- PUT via SQL connector staging (no Files API scope required) ---
    staging_conn = dsql.connect(
        server_hostname=host,
        http_path=http_path,
        access_token=token,
        staging_allowed_local_path="/tmp",
    )
    staging_cursor = staging_conn.cursor()
    try:
        staging_cursor.execute(
            f"PUT '__input_stream__' INTO '{volume_path}' OVERWRITE",
            input_stream=buf,
        )
    finally:
        staging_cursor.close()
        staging_conn.close()

    # --- COPY INTO ---
    # Parquet preserves column names; CAST timestamp string to TIMESTAMP at load time.
    copy_sql = f"""
        COPY INTO {TABLE_NAME}
        FROM (
            SELECT user_id, CAST(timestamp AS TIMESTAMP), event_name, properties
            FROM '{volume_path}'
        )
        FILEFORMAT = PARQUET
        COPY_OPTIONS ('force' = 'true')
    """
    backend.execute(conn, copy_sql, None)


def drop_table(backend: DatabaseBackend, conn: Any) -> None:
    backend.execute(conn, _DROP, None)
