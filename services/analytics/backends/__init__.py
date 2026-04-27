"""Database backend registry."""

from __future__ import annotations

from services.analytics.backends.base import DatabaseBackend

_REGISTRY: dict[str, DatabaseBackend] = {}


def get_backend(db_type: str) -> DatabaseBackend:
    if db_type not in _REGISTRY:
        raise ValueError(f"Unsupported db_type: {db_type!r}")
    return _REGISTRY[db_type]


def _register(db_type: str, backend: DatabaseBackend) -> None:
    _REGISTRY[db_type] = backend


from services.analytics.backends.duckdb import DuckDBBackend  # noqa: E402

_register("duckdb", DuckDBBackend())

from services.analytics.backends.sqlite import SQLiteBackend  # noqa: E402

_register("sqlite", SQLiteBackend())

from services.analytics.backends.postgresql import PostgreSQLBackend  # noqa: E402

_register("postgresql", PostgreSQLBackend())

from services.analytics.backends.databricks import DatabricksBackend  # noqa: E402

_register("databricks", DatabricksBackend())

from services.analytics.backends.snowflake import SnowflakeBackend  # noqa: E402

_register("snowflake", SnowflakeBackend())

from services.analytics.backends.clickhouse import ClickHouseBackend  # noqa: E402

_register("clickhouse", ClickHouseBackend())
