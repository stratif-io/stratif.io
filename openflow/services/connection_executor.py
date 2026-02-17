"""Open target database connections with schema mapping applied for analytics queries."""

import json
import os
from typing import Optional

import duckdb
from fastapi import Depends, HTTPException, Query

from openflow.config import get_settings
from openflow.core.jwt_auth import AuthUserRow, get_current_auth_user
from openflow.db import get_db
from openflow.db.views import SESSION_VIEW_SQL, PATH_ANALYSIS_VIEW_SQL
from openflow.product_db import get_product_db
from openflow.services.crypto import decrypt_credentials


# ---------------------------------------------------------------------------
# SQL path resolution helpers
# ---------------------------------------------------------------------------


def _resolve_path_to_sql(path: str) -> str:
    """
    Convert a dot-notation property path to a SQL expression.

    Examples:
      "country"                → '"country"'
      "properties.country"     → "json_extract_string(\"properties\", 'country')"
      "ctx.campaign.source"    → "json_extract_string(\"ctx\", '$.campaign.source')"
    """
    parts = path.split(".")
    if len(parts) == 1:
        return f'"{parts[0]}"'
    col = parts[0]
    if len(parts) == 2:
        return f"json_extract_string(\"{col}\", '{parts[1]}')"
    json_path = "." + ".".join(parts[1:])
    return f"json_extract_string(\"{col}\", '${json_path}')"


# ---------------------------------------------------------------------------
# AnalyticsDatabase — in-memory DuckDB with schema-normalized views
# ---------------------------------------------------------------------------


class AnalyticsDatabase:
    """In-memory DuckDB with schema-normalized views and generic filter resolution."""

    def __init__(
        self,
        conn: duckdb.DuckDBPyConnection,
        filter_fields: Optional[list[dict]] = None,
        filter_exprs: Optional[dict[str, str]] = None,
        custom_props: Optional[list[dict]] = None,
        custom_prop_exprs: Optional[dict[str, str]] = None,
    ):
        self._conn = conn
        # filter_fields: list of {field, label, icon} dicts
        self._filter_fields: list[dict] = filter_fields or []
        # filter_exprs: {field_name -> sql_expression} built from schema config paths
        self._filter_exprs: dict[str, str] = filter_exprs or {}
        # custom_props: all custom properties ({name, path, type}) from schema config
        self._custom_props: list[dict] = custom_props or []
        # custom_prop_exprs: {name -> sql_expr} for all custom properties
        self._custom_prop_exprs: dict[str, str] = custom_prop_exprs or {}

    def execute(self, query: str, params: Optional[list] = None) -> list[tuple]:
        if params:
            return self._conn.execute(query, params).fetchall()
        return self._conn.execute(query).fetchall()

    def table_exists(self, table_name: str) -> bool:
        try:
            self._conn.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Generic filter interface
    # ------------------------------------------------------------------

    def build_filter_clauses(self, filters: dict) -> tuple[list[str], list]:
        """
        Given a dict of {field: value}, return (where_clauses, params) using
        the pre-built SQL expressions for each field.
        Unknown fields are silently ignored.
        """
        where_clauses: list[str] = []
        params: list = []
        for field, value in filters.items():
            if value and field in self._filter_exprs:
                where_clauses.append(f"{self._filter_exprs[field]} = ?")
                params.append(value)
        return where_clauses, params

    def get_filter_fields(self) -> list[dict]:
        """Return the enabled filter field descriptors for this connection."""
        return self._filter_fields

    def get_filter_options(self) -> dict[str, list[str]]:
        """Return top 50 most frequent non-null values per enabled filter field."""
        options: dict[str, list[str]] = {}
        for ff in self._filter_fields:
            field = ff["field"]
            expr = self._filter_exprs.get(field)
            if not expr:
                continue
            try:
                rows = self._conn.execute(
                    f"SELECT {expr} AS v, COUNT(*) AS n FROM events "
                    f"WHERE {expr} IS NOT NULL GROUP BY {expr} ORDER BY n DESC LIMIT 50"
                ).fetchall()
                options[field] = [str(row[0]) for row in rows if row[0] is not None]
            except Exception:
                options[field] = []
        return options

    def get_custom_properties(self) -> list[dict]:
        """Return all custom property descriptors from the schema config."""
        return self._custom_props

    def get_custom_prop_exprs(self) -> dict[str, str]:
        """Return {name -> sql_expr} for all custom properties."""
        return self._custom_prop_exprs


# ---------------------------------------------------------------------------
# View SQL helpers
# ---------------------------------------------------------------------------


def _build_events_view_sql(uid_f: str, ts_f: str, en_f: str, source_table: str = "events") -> str:
    """
    Build SQL to create a normalized `events` view with standard column names.
    DuckDB allows 'col AS col' (no-op alias) so identity mapping is safe.
    """
    src_cols = f'"{uid_f}", "{ts_f}", "{en_f}"'
    return f"""
        CREATE VIEW events AS
        SELECT
            "{uid_f}"  AS user_id,
            "{ts_f}"   AS "timestamp",
            "{en_f}"   AS event_name,
            * EXCLUDE ({src_cols})
        FROM src."{source_table}"
    """


# ---------------------------------------------------------------------------
# open_analytics_db
# ---------------------------------------------------------------------------


def open_analytics_db(connection_id: str, user_id: str) -> AnalyticsDatabase:
    """
    Open a schema-mapped in-memory DuckDB for analytics queries.
    Currently supports DuckDB file connections only.
    """
    product_db = get_product_db()

    # Load and validate connection ownership
    row = product_db.fetchone(
        "SELECT * FROM connections WHERE id = ? AND user_id = ?",
        (connection_id, user_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    if row["db_type"] != "duckdb":
        raise HTTPException(
            status_code=400,
            detail=f"Analytics currently requires a DuckDB connection (got {row['db_type']})",
        )

    # Decrypt credentials
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials") from exc

    file_path = creds.get("file_path") or creds.get("s3_path", ":memory:")

    # Load schema config (fall back to standard column names if not configured)
    schema_row = product_db.fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?",
        (connection_id,),
    )
    uid_f = schema_row["user_id_field"] if schema_row else "user_id"
    ts_f = schema_row["timestamp_field"] if schema_row else "timestamp"
    en_f = schema_row["event_name_field"] if schema_row else "event_name"
    custom_props: list[dict] = json.loads(schema_row["custom_properties"]) if schema_row else []

    # Build {field_name -> sql_expr} from custom properties
    custom_prop_exprs: dict[str, str] = {
        p["name"]: _resolve_path_to_sql(p["path"]) for p in custom_props if "name" in p and "path" in p
    }

    # Load filter config
    filter_row = product_db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?",
        (connection_id,),
    )
    filter_fields: list[dict] = json.loads(filter_row["filter_fields"]) if filter_row else []

    # Build filter_exprs: only include fields that have a resolved SQL expression
    filter_exprs: dict[str, str] = {}
    for ff in filter_fields:
        field = ff.get("field", "")
        if field in custom_prop_exprs:
            filter_exprs[field] = custom_prop_exprs[field]
        elif field in (uid_f, ts_f, en_f):
            # Core fields — map to their normalized names
            filter_exprs[field] = f'"{field}"'

    # If the target file is the same as the already-open default DB, skip ATTACH
    # (DuckDB raises a "Unique file handle conflict" if you try to attach an open file).
    settings = get_settings()
    if file_path != ":memory:" and os.path.abspath(file_path) == os.path.abspath(settings.db_path):
        db = get_db()
        # Wrap the default Database in an AnalyticsDatabase-compatible object by
        # returning a thin AnalyticsDatabase that delegates to the default connection.
        # Since the default DB already has the normalized views, open a fresh
        # in-memory connection and attach the file read-only from a second handle.
        # Actually: just return the default db with filter metadata patched in.
        # We monkeypatch the filter methods so API routes get the right behavior.
        db._filter_fields = filter_fields  # type: ignore[attr-defined]
        db._filter_exprs = filter_exprs  # type: ignore[attr-defined]
        db.build_filter_clauses = lambda filters: _build_filter_clauses_from_exprs(  # type: ignore[method-assign]
            filters, filter_exprs
        )
        db.get_filter_fields = lambda: filter_fields  # type: ignore[method-assign]
        db.get_filter_options = lambda: _get_filter_options_from_exprs_db(db, filter_fields, filter_exprs)  # type: ignore[method-assign]
        db.get_custom_properties = lambda: custom_props  # type: ignore[method-assign]
        db.get_custom_prop_exprs = lambda: custom_prop_exprs  # type: ignore[method-assign]
        return db  # type: ignore[return-value]

    # Open in-memory DuckDB, attach the source file read-only
    mem = duckdb.connect(":memory:")
    mem.execute(f"ATTACH '{file_path}' AS src (READ_ONLY)")

    # Create normalized events view
    mem.execute(_build_events_view_sql(uid_f, ts_f, en_f))

    # Create derived analytics views (reference the normalized events view above)
    mem.execute(SESSION_VIEW_SQL)
    mem.execute(PATH_ANALYSIS_VIEW_SQL)

    return AnalyticsDatabase(
        mem,
        filter_fields=filter_fields,
        filter_exprs=filter_exprs,
        custom_props=custom_props,
        custom_prop_exprs=custom_prop_exprs,
    )


def _build_filter_clauses_from_exprs(
    filters: dict, filter_exprs: dict[str, str]
) -> tuple[list[str], list]:
    where_clauses: list[str] = []
    params: list = []
    for field, value in filters.items():
        if value and field in filter_exprs:
            where_clauses.append(f"{filter_exprs[field]} = ?")
            params.append(value)
    return where_clauses, params


def _get_filter_options_from_exprs_db(
    db, filter_fields: list[dict], filter_exprs: dict[str, str]
) -> dict[str, list[str]]:
    """Compute filter options by querying `db` directly (used for the same-file shortcut)."""
    options: dict[str, list[str]] = {}
    for ff in filter_fields:
        field = ff.get("field", "")
        expr = filter_exprs.get(field)
        if not expr:
            continue
        try:
            rows = db.execute(
                f"SELECT {expr} AS v, COUNT(*) AS n FROM events "
                f"WHERE {expr} IS NOT NULL GROUP BY {expr} ORDER BY n DESC LIMIT 50"
            )
            options[field] = [str(row[0]) for row in rows if row[0] is not None]
        except Exception:
            options[field] = []
    return options


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


async def get_analytics_db(
    connection_id: Optional[str] = Query(None, description="Active connection ID"),
    current_user: AuthUserRow = Depends(get_current_auth_user),
):
    """
    FastAPI dependency: returns the analytics DB for the active connection.
    Resolves filter field metadata from the connection's filter config.
    Falls back to the first registered connection, then to the raw default DB.
    """
    user_id = current_user.id

    resolved_id = connection_id
    if not resolved_id:
        # Try to find the first connection registered for this user
        product_db = get_product_db()
        row = product_db.fetchone(
            "SELECT id FROM connections WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
            (user_id,),
        )
        if row:
            resolved_id = row["id"]

    if not resolved_id:
        return get_db()

    return open_analytics_db(resolved_id, user_id)
