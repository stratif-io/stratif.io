"""Async SQLAlchemy engine and session factory for the stratif.io product database."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config import settings
from backend.product_db.base import Base

_PRODUCT_DB_TABLES = [
    "connections",
    "connection_schema_configs",
    "connection_filter_configs",
    "connection_custom_properties",
    "connection_pinned_metrics",
    "connection_filter_fields",
]

# Columns that may be missing on existing on-disk product DBs that were created
# before the column was introduced. Each entry: (table, column, sql_type, default).
# SQLite supports ``ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT <const>``,
# so this doubles as both the DDL and the backfill value for existing rows.
_ENSURE_COLUMNS: list[tuple[str, str, str, str]] = [
    ("connection_schema_configs", "query_timeout_seconds", "INTEGER", "10"),
    ("connection_schema_configs", "max_concurrent_queries", "INTEGER", "5"),
    ("connection_filter_fields", "ref", "TEXT", "''"),
]


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        url = str(settings.product_db_url)
        if url.startswith("postgresql"):
            connect_args = {"server_settings": {"search_path": "app"}}
        else:
            connect_args = {}
        _engine = create_async_engine(
            url, echo=settings.log_sql, connect_args=connect_args
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(_get_engine(), expire_on_commit=False)
    return _session_factory


def reset_engine() -> None:
    """Reset cached engine and factory. Call after changing settings in tests."""
    global _engine, _session_factory
    _engine = None
    _session_factory = None


async def close_product_db() -> None:
    """Dispose the async engine. Call during application shutdown."""
    global _engine, _session_factory
    engine = _engine
    _engine = None
    _session_factory = None
    if engine is not None:
        await engine.dispose()


async def init_product_db() -> None:
    """Create all tables. Safe to call on every startup (CREATE TABLE IF NOT EXISTS)."""
    engine = _get_engine()
    if engine.dialect.name == "sqlite":
        db_path = urlparse(str(settings.product_db_url)).path.lstrip("/")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    is_postgres = engine.dialect.name == "postgresql"
    async with engine.begin() as conn:
        if is_postgres:
            await conn.execute(text("CREATE SCHEMA IF NOT EXISTS app"))
            # Migrate existing tables from public → app on stg/prod (idempotent)
            for table in _PRODUCT_DB_TABLES:
                await conn.execute(
                    text(f"""
                    DO $$ BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = 'public' AND table_name = '{table}'
                        ) THEN
                            EXECUTE 'ALTER TABLE public.{table} SET SCHEMA app';
                        END IF;
                    END $$;
                """)
                )
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_columns(conn, is_postgres=is_postgres)


async def _ensure_columns(conn, *, is_postgres: bool) -> None:
    """Add columns to existing product DB tables if they are missing.

    Handles the case where an on-disk SQLite (or Postgres) product DB was created
    before a new NOT NULL column was introduced on the model: ``create_all`` skips
    existing tables, so new columns would never appear without this helper.

    SQLite supports ``ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT <const>``;
    the default clause is used to backfill existing rows in a single statement.
    """
    for table, column, sql_type, default in _ENSURE_COLUMNS:
        if is_postgres:
            exists_sql = text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = 'app' AND table_name = :t "
                "AND column_name = :c"
            )
            result = await conn.execute(exists_sql, {"t": table, "c": column})
            if result.first() is not None:
                continue
            await conn.execute(
                text(
                    f'ALTER TABLE app."{table}" '
                    f'ADD COLUMN "{column}" {sql_type} NOT NULL DEFAULT {default}'
                )
            )
        else:
            # Assume SQLite (the local/dev default). PRAGMA table_info returns
            # one row per column; column index 1 is the column name.
            rows = (await conn.execute(text(f'PRAGMA table_info("{table}")'))).all()
            existing = {r[1] for r in rows}
            if column in existing:
                continue
            await conn.execute(
                text(
                    f'ALTER TABLE "{table}" '
                    f'ADD COLUMN "{column}" {sql_type} NOT NULL DEFAULT {default}'
                )
            )
