"""Database backend registry."""
from __future__ import annotations

from backend.backends.base import DatabaseBackend

_REGISTRY: dict[str, "DatabaseBackend"] = {}


def get_backend(db_type: str) -> "DatabaseBackend":
    if db_type not in _REGISTRY:
        raise ValueError(f"Unsupported db_type: {db_type!r}")
    return _REGISTRY[db_type]


def _register(db_type: str, backend: "DatabaseBackend") -> None:
    _REGISTRY[db_type] = backend


from backend.backends.duckdb import DuckDBBackend  # noqa: E402
_register("duckdb", DuckDBBackend())

from backend.backends.sqlite import SQLiteBackend  # noqa: E402
_register("sqlite", SQLiteBackend())

from backend.backends.postgresql import PostgreSQLBackend  # noqa: E402
_register("postgresql", PostgreSQLBackend())
