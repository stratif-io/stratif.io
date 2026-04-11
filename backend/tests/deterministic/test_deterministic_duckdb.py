"""Deterministic E2E tests — DuckDB backend."""

import pytest

from backend.tests.deterministic.base import DeterministicBaseTest


@pytest.mark.integration
@pytest.mark.deterministic
@pytest.mark.deterministic_duckdb
@pytest.mark.usefixtures("deterministic_setup")
class TestDeterministicDuckDB(DeterministicBaseTest):
    db_type = "duckdb"
