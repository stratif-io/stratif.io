"""DBAPI2-compatible Databricks stub backed by DuckDB in-memory.

Used in contract tests to validate connection flow, credential parsing,
and basic query shapes without a real Databricks workspace.
See KNOWN_LIMITATIONS.md for what this stub does NOT cover.
"""
from __future__ import annotations

import re

import duckdb


def _adapt_query(query: str, parameters: dict | list | None) -> tuple[str, list]:
    """Translate Databricks SQL quirks to DuckDB-compatible SQL.

    1. Backtick identifiers -> double-quote identifiers.
    2. Named params (:p0, :p1, ...) -> positional ? with ordered values list.
    3. * EXCEPT (...) -> * EXCLUDE (...) for DuckDB compatibility.
    4. SHOW TABLES IN catalog.schema -> information_schema query.
    """
    # Backtick -> double-quote
    q = re.sub(r"`([^`]*)`", r'"\1"', query)

    # current_catalog() / current_database() stubs
    q = q.replace("current_catalog()", "'main'").replace("current_database()", "'main'")

    # SHOW TABLES IN "cat"."sch" -> DuckDB information_schema query
    show_tables_re = re.compile(
        r'SHOW\s+TABLES\s+IN\s+"[^"]*"\."([^"]*)"', re.IGNORECASE
    )
    def _show_tables_repl(m: re.Match) -> str:
        schema = m.group(1)
        return f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}'"
    q = show_tables_re.sub(_show_tables_repl, q)

    # Plain SHOW TABLES fallback
    q = re.sub(
        r'\bSHOW\s+TABLES\b',
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'",
        q,
        flags=re.IGNORECASE,
    )

    # * EXCEPT (...) -> * EXCLUDE (...) for DuckDB
    q = re.sub(r'\*\s+EXCEPT\s*\(', '* EXCLUDE (', q, flags=re.IGNORECASE)

    # Named params :p0, :p1, ... -> positional ?
    if isinstance(parameters, dict) and parameters:
        named_re = re.compile(r":p(\d+)\b")
        result = named_re.sub("?", q)
        ordered_keys = sorted(parameters.keys(), key=lambda k: int(k[1:]))
        positional_values = [parameters[k] for k in ordered_keys]
        return result, positional_values

    if isinstance(parameters, list):
        return q, parameters

    return q, []


class _Cursor:
    def __init__(self, conn: duckdb.DuckDBPyConnection) -> None:
        self._conn = conn
        self.description: list | None = None
        self._results: list[tuple] = []

    def execute(self, query: str, parameters: dict | list | None = None) -> None:
        adapted_query, adapted_params = _adapt_query(query, parameters)
        rel = self._conn.execute(adapted_query, adapted_params)
        self._results = rel.fetchall()
        desc = rel.description
        self.description = desc if desc else None

    def fetchall(self) -> list[tuple]:
        return self._results

    def fetchone(self) -> tuple | None:
        if self._results:
            return self._results[0]
        return None

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
