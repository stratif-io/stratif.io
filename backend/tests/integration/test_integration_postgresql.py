"""Integration test: PostgreSQL backend against a real database.

Required env var:
    TEST_POSTGRES_URL  e.g. postgresql://user:pass@localhost:5432/analytics
"""
import os
import pytest

POSTGRES_URL = os.environ.get("TEST_POSTGRES_URL", "")


@pytest.mark.integration
@pytest.mark.skipif(not POSTGRES_URL, reason="TEST_POSTGRES_URL not set")
class TestPostgreSQLIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.postgresql import PostgreSQLBackend
        from backend.backends.postgresql.credentials import PostgreSQLCredentials
        import urllib.parse

        parsed = urllib.parse.urlparse(POSTGRES_URL)
        creds = PostgreSQLCredentials(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path.lstrip("/"),
            user=parsed.username,
            password=parsed.password,
        )
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
