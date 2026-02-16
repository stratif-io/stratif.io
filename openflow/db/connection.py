"""Database connection and query execution."""

import duckdb
from typing import Optional
from contextlib import contextmanager

from openflow.config import get_settings


class Database:
    """Database connection manager for DuckDB."""

    def __init__(self, db_path: Optional[str] = None):
        settings = get_settings()
        self.db_path = db_path or settings.db_path
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
        with self.connection() as conn:
            if params:
                return conn.execute(query, params).fetchall()
            return conn.execute(query).fetchall()

    def execute_many(self, query: str, params: list) -> None:
        """Execute a query with multiple parameter sets."""
        conn = self._get_connection()
        conn.executemany(query, params)

    def execute_write(self, query: str, params: Optional[list] = None) -> None:
        """Execute a write query (INSERT, UPDATE, CREATE)."""
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


_db: Optional[Database] = None


def get_db() -> Database:
    """Get the default database instance."""
    global _db
    if _db is None:
        _db = Database()
    return _db
