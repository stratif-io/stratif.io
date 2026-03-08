"""Analytics database wrapper and FastAPI dependency for OpenFlow Analytics."""

import contextlib
import re
import sqlite3 as _sqlite3
import threading
import time
from collections.abc import Callable
from typing import Any

import duckdb
import structlog
from fastapi import HTTPException

from backend.config import settings
from backend.services.sql_builder import json_extract_string

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Connection pool (Databricks + PostgreSQL only)
# ---------------------------------------------------------------------------

_POOL_TTL = 600
_pool: dict[tuple, tuple[Any, float]] = {}
_pool_lock = threading.Lock()


def _pool_get(key: tuple, factory: Callable[[], Any]) -> Any:
    with _pool_lock:
        entry = _pool.get(key)
        if entry:
            conn, created_at = entry
            if time.monotonic() - created_at < _POOL_TTL:
                return conn
            with contextlib.suppress(Exception):
                conn.close()
        conn = factory()
        _pool[key] = (conn, time.monotonic())
        return conn


def _is_connection_error(exc: Exception, dialect: str) -> bool:
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
    parts = path.split(".")
    if dialect == "databricks":
        return ".".join(f"`{p}`" for p in parts)
    if len(parts) == 1:
        return f'"{parts[0]}"'
    col = parts[0]
    nested_key = ".".join(parts[1:])
    return json_extract_string(f'"{col}"', nested_key, dialect)


_EVENTS_REF_RE = re.compile(r"\b(FROM|JOIN)\s+events\b", re.IGNORECASE)


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
# FastAPI dependency — single-tenant, uses global DB from config
# ---------------------------------------------------------------------------


async def get_analytics_db():
    """FastAPI dependency: yields the analytics DB for the configured connection."""
    from backend.db import get_db, get_dialect

    conn = get_db()
    dialect = get_dialect()
    db = AnalyticsDatabase(conn=conn, dialect=dialect, events_cte=None)
    try:
        yield db
    finally:
        pass  # Global connection — do not close
