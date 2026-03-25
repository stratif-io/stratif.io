"""Integration test: ClickHouse backend against a real database.

Required env var:
    TEST_CLICKHOUSE_URL  e.g. clickhouse://user:pass@localhost:8123/analytics
"""
import os
import pytest

CLICKHOUSE_URL = os.environ.get("TEST_CLICKHOUSE_URL", "")


@pytest.mark.integration
@pytest.mark.skipif(not CLICKHOUSE_URL, reason="TEST_CLICKHOUSE_URL not set")
class TestClickHouseIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.clickhouse import ClickHouseBackend
        from backend.backends.clickhouse.credentials import ClickHouseCredentials
        import urllib.parse

        parsed = urllib.parse.urlparse(CLICKHOUSE_URL)
        secure = parsed.scheme == "clickhouses"
        creds = ClickHouseCredentials(
            host=parsed.hostname,
            port=parsed.port or (8443 if secure else 8123),
            database=parsed.path.lstrip("/") or "default",
            user=parsed.username or "default",
            password=parsed.password or "",
            secure=secure,
        )
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
