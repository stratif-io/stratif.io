"""Integration test: Databricks backend against a real cluster/SQL warehouse.

Required env vars:
    TEST_DATABRICKS_HOST        e.g. adb-1234.azuredatabricks.net
    TEST_DATABRICKS_TOKEN       personal access token
    TEST_DATABRICKS_HTTP_PATH   e.g. /sql/1.0/warehouses/abc123
"""
import os
import pytest

_REQUIRED = ["TEST_DATABRICKS_HOST", "TEST_DATABRICKS_TOKEN", "TEST_DATABRICKS_HTTP_PATH"]
_MISSING = [k for k in _REQUIRED if not os.environ.get(k)]


@pytest.mark.integration
@pytest.mark.skipif(bool(_MISSING), reason=f"Missing env vars: {_MISSING}")
class TestDatabricksIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.databricks import DatabricksBackend
        from backend.backends.databricks.credentials import DatabricksCredentials

        creds = DatabricksCredentials(
            host=os.environ["TEST_DATABRICKS_HOST"],
            token=os.environ["TEST_DATABRICKS_TOKEN"],
            http_path=os.environ["TEST_DATABRICKS_HTTP_PATH"],
        )
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
