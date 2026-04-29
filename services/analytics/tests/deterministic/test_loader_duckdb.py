"""Loader integration test — DuckDB only, no API needed.

Requires DuckDB to be enabled in connections.yaml.
"""

import pytest

from services.analytics.tests.deterministic.conftest import DET_CONFIG
from services.analytics.tests.deterministic.dataset import EVENTS, TABLE_NAME
from services.analytics.tests.deterministic.loader import (
    close_connection,
    create_table,
    drop_table,
    insert_rows,
    open_write_connection,
)


@pytest.fixture(scope="module")
def duckdb_write_conn():
    if DET_CONFIG is None:
        pytest.skip("connections.yaml not found")
    cfg = DET_CONFIG.get("duckdb", {})
    if not cfg.get("enabled", False):
        pytest.skip("duckdb not enabled in connections.yaml")
    backend, conn = open_write_connection("duckdb", cfg["credentials"])
    yield backend, conn
    close_connection(backend, conn)


def test_create_insert_drop(duckdb_write_conn):
    backend, conn = duckdb_write_conn
    try:
        create_table(backend, conn)
        insert_rows(backend, conn)

        rows = backend.execute(conn, f"SELECT COUNT(*) FROM {TABLE_NAME}", None)
        assert rows[0][0] == len(EVENTS), f"Expected {len(EVENTS)}, got {rows[0][0]}"

        rows = backend.execute(
            conn,
            f"SELECT COUNT(DISTINCT user_id) FROM {TABLE_NAME}",
            None,
        )
        assert rows[0][0] == 10

        rows = backend.execute(
            conn,
            f"SELECT COUNT(DISTINCT event_name) FROM {TABLE_NAME}",
            None,
        )
        assert rows[0][0] == 5
    finally:
        drop_table(backend, conn)
