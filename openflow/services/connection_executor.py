"""Open target database connections with schema mapping applied for analytics queries."""

import contextlib
import json
import re
import sqlite3 as _sqlite3
import threading
import time
from collections.abc import Callable
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
# Connection pool (Databricks + PostgreSQL only — file-based DBs are cheap)
# ---------------------------------------------------------------------------

_POOL_TTL = 600  # seconds before a pooled connection is recycled
_pool: dict[tuple, tuple[Any, float]] = {}  # key → (raw_conn, created_at)
_pool_lock = threading.Lock()


def _pool_get(key: tuple, factory: Callable[[], Any]) -> Any:  # type: ignore[name-defined]
    """Return a cached connection, creating a new one if absent or expired."""
    with _pool_lock:
        entry = _pool.get(key)
        if entry:
            conn, created_at = entry
            if time.monotonic() - created_at < _POOL_TTL:
                return conn
            # Expired — evict silently
            with contextlib.suppress(Exception):
                conn.close()
        conn = factory()
        _pool[key] = (conn, time.monotonic())
        return conn


def evict_connection(connection_id: str, user_id: str) -> None:
    """Remove a pooled connection, e.g. after a credential change."""
    for dialect in ("databricks", "postgres"):
        key = (connection_id, user_id, dialect)
        with _pool_lock:
            entry = _pool.pop(key, None)
        if entry:
            with contextlib.suppress(Exception):
                entry[0].close()


# ---------------------------------------------------------------------------
# SQL path resolution helpers
# ---------------------------------------------------------------------------


def _is_connection_error(exc: Exception, dialect: str) -> bool:
    """Return True if exc is a known driver-level connection error."""
    if dialect == "databricks":
        try:
            from databricks.sql.exc import Error as _DatabricksError

            if isinstance(exc, _DatabricksError):
                return True
        except ImportError:
            pass
    if dialect == "postgres":
        try:
            import psycopg2

            if isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError)):
                return True
        except ImportError:
            pass
    return False


def _resolve_path_to_sql(path: str, dialect: str = "duckdb") -> str:
    """Convert a dot-notation property path to a SQL expression for the dialect.

    For Databricks, STRUCT fields are accessed with backtick dot notation
    (col.`field`.`subfield`) rather than JSON extraction. JSON string / VARIANT
    columns fall back to get_json_object() via json_extract_string().

    Examples (DuckDB/SQLite):
        "country"             → '"country"'
        "properties.country"  → json_extract_string("properties", "country", dialect)
        "ctx.campaign.source" → json_extract_string("ctx", "campaign.source", dialect)

    Examples (Databricks):
        "country"             → '`country`'
        "properties.country"  → '`properties`.`country`'  (STRUCT dot access)
        "ctx.campaign.source" → '`ctx`.`campaign`.`source`'
    """
    parts = path.split(".")
    if dialect == "databricks":
        return ".".join(f"`{p}`" for p in parts)
    if len(parts) == 1:
        return f'"{parts[0]}"'
    col = parts[0]
    nested_key = ".".join(parts[1:])
    return json_extract_string(f'"{col}"', nested_key, dialect)


# ---------------------------------------------------------------------------
# Events CTE injection
# ---------------------------------------------------------------------------


_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


def _to_named_params(query: str, params: list) -> tuple[str, dict]:
    """Convert ``?`` placeholders in *query* to Databricks named parameters.

    Returns the rewritten query (``?`` → ``:p0``, ``:p1``, …) and a dict
    mapping parameter names to their values.  Databricks connector v4+ uses
    ``paramstyle='named'``.
    """
    named: dict[str, Any] = {}
    parts = query.split("?")
    result: list[str] = [parts[0]]
    for i, part in enumerate(parts[1:]):
        key = f"p{i}"
        named[key] = params[i] if i < len(params) else None
        result.append(f":{key}")
        result.append(part)
    return "".join(result), named


def _get_table_columns(conn: Any, table_expr: str, dialect: str) -> frozenset[str]:
    """Return the set of column names for *table_expr* via a zero-row query."""
    try:
        if dialect == "sqlite":
            cursor = conn.execute(f"SELECT * FROM {table_expr} LIMIT 0")
            return frozenset(d[0] for d in cursor.description or [])
        if dialect in ("postgres", "databricks"):
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_expr} LIMIT 0")
                return frozenset(d[0] for d in cursor.description or [])
            finally:
                cursor.close()
        # DuckDB
        rel = conn.execute(f"SELECT * FROM {table_expr} LIMIT 0")
        return frozenset(d[0] for d in rel.description)
    except Exception:
        return frozenset()


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
        available_columns: frozenset[str] | None = None,
    ):
        self._conn = conn
        self._filter_fields: list[dict] = filter_fields or []
        self._filter_exprs: dict[str, str] = filter_exprs or {}
        self._custom_props: list[dict] = custom_props or []
        self._custom_prop_exprs: dict[str, str] = custom_prop_exprs or {}
        self._session_timeout_minutes: int = session_timeout_minutes
        self._dialect = dialect
        self._events_cte: str | None = events_cte
        self._available_columns: frozenset[str] | None = available_columns
        self._pooled: bool = False  # set True for connections owned by the pool
        self._pool_key: tuple | None = None

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

        if self._dialect == "postgres":
            if params:
                query = query.replace("?", "%s")
            cursor = self._conn.cursor()
            try:
                cursor.execute(query, params or None)
                return cursor.fetchall()
            except Exception as exc:
                if self._pooled and _is_connection_error(exc, "postgres"):
                    if self._pool_key:
                        evict_connection(self._pool_key[0], self._pool_key[1])
                    raise HTTPException(
                        status_code=503,
                        detail="Connection lost — please retry.",
                    ) from exc
                raise
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()

        if self._dialect == "databricks":
            named_query, named_params = _to_named_params(query, params or [])
            cursor = self._conn.cursor()
            try:
                cursor.execute(named_query, named_params or None)
                return cursor.fetchall()
            except Exception as exc:
                if self._pooled and _is_connection_error(exc, "databricks"):
                    if self._pool_key:
                        evict_connection(self._pool_key[0], self._pool_key[1])
                    raise HTTPException(
                        status_code=503,
                        detail="Connection lost — please retry.",
                    ) from exc
                raise
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()

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
            self.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
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
            if not value or field not in self._custom_prop_exprs:
                continue
            expr = self._custom_prop_exprs[field]
            values = [v for v in str(value).split("|") if v]
            if len(values) > 1:
                placeholders = ", ".join("?" * len(values))
                where_clauses.append(f"{expr} IN ({placeholders})")
                params.extend(values)
            else:
                where_clauses.append(f"{expr} = ?")
                params.append(values[0])
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

    def get_device_type_expr(self) -> str:
        """Return the SQL expression for device_type based on custom properties."""
        from openflow.services.sql_builder import json_extract_string as _jex

        if "device_type" in self._custom_prop_exprs:
            return self._custom_prop_exprs["device_type"]
        if self.has_column("properties"):
            return _jex("properties", "device_type", self._dialect)
        return "NULL"

    def has_column(self, col: str) -> bool:
        """Return True if *col* is present in the events table/CTE.

        Uses real schema introspection when available (_available_columns),
        otherwise falls back to conservative heuristics.
        """
        if self._available_columns is not None:
            return col in self._available_columns
        # Fallback heuristic: standard cols always present; raw table assumed complete
        if col in ("user_id", "timestamp", "event_name"):
            return True
        if self._events_cte is None:
            return True
        root_cols = {p["path"].split(".")[0] for p in self._custom_props if "path" in p}
        return col in root_cols

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the underlying connection.

        Pooled connections (Databricks/PostgreSQL) are not closed here —
        the pool manages their lifecycle.
        """
        if self._pooled:
            return
        with contextlib.suppress(Exception):
            self._conn.close()

    def __enter__(self) -> "AnalyticsDatabase":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def get_custom_prop_exprs(self) -> dict[str, str]:
        return self._custom_prop_exprs

    def get_custom_properties(self) -> list[dict]:
        return self._custom_props

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
    if db_type not in ("duckdb", "sqlite", "postgresql", "databricks"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported db type for analytics: {db_type}",
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
    events_table: str = (
        schema_row["events_table"]
        if schema_row and schema_row["events_table"]
        else "events"
    )
    custom_props: list[dict] = (
        json.loads(schema_row["custom_properties"]) if schema_row else []
    )
    session_timeout_minutes: int = (
        schema_row["session_timeout_minutes"]
        if schema_row and schema_row["session_timeout_minutes"] is not None
        else 30
    )

    # Normalise dialect: postgresql driver uses "postgres" in sql_builder
    dialect = "postgres" if db_type == "postgresql" else db_type

    needs_remap = (
        uid_f != "user_id"
        or ts_f != "timestamp"
        or en_f != "event_name"
        or events_table != "events"
    )

    custom_prop_exprs: dict[str, str] = {
        p["name"]: _resolve_path_to_sql(p["path"], dialect)
        for p in custom_props
        if "name" in p and "path" in p
    }

    # When columns are remapped via CTE, any custom property expression that
    # references a source column by its original name will break — the CTE
    # renames those columns to the standard names (user_id / timestamp /
    # event_name).  Replace affected expressions with the standard name.
    if needs_remap:
        _src_to_std = {
            _resolve_path_to_sql(uid_f, dialect): "user_id",
            _resolve_path_to_sql(ts_f, dialect): "timestamp",
            _resolve_path_to_sql(en_f, dialect): "event_name",
        }
        custom_prop_exprs = {
            k: _src_to_std.get(v, v) for k, v in custom_prop_exprs.items()
        }

    filter_row = product_db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?",
        (connection_id,),
    )
    filter_fields: list[dict] = (
        json.loads(filter_row["filter_fields"]) if filter_row else []
    )

    _iq = "`" if dialect == "databricks" else '"'  # identifier quote char
    _src_to_std_name = {uid_f: "user_id", ts_f: "timestamp", en_f: "event_name"}
    filter_exprs: dict[str, str] = {}
    for ff in filter_fields:
        field = ff.get("field", "")
        if field in custom_prop_exprs:
            filter_exprs[field] = custom_prop_exprs[field]
        elif field in (uid_f, ts_f, en_f):
            # When CTE remapping is active, the source column has been aliased
            # to its standard name — use that; otherwise quote the field directly.
            filter_exprs[field] = (
                _src_to_std_name[field] if needs_remap else f"{_iq}{field}{_iq}"
            )

    shared_kwargs: dict[str, Any] = {
        "filter_fields": filter_fields,
        "filter_exprs": filter_exprs,
        "custom_props": custom_props,
        "custom_prop_exprs": custom_prop_exprs,
        "session_timeout_minutes": session_timeout_minutes,
    }

    def _build_shared_kwargs_with_columns(conn: Any) -> dict[str, Any]:
        _iq2 = "`" if dialect == "databricks" else '"'
        quoted_table = ".".join(f"{_iq2}{p}{_iq2}" for p in events_table.split("."))
        cols = _get_table_columns(conn, quoted_table, dialect)
        return {**shared_kwargs, "available_columns": cols or None}

    def _build_cte(table: str) -> str:
        q = "`" if dialect == "databricks" else '"'
        quoted_table = ".".join(f"{q}{p}{q}" for p in table.split("."))

        core = (
            f"{q}{uid_f}{q} AS user_id, "
            f"{q}{ts_f}{q} AS timestamp, "
            f"{q}{en_f}{q} AS event_name"
        )

        # Exclude remapped source columns from * to prevent duplicate column names.
        remapped_src = {uid_f, ts_f, en_f}
        excl = ", ".join(f"{q}{c}{q}" for c in sorted(remapped_src))

        if dialect == "databricks":
            return f"(SELECT {core}, * EXCEPT ({excl}) FROM {quoted_table})"
        if dialect == "duckdb":
            return f"(SELECT {core}, * EXCLUDE ({excl}) FROM {quoted_table})"

        # PostgreSQL / SQLite: no native column-exclusion syntax.
        # Select core aliases + any extra columns needed by custom properties
        # (root column names that aren't the remapped source columns).
        extra_cols = sorted(
            {p["path"].split(".")[0] for p in custom_props if "path" in p}
            - remapped_src
        )
        extras = (
            (", " + ", ".join(f"{q}{c}{q}" for c in extra_cols)) if extra_cols else ""
        )
        return f"(SELECT {core}{extras} FROM {quoted_table})"

    # ---------------------------------------------------------------
    # PostgreSQL path  (pooled)
    # ---------------------------------------------------------------
    if db_type == "postgresql":
        pool_key = (connection_id, user_id, "postgres")
        conn = _pool_get(pool_key, lambda: _open_analytics_db_pg(creds))
        events_cte = _build_cte(events_table) if needs_remap else None
        db = AnalyticsDatabase(
            conn,
            dialect="postgres",
            events_cte=events_cte,
            **_build_shared_kwargs_with_columns(conn),
        )
        db._pooled = True
        db._pool_key = pool_key
        return db

    # ---------------------------------------------------------------
    # Databricks path  (pooled)
    # ---------------------------------------------------------------
    if db_type == "databricks":
        pool_key = (connection_id, user_id, "databricks")
        conn = _pool_get(pool_key, lambda: _open_analytics_db_databricks(creds))
        events_cte = _build_cte(events_table) if needs_remap else None
        db = AnalyticsDatabase(
            conn,
            dialect="databricks",
            events_cte=events_cte,
            **_build_shared_kwargs_with_columns(conn),
        )
        db._pooled = True
        db._pool_key = pool_key
        return db

    # ---------------------------------------------------------------
    # SQLite path
    # ---------------------------------------------------------------
    if db_type == "sqlite":
        conn = _sqlite3.connect(file_path, check_same_thread=False)
        events_cte = _build_cte(events_table) if needs_remap else None
        return AnalyticsDatabase(
            conn,
            dialect="sqlite",
            events_cte=events_cte,
            **_build_shared_kwargs_with_columns(conn),
        )

    # ---------------------------------------------------------------
    # DuckDB path — open file directly, read-only, no views written
    # ---------------------------------------------------------------
    if file_path == ":memory:":
        conn = duckdb.connect(":memory:")
        return AnalyticsDatabase(conn, dialect="duckdb", **shared_kwargs)

    conn = duckdb.connect(file_path, read_only=True)
    events_cte = _build_cte(events_table) if needs_remap else None
    return AnalyticsDatabase(
        conn,
        dialect="duckdb",
        events_cte=events_cte,
        **_build_shared_kwargs_with_columns(conn),
    )


def _open_analytics_db_pg(creds: dict) -> Any:
    import psycopg2

    return psycopg2.connect(
        host=creds["host"],
        port=creds.get("port", 5432),
        dbname=creds["database"],
        user=creds["user"],
        password=creds["password"],
    )


def _open_analytics_db_databricks(creds: dict) -> Any:
    from databricks import sql as dbsql

    return dbsql.connect(
        server_hostname=creds["host"],
        http_path=creds["http_path"],
        access_token=creds["token"],
    )


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


async def get_analytics_db(
    connection_id: str | None = Query(None, description="Active connection ID"),
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    """FastAPI dependency: yields the analytics DB for the active connection.

    Falls back to the first registered connection, then to the raw default DB.
    Connection is closed automatically after the request completes.
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
        raise HTTPException(
            status_code=503, detail="No analytics connection configured."
        )

    db = open_analytics_db(resolved_id, user_id)
    try:
        yield db
    finally:
        db.close()
