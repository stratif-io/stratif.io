"""Integration test: SQLite backend against a real file-based database.

Credentials are read from connections.yaml (``backends.sqlite``).
Set ``enabled: true`` and provide a ``file_path`` to run this test.
"""

import pytest

from backend.tests.integration.conftest import get_backend_config

_CREDS = get_backend_config("sqlite")


@pytest.mark.integration
@pytest.mark.skipif(_CREDS is None, reason="sqlite not enabled in connections.yaml")
class TestSQLiteIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.sqlite import SQLiteBackend
        from backend.backends.sqlite.credentials import SQLiteCredentials

        assert _CREDS is not None
        creds = SQLiteCredentials(**_CREDS)
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
