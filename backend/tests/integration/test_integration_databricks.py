"""Integration test: Databricks backend against a real cluster/SQL warehouse.

Credentials are read from connections.yaml (``backends.databricks``).
Set ``enabled: true`` and fill in host/token/http_path.
"""

import pytest

from backend.tests.integration.conftest import get_backend_config

_CREDS = get_backend_config("databricks")


@pytest.mark.integration
@pytest.mark.skipif(_CREDS is None, reason="databricks not enabled in connections.yaml")
class TestDatabricksIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.databricks import DatabricksBackend
        from backend.backends.databricks.credentials import DatabricksCredentials

        assert _CREDS is not None
        creds = DatabricksCredentials(**_CREDS)
        backend = DatabricksBackend()
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
