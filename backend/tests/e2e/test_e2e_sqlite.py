"""E2E test: full lifecycle against a real SQLite connection."""
import pytest

from backend.tests.e2e.base import BaseE2ETest


@pytest.mark.e2e
class TestSQLiteE2E(BaseE2ETest):
    db_type = "sqlite"
