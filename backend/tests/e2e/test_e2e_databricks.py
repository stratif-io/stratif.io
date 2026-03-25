"""E2E test: full lifecycle against a real Databricks connection."""
import pytest
from backend.tests.e2e.base import BaseE2ETest


@pytest.mark.e2e
class TestDatabricksE2E(BaseE2ETest):
    db_type = "databricks"
