"""Global analytics database connection management."""

import duckdb

from backend.config import settings

_conn: duckdb.DuckDBPyConnection | None = None


async def init_db() -> None:
    global _conn
    if settings.db_type == "duckdb":
        db_path = settings.db_url.replace("duckdb:///", "")
        _conn = duckdb.connect(db_path)


def get_db():
    if _conn is None:
        raise RuntimeError("Database not initialized")
    return _conn


def get_dialect() -> str:
    return settings.db_type
