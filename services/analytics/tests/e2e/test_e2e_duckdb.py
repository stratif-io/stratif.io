"""E2E test: full lifecycle against a real DuckDB connection."""

import pytest

from services.analytics.tests.e2e.base import BaseE2ETest


@pytest.mark.e2e
class TestDuckDBE2E(BaseE2ETest):
    db_type = "duckdb"
