"""Integration test: PostgreSQL backend against a real database.

Credentials are read from connections.yaml (``backends.postgresql``).
Set ``enabled: true`` and fill in host/port/database/user/password to run.
"""

import pytest

from services.analytics.tests.integration.conftest import get_backend_config

_CREDS = get_backend_config("postgresql")


@pytest.mark.integration
@pytest.mark.skipif(_CREDS is None, reason="postgresql not enabled in connections.yaml")
class TestPostgreSQLIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from services.analytics.backends.postgresql import PostgreSQLBackend
        from services.analytics.backends.postgresql.credentials import (
            PostgreSQLCredentials,
        )

        assert _CREDS is not None
        creds = PostgreSQLCredentials(**_CREDS)
        backend = PostgreSQLBackend()
        conn = backend.open(creds, read_only=True)
        yield backend, conn
        conn.close()

    def test_select_one(self, backend_and_conn):
        backend, conn = backend_and_conn
        rows = backend.execute(conn, "SELECT 1", None)
        assert rows == [(1,)]

    def test_get_tables_returns_list(self, backend_and_conn):
        backend, conn = backend_and_conn
        tables = backend.get_tables(conn)
        assert isinstance(tables, list)

    def test_dialect_name(self, backend_and_conn):
        backend, _ = backend_and_conn
        assert backend.dialect_name == "postgres"

    def test_date_trunc_executes(self, backend_and_conn):
        backend, conn = backend_and_conn
        expr = backend.date_trunc("day", "NOW()")
        rows = backend.execute(conn, f"SELECT {expr}", None)
        assert len(rows) == 1
