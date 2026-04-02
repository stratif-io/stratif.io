"""Async SQLAlchemy engine and session factory for the stratif.io product database."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config import settings
from backend.product_db.base import Base

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_async_engine(settings.product_db_url, echo=settings.log_sql)
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


async def init_product_db() -> None:
    """Create all tables. Safe to call on every startup (CREATE TABLE IF NOT EXISTS)."""
    async with _get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Backward compatibility stub for tests (to be removed in Tasks 5-8)
class SQLiteProductDB:
    """Deprecated: old sync SQLite product DB implementation. To be removed."""

    def __init__(self, path: str):
        raise NotImplementedError(
            "SQLiteProductDB is deprecated. Use async DBSession instead."
        )
