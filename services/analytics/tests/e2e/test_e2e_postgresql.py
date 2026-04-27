"""E2E test: full lifecycle against a real PostgreSQL connection."""

import pytest

from services.analytics.tests.e2e.base import BaseE2ETest


@pytest.mark.e2e
class TestPostgreSQLE2E(BaseE2ETest):
    db_type = "postgresql"
