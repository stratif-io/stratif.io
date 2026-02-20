"""OpenFlow Analytics - Bare Metal Product Analytics"""

__version__ = "1.0.0"

from .config import Settings, get_settings
from .db import Database, get_db

__all__ = [
    "__version__",
    "get_settings",
    "Settings",
    "get_db",
    "Database",
]
