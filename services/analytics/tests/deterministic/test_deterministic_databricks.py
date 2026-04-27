"""Deterministic E2E tests — Databricks backend."""

import pytest

from services.analytics.tests.deterministic.base import DeterministicBaseTest


@pytest.mark.integration
@pytest.mark.deterministic
@pytest.mark.deterministic_db
@pytest.mark.usefixtures("deterministic_setup")
class TestDeterministicDatabricks(DeterministicBaseTest):
    db_type = "databricks"
