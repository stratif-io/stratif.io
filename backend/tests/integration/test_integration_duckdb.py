"""Integration test: DuckDB backend against a real file-based database.

Credentials are read from connections.yaml (``backends.duckdb``).
Set ``enabled: true`` and provide a ``file_path`` to run this test.
"""
import pytest

from backend.tests.integration.conftest import get_backend_config

_CREDS = get_backend_config("duckdb")


@pytest.mark.integration
@pytest.mark.skipif(_CREDS is None, reason="duckdb not enabled in connections.yaml")
class TestDuckDBIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.duckdb import DuckDBBackend
        from backend.backends.duckdb.credentials import DuckDBCredentials

        creds = DuckDBCredentials(**_CREDS)
        backend = DuckDBBackend()
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
