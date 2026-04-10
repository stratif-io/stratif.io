"""Async SQLAlchemy engine and session factory for the stratif.io product database."""

from __future__ import annotations

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
