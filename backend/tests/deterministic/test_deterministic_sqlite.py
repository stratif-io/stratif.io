"""Deterministic E2E tests — SQLite backend."""

import pytest

from backend.tests.deterministic.base import DeterministicBaseTest


@pytest.mark.integration
@pytest.mark.deterministic
@pytest.mark.deterministic_sqlite
@pytest.mark.usefixtures("deterministic_setup")
class TestDeterministicSQLite(DeterministicBaseTest):
    db_type = "sqlite"
