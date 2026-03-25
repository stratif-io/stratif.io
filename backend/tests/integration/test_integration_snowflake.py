"""Integration test: Snowflake backend against a real account.

Required env vars:
    TEST_SNOWFLAKE_ACCOUNT    e.g. xy12345.us-east-1
    TEST_SNOWFLAKE_USER       e.g. MYUSER
    TEST_SNOWFLAKE_PASSWORD
    TEST_SNOWFLAKE_DATABASE   e.g. ANALYTICS
"""
import os
import pytest

_REQUIRED = ["TEST_SNOWFLAKE_ACCOUNT", "TEST_SNOWFLAKE_USER", "TEST_SNOWFLAKE_PASSWORD", "TEST_SNOWFLAKE_DATABASE"]
_MISSING = [k for k in _REQUIRED if not os.environ.get(k)]


@pytest.mark.integration
@pytest.mark.skipif(bool(_MISSING), reason=f"Missing env vars: {_MISSING}")
class TestSnowflakeIntegration:
    @pytest.fixture
    def backend_and_conn(self):
        from backend.backends.snowflake import SnowflakeBackend
        from backend.backends.snowflake.credentials import SnowflakeCredentials

        creds = SnowflakeCredentials(
            account=os.environ["TEST_SNOWFLAKE_ACCOUNT"],
            user=os.environ["TEST_SNOWFLAKE_USER"],
            password=os.environ["TEST_SNOWFLAKE_PASSWORD"],
            database=os.environ["TEST_SNOWFLAKE_DATABASE"],
        )
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
