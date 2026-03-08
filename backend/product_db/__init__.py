"""Product database package."""

from .database import get_product_db, ProductDatabase
from .migrations import init_product_db

__all__ = ["get_product_db", "ProductDatabase", "init_product_db"]
