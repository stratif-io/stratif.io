"""Deterministic E2E tests — ClickHouse backend."""

import pytest

from services.analytics.tests.deterministic.base import DeterministicBaseTest


@pytest.mark.integration
@pytest.mark.deterministic
@pytest.mark.deterministic_ch
@pytest.mark.usefixtures("deterministic_setup")
class TestDeterministicClickHouse(DeterministicBaseTest):
    db_type = "clickhouse"
