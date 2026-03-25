"""SQLite database manager for the stratif.io product database."""

import sqlite3
from contextlib import contextmanager


class SQLiteProductDB:
    """Manages the SQLite product database (connections, configs)."""

    def __init__(self, db_path: str):
        self.db_path = db_path

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def fetchall(self, query: str, params: tuple = ()) -> list[sqlite3.Row]:
        with self._conn() as conn:
            return conn.execute(query, params).fetchall()

    def fetchone(self, query: str, params: tuple = ()) -> sqlite3.Row | None:
        with self._conn() as conn:
            return conn.execute(query, params).fetchone()

    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._conn() as conn:
            return conn.execute(query, params)

    def executescript(self, script: str) -> None:
        with self._conn() as conn:
            conn.executescript(script)
