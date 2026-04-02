from .database import init_product_db
from .deps import DBSession, get_db
from .models import (
    Connection,
    ConnectionCustomProperty,
    ConnectionFilterConfig,
    ConnectionFilterField,
    ConnectionPinnedMetric,
    ConnectionSchemaConfig,
)
from .protocol import ProductDB

# Compatibility exports for old sync interface (to be removed in Tasks 5-8)
def get_product_db() -> ProductDB:
    """Deprecated: old sync interface. Use DBSession (async) instead."""
    raise NotImplementedError(
        "get_product_db() is deprecated. Use DBSession dependency for async sessions."
    )


from typing import Annotated
from fastapi import Depends

ProductDBDep = Annotated[ProductDB, Depends(get_product_db)]

__all__ = [
    "get_db",
    "DBSession",
    "init_product_db",
    "Connection",
    "ConnectionSchemaConfig",
    "ConnectionFilterConfig",
    "ConnectionCustomProperty",
    "ConnectionPinnedMetric",
    "ConnectionFilterField",
    # Backward compat (deprecated)
    "get_product_db",
    "ProductDBDep",
    "ProductDB",
]
