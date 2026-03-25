"""FastAPI dependency for the product database."""
from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from backend.config import settings
from backend.product_db.base import ProductDB


@lru_cache
def get_product_db() -> ProductDB:
    """Return the configured product DB implementation.

    Uses @lru_cache so a single instance is shared per process.
    In tests, override via: app.dependency_overrides[get_product_db] = lambda: FakeProductDB()
    Never call get_product_db() directly in tests — use dependency_overrides.
    """
    from backend.product_db.database import SQLiteProductDB
    if not settings.product_db_url or settings.product_db_url.startswith("sqlite"):
        return SQLiteProductDB(settings.product_db_path)
    raise ValueError(f"Unsupported product_db_url: {settings.product_db_url!r}")


ProductDBDep = Annotated[ProductDB, Depends(get_product_db)]
