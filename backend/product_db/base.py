"""ProductDB Protocol — the interface all product database implementations must satisfy."""
from __future__ import annotations
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class ProductDB(Protocol):
    """Interface for the product database (stores connections, configs, users).

    All implementations must return dict-like rows from fetchall/fetchone
    (e.g. sqlite3.Row, psycopg2 RealDictCursor, psycopg3 dict_row) so callers
    can use row["column_name"] access.
    """

    def fetchall(self, query: str, params: tuple = ()) -> list[Any]: ...
    def fetchone(self, query: str, params: tuple = ()) -> Any | None: ...
    def execute(self, query: str, params: tuple = ()) -> Any: ...
    def executescript(self, script: str) -> None: ...
