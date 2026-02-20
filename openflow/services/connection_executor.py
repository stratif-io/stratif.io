"""Open target database connections with schema mapping applied for analytics queries."""

import json
import re
import sqlite3 as _sqlite3
from typing import Annotated, Any

import duckdb
import structlog
from fastapi import Depends, HTTPException, Query

from openflow.config import get_settings
from openflow.core.jwt_auth import AuthUserRow, get_current_auth_user
from openflow.product_db import get_product_db
from openflow.services.crypto import decrypt_credentials
from openflow.services.sql_builder import json_extract_string

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# SQL path resolution helpers
# ---------------------------------------------------------------------------


def _resolve_path_to_sql(path: str, dialect: str = "duckdb") -> str:
    """Convert a dot-notation property path to a SQL expression for the dialect.

    Examples:
        "country"             → '"country"'
        "properties.country"  → json_extract_string("properties", "country", dialect)
        "ctx.campaign.source" → json_extract_string("ctx", "campaign.source", dialect)
    """
    parts = path.split(".")
    if len(parts) == 1:
        return f'"{parts[0]}"'
    col = parts[0]
    nested_key = ".".join(parts[1:])
    return json_extract_string(f'"{col}"', nested_key, dialect)


# ---------------------------------------------------------------------------
# Events CTE injection
# ---------------------------------------------------------------------------


_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


def _prepend_events_cte(cte_body: str, query: str, dialect: str = "duckdb") -> str:
    """Apply schema-remapping CTE to *query*.

    For DuckDB: prepend 'events AS <cte_body>' as the first CTE so that
    the real table is shadowed transparently.

    For SQLite: SQLite raises "circular reference" when a CTE named
    'events' references the base table 'events'.  Instead, we inline the
    remapping subquery directly at every FROM/JOIN events reference site.
    This avoids the naming collision entirely.
    """
    q = query.strip()
    if dialect == "sqlite":
        return _EVENTS_REF_RE.sub(lambda m: f"{m.group(1)} {cte_body}", q)

    cte_def = f"events AS {cte_body}"
    m = re.match(r"(with\s+)", q, re.IGNORECASE)
    if m:
        return q[: m.end()] + cte_def + ", " + q[m.end() :]
    return f"WITH {cte_def} {q}"


# ---------------------------------------------------------------------------
# AnalyticsDatabase — dialect-aware wrapper over any DB connection
# ---------------------------------------------------------------------------


class AnalyticsDatabase:
    """Wraps a database connection (DuckDB or SQLite) and provides a uniform
    ``execute()`` interface.

    All queries in the API layer should be built with helpers from
    ``openflow.services.sql_builder`` so they are correct for the target
    dialect without any further transpilation.

    If *events_cte* is provided it is prepended to every query as a CTE
    that shadows the real ``events`` table, transparently remapping columns
    to the standard names (user_id, timestamp, event_name).
    """

    def __init__(
        self,
        conn: Any,
        dialect: str,
        events_cte: str | None,
        filter_fields: list[dict] | None = None,
        filter_exprs: dict[str, str] | None = None,
        custom_props: list[dict] | None = None,
        custom_prop_exprs: dict[str, str] | None = None,
        session_timeout_minutes: int = 30,
    ):
        self._conn = conn
        self._filter_fields: list[dict] = filter_fields or []
        self._filter_exprs: dict[str, str] = filter_exprs or {}
        self._custom_props: list[dict] = custom_props or []
        self._custom_prop_exprs: dict[str, str] = custom_prop_exprs or {}
        self._session_timeout_minutes: int = session_timeout_minutes
        self._dialect = dialect
        self._events_cte: str | None = events_cte

    # ------------------------------------------------------------------
    # Core query execution
    # ------------------------------------------------------------------

    def execute(self, query: str, params: list | None = None) -> list[tuple]:
        """Execute *query* against the underlying connection.

        The query must already be in the correct dialect for this connection.
        Use helpers from ``openflow.services.sql_builder`` when constructing
        queries that use dialect-sensitive constructs (DATE_TRUNC, intervals,
        JSON extract, etc.).

        If an *events_cte* was configured on this instance, it is prepended
        to every query before execution.
        """
        if self._events_cte:
            query = _prepend_events_cte(self._events_cte, query, dialect=self._dialect)

        if get_settings().log_sql:
            log.debug("sql_query", sql=query, params=params, dialect=self._dialect)

        if self._dialect == "sqlite":
            return list(self._conn.execute(query, params or []).fetchall())

        # DuckDB path
        if params:
            return self._conn.execute(query, params).fetchall()
        return self._conn.execute(query).fetchall()

    def get_dialect(self) -> str:
        return self._dialect

    def table_exists(self, table_name: str) -> bool:
        if self._dialect == "sqlite":
            rows = self._conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?",
                (table_name,),
            ).fetchall()
            return len(rows) > 0
        try:
            self._conn.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Generic filter interface
    # ------------------------------------------------------------------

    def build_filter_clauses(self, filters: dict) -> tuple[list[str], list]:
        where_clauses: list[str] = []
        params: list = []
        for field, value in filters.items():
            if value and field in self._custom_prop_exprs:
                where_clauses.append(f"{self._custom_prop_exprs[field]} = ?")
                params.append(value)
        return where_clauses, params

    def get_filter_fields(self) -> list[dict]:
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
                rows = self.execute(
                    f"SELECT {expr} AS v, COUNT(*) AS n FROM events "
                    f"WHERE {expr} IS NOT NULL GROUP BY {expr} ORDER BY n DESC LIMIT 50"
                )
                options[field] = [str(row[0]) for row in rows if row[0] is not None]
            except Exception:
                options[field] = []
        return options

    def get_custom_properties(self) -> list[dict]:
        return self._custom_props

    def get_custom_prop_exprs(self) -> dict[str, str]:
        return self._custom_prop_exprs

    def get_session_timeout_minutes(self) -> int:
        return self._session_timeout_minutes


# ---------------------------------------------------------------------------
# open_analytics_db
# ---------------------------------------------------------------------------


def open_analytics_db(connection_id: str, user_id: str) -> AnalyticsDatabase:
    """Open a schema-mapped analytics DB for the given connection.

    Supports DuckDB and SQLite.  Schema remapping (column renaming) is applied
    via an inline CTE at query time so no views need to be written to the DB.
    """
    product_db = get_product_db()

    row = product_db.fetchone(
        "SELECT * FROM connections WHERE id = ? AND user_id = ?",
        (connection_id, user_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    db_type: str = row["db_type"]
    if db_type not in ("duckdb", "sqlite"):
        raise HTTPException(
            status_code=400,
            detail=f"Analytics currently supports DuckDB and SQLite (got {db_type})",
        )

    # Decrypt credentials
    try:
        creds = decrypt_credentials(row["credentials_encrypted"])
    except ValueError as exc:
        raise HTTPException(
            status_code=500, detail="Failed to decrypt credentials"
        ) from exc

    file_path: str = creds.get("file_path") or creds.get("s3_path", ":memory:")

    # Load schema config
    schema_row = product_db.fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?",
        (connection_id,),
    )
    uid_f = schema_row["user_id_field"] if schema_row else "user_id"
    ts_f = schema_row["timestamp_field"] if schema_row else "timestamp"
    en_f = schema_row["event_name_field"] if schema_row else "event_name"
    custom_props: list[dict] = (
        json.loads(schema_row["custom_properties"]) if schema_row else []
    )
    session_timeout_minutes: int = (
        schema_row["session_timeout_minutes"]
        if schema_row and schema_row["session_timeout_minutes"] is not None
        else 30
    )

    # Resolve JSON path expressions using the target dialect
    dialect = db_type  # "duckdb" or "sqlite"

    custom_prop_exprs: dict[str, str] = {
        p["name"]: _resolve_path_to_sql(p["path"], dialect)
        for p in custom_props
        if "name" in p and "path" in p
    }

    filter_row = product_db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?",
        (connection_id,),
    )
    filter_fields: list[dict] = (
        json.loads(filter_row["filter_fields"]) if filter_row else []
    )

    filter_exprs: dict[str, str] = {}
    for ff in filter_fields:
        field = ff.get("field", "")
        if field in custom_prop_exprs:
            filter_exprs[field] = custom_prop_exprs[field]
        elif field in (uid_f, ts_f, en_f):
            filter_exprs[field] = f'"{field}"'

    shared_kwargs: dict[str, Any] = {
        "filter_fields": filter_fields,
        "filter_exprs": filter_exprs,
        "custom_props": custom_props,
        "custom_prop_exprs": custom_prop_exprs,
        "session_timeout_minutes": session_timeout_minutes,
    }

    # Build the events CTE body when column names differ from standard.
    needs_remap = uid_f != "user_id" or ts_f != "timestamp" or en_f != "event_name"

    # ---------------------------------------------------------------
    # SQLite path
    # ---------------------------------------------------------------
    if db_type == "sqlite":
        conn = _sqlite3.connect(file_path, check_same_thread=False)
        events_cte = (
            f'(SELECT "{uid_f}" AS user_id, "{ts_f}" AS timestamp, '
            f'"{en_f}" AS event_name, properties FROM "events")'
            if needs_remap
            else None
        )
        return AnalyticsDatabase(
            conn, dialect="sqlite", events_cte=events_cte, **shared_kwargs
        )

    # ---------------------------------------------------------------
    # DuckDB path — open file directly, read-only, no views written
    # ---------------------------------------------------------------
    if file_path == ":memory:":
        conn = duckdb.connect(":memory:")
        return AnalyticsDatabase(conn, dialect="duckdb", **shared_kwargs)

    conn = duckdb.connect(file_path, read_only=True)
    events_cte = (
        f'(SELECT "{uid_f}" AS user_id, "{ts_f}" AS timestamp, '
        f'"{en_f}" AS event_name, properties FROM "events")'
        if needs_remap
        else None
    )
    return AnalyticsDatabase(
        conn, dialect="duckdb", events_cte=events_cte, **shared_kwargs
    )


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


async def get_analytics_db(
    connection_id: str | None = Query(None, description="Active connection ID"),
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    """FastAPI dependency: returns the analytics DB for the active connection.

    Falls back to the first registered connection, then to the raw default DB.
    """
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = current_user.id

    resolved_id = connection_id
    if not resolved_id:
        product_db = get_product_db()
        row = product_db.fetchone(
            "SELECT id FROM connections WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
            (user_id,),
        )
        if row:
            resolved_id = row["id"]

    if not resolved_id:
        return None

    return open_analytics_db(resolved_id, user_id)
