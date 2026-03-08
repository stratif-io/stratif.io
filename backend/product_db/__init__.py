"""Product database package — stores user configuration, connections, and schema mappings."""

from .database import ProductDatabase, get_product_db
from .migrations import init_product_db, run_migrations

__all__ = ["ProductDatabase", "get_product_db", "init_product_db", "run_migrations"]
