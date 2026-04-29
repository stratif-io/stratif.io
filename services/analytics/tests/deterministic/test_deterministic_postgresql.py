"""Deterministic E2E tests — PostgreSQL backend."""

import pytest

from services.analytics.tests.deterministic.base import DeterministicBaseTest


@pytest.mark.integration
@pytest.mark.deterministic
@pytest.mark.deterministic_pg
@pytest.mark.usefixtures("deterministic_setup")
class TestDeterministicPostgreSQL(DeterministicBaseTest):
    db_type = "postgresql"
