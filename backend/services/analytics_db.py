"""Analytics database wrapper for stratif.io Analytics."""
import contextlib
from typing import TYPE_CHECKING, Any

import structlog
from fastapi import HTTPException

from backend.backends.base import DatabaseBackend
from backend.config import settings
from backend.services.pool import _pool_evict, _pool_get
from backend.services.sql_builder import json_extract_string

if TYPE_CHECKING:
    from collections.abc import Callable

    from backend.product_db import ProductDB

log = structlog.get_logger(__name__)


def _resolve_path_to_sql(path: str, dialect: str = "duckdb") -> str:
    """Legacy helper: kept for compatibility with callers that pass dialect strings."""
    parts = path.split(".")
    if dialect == "databricks":
        return ".".join(f"`{p}`" for p in parts)
    if len(parts) == 1:
        return f'"{parts[0]}"'
    col = parts[0]
    nested_key = ".".join(parts[1:])
    return json_extract_string(f'"{col}"', nested_key, dialect)


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


class AnalyticsDatabase:
    """Wraps a database connection and provides a uniform execute() interface."""

    def __init__(
        self,
        conn: Any,
        backend: DatabaseBackend,
        events_cte: str | None,
        filter_fields: list[dict] | None = None,
        filter_exprs: dict[str, str] | None = None,
        custom_props: list[dict] | None = None,
        custom_prop_exprs: dict[str, str] | None = None,
        session_timeout_minutes: int = 30,
        available_columns: frozenset[str] | None = None,
    ):
        self._conn = conn
        self._backend = backend
        self._filter_fields: list[dict] = filter_fields or []
        self._filter_exprs: dict[str, str] = filter_exprs or {}
        self._custom_props: list[dict] = custom_props or []
        self._custom_prop_exprs: dict[str, str] = custom_prop_exprs or {}
        self._session_timeout_minutes: int = session_timeout_minutes
        self._events_cte: str | None = events_cte
        self._available_columns: frozenset[str] | None = available_columns
        self._pooled: bool = False
        self._pool_key: tuple | None = None
        self._pool_factory: "Callable[[], Any] | None" = None

    def execute(self, query: str, params: list | None = None) -> list[tuple]:
        if self._events_cte:
            query = self._backend.prepend_events_cte(self._events_cte, query)
        if settings.log_sql:
            log.debug("sql_query", sql=query, params=params, dialect=self._backend.dialect_name)
        try:
            return self._backend.execute(self._conn, query, params)
        except Exception as exc:
            if self._pooled and self._backend.is_connection_error(exc):
                log.warning("stale_pooled_connection", pool_key=self._pool_key, error=str(exc))
                if self._pool_factory:
                    # Evict the dead connection and retry once with a fresh one.
                    _pool_evict(self._pool_key)
                    self._conn = _pool_get(self._pool_key, self._pool_factory)
                    try:
                        return self._backend.execute(self._conn, query, params)
                    except Exception as retry_exc:
                        raise HTTPException(
                            status_code=503, detail="Connection lost — please retry."
                        ) from retry_exc
                raise HTTPException(status_code=503, detail="Connection lost — please retry.") from exc
            raise

    def get_dialect(self) -> str:
        """Backward-compatible: returns dialect string for sql_builder callers."""
        return self._backend.dialect_name

    def table_exists(self, table_name: str) -> bool:
        return self._backend.table_exists(self._conn, table_name)

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

    def get_filter_exprs(self) -> dict[str, str]:
        return self._filter_exprs

    def get_filter_fields(self) -> list[dict]:
        return self._filter_fields

    def get_filter_options(self) -> dict[str, list[str]]:
        """Return distinct values for configured filter fields (one query per field)."""
        options: dict[str, list[str]] = {}
        for ff in self._filter_fields:
            field = ff["field"]
            expr = self._filter_exprs.get(field)
            if not expr:
                continue
            try:
                rows = self.execute(
                    f"SELECT {expr} AS v, COUNT(*) AS n FROM events "
                    f"WHERE {expr} IS NOT NULL GROUP BY {expr} ORDER BY n DESC LIMIT 200"
                )
                options[field] = [str(row[0]) for row in rows if row[0] is not None]
            except Exception:
                options[field] = []
        return options

    def get_field_options(self, field: str) -> list[str]:
        """Return distinct values for a field, sampling up to 50k rows for speed."""
        expr = self._filter_exprs.get(field) or self._custom_prop_exprs.get(field)
        if not expr:
            return []
        try:
            # Use a sampled subquery so JSON extractions on huge SQLite tables don't stall
            rows = self.execute(
                f"SELECT v, COUNT(*) AS n FROM "
                f"(SELECT {expr} AS v FROM events LIMIT 50000) t "
                f"WHERE v IS NOT NULL GROUP BY v ORDER BY n DESC LIMIT 200"
            )
            return sorted(str(row[0]) for row in rows if row[0] is not None)
        except Exception:
            return []

    def get_device_type_expr(self) -> str:
        if "device_type" in self._custom_prop_exprs:
            return self._custom_prop_exprs["device_type"]
        if self.has_column("properties"):
            return self._backend.json_extract_string("properties", "device_type")
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


def open_analytics_db(
    connection_id: str,
    product_db: "ProductDB",
    registry: "dict[str, DatabaseBackend]",
) -> AnalyticsDatabase:
    """Open a schema-mapped analytics DB for the given connection ID."""
    import json

    from backend.services.crypto import decrypt_credentials

    row = product_db.fetchone("SELECT * FROM connections WHERE id = ?", (connection_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    db_type: str = row["db_type"]
    if db_type not in registry:
        raise HTTPException(status_code=400, detail=f"Unsupported db_type: {db_type!r}")
    backend = registry[db_type]

    creds = decrypt_credentials(row["credentials_encrypted"])
    credentials = backend.parse_credentials(creds)

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

    dialect = backend.dialect_name
    needs_remap = (uid_f != "user_id" or ts_f != "timestamp" or en_f != "event_name" or events_table != "events")

    custom_prop_exprs: dict[str, str] = {
        p["name"]: _resolve_path_to_sql(p["path"], dialect)
        for p in custom_props
        if "name" in p and "path" in p
    }

    filter_row = product_db.fetchone(
        "SELECT * FROM connection_filter_configs WHERE connection_id = ?", (connection_id,)
    )
    filter_fields: list[dict] = json.loads(filter_row["filter_fields"]) if filter_row else []

    _iq = backend.identifier_quote_char
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

    events_cte = (
        backend.build_events_cte(events_table, uid_f, ts_f, en_f, custom_props)
        if needs_remap else None
    )

    if backend.use_pool:
        pool_key = backend.pool_key(connection_id, credentials)
        factory = lambda: backend.open(credentials, read_only=False)  # noqa: E731
        conn = _pool_get(pool_key, factory)
        cols = backend.get_table_columns(conn, f'{_iq}{events_table}{_iq}')
        db = AnalyticsDatabase(
            conn, backend, events_cte=events_cte, available_columns=cols or None, **shared_kwargs
        )
        db._pooled = True
        db._pool_key = pool_key
        db._pool_factory = factory
        return db

    conn = backend.open(credentials, read_only=True)
    cols = backend.get_table_columns(conn, f'{_iq}{events_table}{_iq}')
    return AnalyticsDatabase(
        conn, backend, events_cte=events_cte, available_columns=cols or None, **shared_kwargs
    )
