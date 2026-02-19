"""OpenFlow Analytics - Bare Metal Product Analytics"""

__version__ = "1.0.0"

from .config import get_settings, Settings
from .db import get_db, Database

__all__ = [
    "__version__",
    "get_settings",
    "Settings",
    "get_db",
    "Database",
]
