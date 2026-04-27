"""FastAPI dependency for the product database async session."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from services.analytics.product_db.database import get_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an AsyncSession. Use as a FastAPI dependency via DBSession."""
    async with get_session_factory()() as session:
        yield session


DBSession = Annotated[AsyncSession, Depends(get_db)]
