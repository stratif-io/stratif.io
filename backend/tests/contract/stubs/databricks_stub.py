"""DBAPI2-compatible Databricks stub backed by DuckDB in-memory.

Used in contract tests to validate connection flow, credential parsing,
and basic query shapes without a real Databricks workspace.
See KNOWN_LIMITATIONS.md for what this stub does NOT cover.
"""
from __future__ import annotations

import duckdb


class _Cursor:
    def __init__(self, conn: duckdb.DuckDBPyConnection) -> None:
        self._conn = conn
        self.description: list | None = None
        self._results: list[tuple] = []

    def execute(self, query: str, parameters: list | None = None) -> None:
        rel = self._conn.execute(query, parameters or [])
        self._results = rel.fetchall()
        desc = rel.description
        self.description = desc if desc else None

    def fetchall(self) -> list[tuple]:
        return self._results

    def close(self) -> None:
        pass


class _Connection:
    def __init__(self) -> None:
        self._db = duckdb.connect(":memory:")

    def cursor(self) -> _Cursor:
        return _Cursor(self._db)

    def close(self) -> None:
        self._db.close()


def connect(**kwargs) -> _Connection:  # noqa: ARG001
    """Drop-in replacement for databricks.sql.connect() backed by DuckDB."""
    return _Connection()
