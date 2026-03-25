"""Integration test: DuckDB backend against a real file-based database.

Required env var:
    TEST_DUCKDB_PATH   absolute path to a real DuckDB file

Note: In-memory DuckDB (:memory:) is covered by unit tests.
This test verifies file I/O and the full open() path.
"""
import os
import pytest

DUCKDB_PATH = os.environ.get("TEST_DUCKDB_PATH", "")


@pytest.mark.integration
@pytest.mark.skipif(not DUCKDB_PATH, reason="TEST_DUCKDB_PATH not set")
class TestDuckDBIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.duckdb import DuckDBBackend
        from backend.backends.duckdb.credentials import DuckDBCredentials

        creds = DuckDBCredentials(file_path=DUCKDB_PATH)
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
