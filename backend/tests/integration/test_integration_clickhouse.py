"""Integration test: ClickHouse backend against a real database.

Credentials are read from connections.yaml (``backends.clickhouse``).
Set ``enabled: true`` and fill in host/port/database/user/password/secure.
"""

import pytest

from backend.tests.integration.conftest import get_backend_config

_CREDS = get_backend_config("clickhouse")


@pytest.mark.integration
@pytest.mark.skipif(_CREDS is None, reason="clickhouse not enabled in connections.yaml")
class TestClickHouseIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.clickhouse import ClickHouseBackend
        from backend.backends.clickhouse.credentials import ClickHouseCredentials

        assert _CREDS is not None
        creds = ClickHouseCredentials(**_CREDS)
        backend = ClickHouseBackend()
        conn = backend.open(creds, read_only=True)
        yield backend, conn
        conn.close()

    def test_select_one(self, backend_and_conn):
        backend, conn = backend_and_conn
        rows = backend.execute(conn, "SELECT 1", None)
        assert rows[0][0] == 1

    def test_get_tables_returns_list(self, backend_and_conn):
        backend, conn = backend_and_conn
        tables = backend.get_tables(conn)
        assert isinstance(tables, list)

    def test_dialect_name(self, backend_and_conn):
        backend, _ = backend_and_conn
        assert backend.dialect_name == "clickhouse"
