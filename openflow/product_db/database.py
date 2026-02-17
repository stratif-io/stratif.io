"""SQLite database manager for the OpenFlow product database."""

import sqlite3
from contextlib import contextmanager
from typing import Optional

from openflow.config import get_settings


class ProductDatabase:
    """Manages the SQLite product database (users, connections, configs)."""

    def __init__(self, db_path: Optional[str] = None):
        settings = get_settings()
        self.db_path = db_path or settings.product_db_path

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

    def fetchone(self, query: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        with self._conn() as conn:
            return conn.execute(query, params).fetchone()

    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._conn() as conn:
            return conn.execute(query, params)

    def executescript(self, script: str) -> None:
        with self._conn() as conn:
            conn.executescript(script)


_product_db: Optional[ProductDatabase] = None


def get_product_db() -> ProductDatabase:
    global _product_db
    if _product_db is None:
        _product_db = ProductDatabase()
    return _product_db
