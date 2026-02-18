"""Database connection and query execution."""

import duckdb
import structlog
from typing import Optional
from contextlib import contextmanager

from openflow.config import get_settings

log = structlog.get_logger(__name__)


class Database:
    """Database connection manager for DuckDB."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path
        self._conn: Optional[duckdb.DuckDBPyConnection] = None

    @contextmanager
    def connection(self):
        """Context manager for database connections."""
        conn = duckdb.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()

    def _get_connection(self) -> duckdb.DuckDBPyConnection:
        """Get or create a persistent connection."""
        if self._conn is None:
            self._conn = duckdb.connect(self.db_path)
        return self._conn

    def close(self):
        """Close the persistent connection."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    def execute(self, query: str, params: Optional[list] = None) -> list[tuple]:
        """Execute a query and return results."""
        if get_settings().log_sql:
            log.debug("sql_query", sql=query, params=params)
        with self.connection() as conn:
            if params:
                return conn.execute(query, params).fetchall()
            return conn.execute(query).fetchall()

    def execute_many(self, query: str, params: list) -> None:
        """Execute a query with multiple parameter sets."""
        if get_settings().log_sql:
            log.debug("sql_executemany", sql=query, batch_size=len(params))
        conn = self._get_connection()
        conn.executemany(query, params)

    def execute_write(self, query: str, params: Optional[list] = None) -> None:
        """Execute a write query (INSERT, UPDATE, CREATE)."""
        if get_settings().log_sql:
            log.debug("sql_write", sql=query, params=params)
        conn = self._get_connection()
        if params:
            conn.execute(query, params)
        else:
            conn.execute(query)

    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists."""
        with self.connection() as conn:
            try:
                conn.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
                return True
            except Exception:
                return False

    def get_row_count(self, table_name: str) -> int:
        """Get row count for a table."""
        with self.connection() as conn:
            result = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
            return result[0] if result else 0

    # ------------------------------------------------------------------
    # Filter interface — fallback with no active filter dimensions.
    # AnalyticsDatabase overrides these with connection-specific logic.
    # ------------------------------------------------------------------

    def build_filter_clauses(self, filters: dict) -> tuple[list[str], list]:
        """Return (where_clauses, params) for the given filter dict."""
        return [], []

    def get_filter_fields(self) -> list[dict]:
        """Return enabled filter field descriptors for the active connection."""
        return []

    def get_filter_options(self) -> dict[str, list[str]]:
        """Return distinct values per enabled filter field."""
        return {}

    def get_custom_properties(self) -> list[dict]:
        """Return custom property descriptors for the active connection."""
        return {}

    def get_custom_prop_exprs(self) -> dict[str, str]:
        """Return {field_name -> sql_expr} for all custom properties."""
        return {}

    def get_session_timeout_minutes(self) -> int:
        """Return the session inactivity timeout in minutes."""
        return 30


_db: Optional[Database] = None


def get_db(file_path:Optional["str"]) -> Database:
    """Get the default database instance."""
    global _db
    if _db is None:
        _db = Database(file_path)
    return _db
