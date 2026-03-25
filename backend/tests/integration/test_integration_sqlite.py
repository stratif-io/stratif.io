"""Integration test: SQLite backend against a real file-based database.

Required env var:
    TEST_SQLITE_PATH   absolute path to a real SQLite file (NOT :memory:)

Note: :memory: is excluded — in-memory SQLite is covered by unit tests.
This test verifies file I/O, permissions, and the full open() path.
"""
import os
import pytest

SQLITE_PATH = os.environ.get("TEST_SQLITE_PATH", "")


@pytest.mark.integration
@pytest.mark.skipif(not SQLITE_PATH or SQLITE_PATH == ":memory:", reason="TEST_SQLITE_PATH not set to a file path")
class TestSQLiteIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.sqlite import SQLiteBackend
        from backend.backends.sqlite.credentials import SQLiteCredentials

        creds = SQLiteCredentials(file_path=SQLITE_PATH)
        backend = SQLiteBackend()
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
