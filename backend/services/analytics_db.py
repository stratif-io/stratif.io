"""Analytics database wrapper for OpenFlow Analytics."""

import contextlib
import re
import sqlite3 as _sqlite3
from typing import Any

import duckdb
import structlog
from fastapi import HTTPException

from backend.config import settings
from backend.services.pool import _is_connection_error, _pool_get
from backend.services.sql_builder import json_extract_string

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


def _resolve_path_to_sql(path: str, dialect: str = "duckdb") -> str:
    parts = path.split(".")
    if dialect == "databricks":
        return ".".join(f"`{p}`" for p in parts)
    if len(parts) == 1:
        return f'"{parts[0]}"'
    col = parts[0]
    nested_key = ".".join(parts[1:])
    return json_extract_string(f'"{col}"', nested_key, dialect)


def _to_named_params(query: str, params: list) -> tuple[str, dict]:
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
        rel = conn.execute(f"SELECT * FROM {table_expr} LIMIT 0")
        return frozenset(d[0] for d in rel.description)
    except Exception:
        return frozenset()


def _remap_exprs_for_available_cols(
    custom_props: list[dict],
    custom_prop_exprs: dict[str, str],
    available_columns: frozenset[str],
    dialect: str,
) -> dict[str, str]:
    if not available_columns:
        return custom_prop_exprs
    path_by_name = {p["name"]: p.get("path", "") for p in custom_props if "name" in p}
    result: dict[str, str] = {}
    for name, expr in custom_prop_exprs.items():
        path = path_by_name.get(name, "")
        parts = path.split(".")
        if len(parts) >= 2:
            root = parts[0]
            leaf = parts[-1]
            if root not in available_columns and leaf in available_columns:
                result[name] = _resolve_path_to_sql(leaf, dialect)
                continue
        result[name] = expr
    return result


def _prepend_events_cte(cte_body: str, query: str, dialect: str = "duckdb") -> str:
    q = query.strip()
    if dialect == "sqlite":
        return _EVENTS_REF_RE.sub(lambda m: f"{m.group(1)} {cte_body}", q)
    cte_def = f"events AS {cte_body}"
    m = re.match(r"(with\s+)", q, re.IGNORECASE)
    if m:
        return q[: m.end()] + cte_def + ", " + q[m.end() :]
    return f"WITH {cte_def} {q}"


# ---------------------------------------------------------------------------
# AnalyticsDatabase
# ---------------------------------------------------------------------------


class AnalyticsDatabase:
    """Wraps a database connection and provides a uniform execute() interface."""

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
        self._pooled: bool = False
        self._pool_key: tuple | None = None

    def execute(self, query: str, params: list | None = None) -> list[tuple]:
        if self._events_cte:
            query = _prepend_events_cte(self._events_cte, query, dialect=self._dialect)

        if settings.log_sql:
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
                    raise HTTPException(status_code=503, detail="Connection lost — please retry.") from exc
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
                    raise HTTPException(status_code=503, detail="Connection lost — please retry.") from exc
                raise
            finally:
                with contextlib.suppress(Exception):
                    cursor.close()

        # DuckDB
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
        from backend.services.sql_builder import json_extract_string as _jex
        if "device_type" in self._custom_prop_exprs:
            return self._custom_prop_exprs["device_type"]
        if self.has_column("properties"):
            return _jex("properties", "device_type", self._dialect)
        return "NULL"

    def has_column(self, col: str) -> bool:
        if self._available_columns is not None:
            return col in self._available_columns
        if col in ("user_id", "timestamp", "event_name"):
            return True
        if self._events_cte is None:
            return True
        root_cols = {p["path"].split(".")[0] for p in self._custom_props if "path" in p}
        return col in root_cols

    def close(self) -> None:
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
# Open analytics DB by connection ID (from product_db)
# ---------------------------------------------------------------------------


def open_analytics_db(connection_id: str) -> AnalyticsDatabase:
    """Open a schema-mapped analytics DB for the given connection ID."""
    import json

    from backend.product_db import get_product_db
    from backend.services.crypto import decrypt_credentials

    product_db = get_product_db()

    row = product_db.fetchone("SELECT * FROM connections WHERE id = ?", (connection_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    db_type: str = row["db_type"]
    creds = decrypt_credentials(row["credentials_encrypted"])
    file_path: str = creds.get("file_path") or creds.get("s3_path") or ""

    schema_row = product_db.fetchone(
        "SELECT * FROM connection_schema_configs WHERE connection_id = ?", (connection_id,)
    )
    uid_f = schema_row["user_id_field"] if schema_row else "user_id"
    ts_f = schema_row["timestamp_field"] if schema_row else "timestamp"
    en_f = schema_row["event_name_field"] if schema_row else "event_name"
    events_table = schema_row["events_table"] if schema_row and schema_row["events_table"] else "events"
    custom_props: list[dict] = json.loads(schema_row["custom_properties"]) if schema_row else []
    session_timeout_minutes: int = (
        schema_row["session_timeout_minutes"]
        if schema_row and schema_row["session_timeout_minutes"] is not None
        else 30
    )

    dialect = "postgres" if db_type == "postgresql" else db_type

    needs_remap = (
        uid_f != "user_id" or ts_f != "timestamp" or en_f != "event_name" or events_table != "events"
    )

    custom_prop_exprs: dict[str, str] = {
        p["name"]: _resolve_path_to_sql(p["path"], dialect)
        for p in custom_props
        if "name" in p and "path" in p
    }

    filter_row = product_db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (connection_id,)
    )
    filter_fields: list[dict] = json.loads(filter_row["filter_fields"]) if filter_row else []

    _iq = "`" if dialect == "databricks" else '"'
    filter_exprs: dict[str, str] = {}
    _src_to_std_name = {uid_f: "user_id", ts_f: "timestamp", en_f: "event_name"}
    for ff in filter_fields:
        field = ff.get("field", "")
        if field in custom_prop_exprs:
            filter_exprs[field] = custom_prop_exprs[field]
        elif field in (uid_f, ts_f, en_f):
            filter_exprs[field] = _src_to_std_name[field] if needs_remap else f"{_iq}{field}{_iq}"

    shared_kwargs: dict = {
        "filter_fields": filter_fields,
        "filter_exprs": filter_exprs,
        "custom_props": custom_props,
        "custom_prop_exprs": custom_prop_exprs,
        "session_timeout_minutes": session_timeout_minutes,
    }

    def _build_cte(table: str) -> str:
        q = "`" if dialect == "databricks" else '"'
        quoted_table = ".".join(f"{q}{p}{q}" for p in table.split("."))
        core = f"{q}{uid_f}{q} AS user_id, {q}{ts_f}{q} AS timestamp, {q}{en_f}{q} AS event_name"
        remapped_src = {uid_f, ts_f, en_f}
        excl = ", ".join(f"{q}{c}{q}" for c in sorted(remapped_src))
        if dialect == "databricks":
            return f"(SELECT {core}, * EXCEPT ({excl}) FROM {quoted_table})"
        if dialect == "duckdb":
            return f"(SELECT {core}, * EXCLUDE ({excl}) FROM {quoted_table})"
        extra_cols = sorted(
            {p["path"].split(".")[0] for p in custom_props if "path" in p} - remapped_src
        )
        extras = (", " + ", ".join(f"{q}{c}{q}" for c in extra_cols)) if extra_cols else ""
        return f"(SELECT {core}{extras} FROM {quoted_table})"

    if db_type == "postgresql":
        pool_key = (connection_id, "postgres")
        conn = _pool_get(pool_key, lambda: _open_pg(creds))
        events_cte = _build_cte(events_table) if needs_remap else None
        cols = _get_table_columns(conn, f'"{events_table}"', "postgres")
        db = AnalyticsDatabase(
            conn, dialect="postgres", events_cte=events_cte, available_columns=cols or None, **shared_kwargs
        )
        db._pooled = True
        db._pool_key = pool_key
        return db

    if db_type == "databricks":
        pool_key = (connection_id, "databricks")
        conn = _pool_get(pool_key, lambda: _open_databricks(creds))
        events_cte = _build_cte(events_table) if needs_remap else None
        cols = _get_table_columns(conn, f'`{events_table}`', "databricks")
        db = AnalyticsDatabase(
            conn, dialect="databricks", events_cte=events_cte, available_columns=cols or None, **shared_kwargs
        )
        db._pooled = True
        db._pool_key = pool_key
        return db

    if db_type == "sqlite":
        import os
        if not file_path:
            raise ValueError("SQLite connection is missing a file path")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"SQLite file not found: {file_path}")
        conn = _sqlite3.connect(file_path, check_same_thread=False)
        events_cte = _build_cte(events_table) if needs_remap else None
        cols = _get_table_columns(conn, f'"{events_table}"', "sqlite")
        return AnalyticsDatabase(
            conn, dialect="sqlite", events_cte=events_cte, available_columns=cols or None, **shared_kwargs
        )

    # DuckDB
    if not file_path:
        raise ValueError("DuckDB connection is missing a file path")
    import os
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"DuckDB file not found: {file_path}")
    conn = duckdb.connect(file_path, read_only=True)
    events_cte = _build_cte(events_table) if needs_remap else None
    cols = _get_table_columns(conn, f'"{events_table}"', "duckdb")
    return AnalyticsDatabase(
        conn, dialect="duckdb", events_cte=events_cte, available_columns=cols or None, **shared_kwargs
    )


def _open_pg(creds: dict):
    import psycopg2

    return psycopg2.connect(
        host=creds["host"],
        port=creds.get("port", 5432),
        dbname=creds["database"],
        user=creds["user"],
        password=creds["password"],
    )


def _open_databricks(creds: dict):
    from databricks import sql as dbsql

    return dbsql.connect(
        server_hostname=creds["host"],
        http_path=creds["http_path"],
        access_token=creds["token"],
    )
