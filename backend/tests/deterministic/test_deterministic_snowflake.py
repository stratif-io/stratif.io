"""Deterministic E2E tests — Snowflake backend."""

import pytest

from backend.tests.deterministic.base import DeterministicBaseTest


@pytest.mark.deterministic
@pytest.mark.deterministic_sf
@pytest.mark.usefixtures("deterministic_setup")
class TestDeterministicSnowflake(DeterministicBaseTest):
    db_type = "snowflake"
