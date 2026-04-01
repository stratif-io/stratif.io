"""Integration test: Snowflake backend against a real account.

Credentials are read from connections.yaml (``backends.snowflake``).
Set ``enabled: true`` and fill in account/user/password/database.
"""

import pytest

from backend.tests.integration.conftest import get_backend_config

_CREDS = get_backend_config("snowflake")


@pytest.mark.integration
@pytest.mark.skipif(_CREDS is None, reason="snowflake not enabled in connections.yaml")
class TestSnowflakeIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.snowflake import SnowflakeBackend
        from backend.backends.snowflake.credentials import SnowflakeCredentials

        creds = SnowflakeCredentials(**_CREDS)
        backend = SnowflakeBackend()
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
