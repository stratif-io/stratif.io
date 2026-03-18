"""Session-scoped fixtures for contract tests."""
from __future__ import annotations

import duckdb
import pytest

_SEED_SQL = """
CREATE TABLE IF NOT EXISTS test_events (
    user_id    VARCHAR,
    timestamp  TIMESTAMP,
    event_name VARCHAR,
    properties VARCHAR
);
INSERT INTO test_events VALUES
    ('u1', '2024-01-01 10:00:00', 'page_view', '{"page": "/home"}'),
    ('u1', '2024-01-01 10:05:00', 'click',     '{"element": "btn"}'),
    ('u2', '2024-01-02 09:00:00', 'page_view', '{"page": "/about"}');
"""


def _is_docker_available() -> bool:
    try:
        import docker
        docker.from_env().ping()
        return True
    except Exception:
        return False


_docker_available = pytest.mark.skipif(
    not _is_docker_available(),
    reason="Docker not available",
)


# ── DuckDB ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def duckdb_conn():
    conn = duckdb.connect(":memory:")
    conn.execute(_SEED_SQL)
    yield conn
    conn.close()


# ── SQLite ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def sqlite_conn():
    import sqlite3
    conn = sqlite3.connect(":memory:")
    conn.executescript(_SEED_SQL.replace("VARCHAR", "TEXT").replace("TIMESTAMP", "TEXT"))
    yield conn
    conn.close()


# ── PostgreSQL (testcontainers) ───────────────────────────────────────────────

@pytest.fixture(scope="session")
@_docker_available
def postgresql_conn():
    from testcontainers.postgres import PostgresContainer
    with PostgresContainer("postgres:16") as pg:
        import psycopg2
        conn = psycopg2.connect(pg.get_connection_url().replace("postgresql+psycopg2://", ""))
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE test_events (
                user_id TEXT, timestamp TIMESTAMP, event_name TEXT, properties TEXT
            )
        """)
        cur.execute("""
            INSERT INTO test_events VALUES
            ('u1','2024-01-01 10:00:00','page_view','{"page": "/home"}'),
            ('u1','2024-01-01 10:05:00','click','{"element": "btn"}'),
            ('u2','2024-01-02 09:00:00','page_view','{"page": "/about"}')
        """)
        cur.close()
        yield conn
        conn.close()


# ── ClickHouse (testcontainers) ───────────────────────────────────────────────

@pytest.fixture(scope="session")
@_docker_available
def clickhouse_conn():
    from testcontainers.clickhouse import ClickHouseContainer
    with ClickHouseContainer("clickhouse/clickhouse-server:24") as ch:
        import clickhouse_connect
        client = clickhouse_connect.get_client(
            host=ch.get_container_host_ip(),
            port=int(ch.get_exposed_port(8123)),
            username="default",
            password="",
            database="default",
            secure=False,
        )
        client.command("""
            CREATE TABLE test_events (
                user_id String,
                timestamp DateTime,
                event_name String,
                properties String
            ) ENGINE = MergeTree() ORDER BY timestamp
        """)
        client.command("""
            INSERT INTO test_events VALUES
            ('u1', '2024-01-01 10:00:00', 'page_view', '{"page": "/home"}'),
            ('u1', '2024-01-01 10:05:00', 'click', '{"element": "btn"}'),
            ('u2', '2024-01-02 09:00:00', 'page_view', '{"page": "/about"}')
        """)
        yield client


# ── Snowflake (fakesnow) ──────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def snowflake_conn():
    fakesnow = pytest.importorskip("fakesnow")
    with fakesnow.patch():
        import snowflake.connector
        conn = snowflake.connector.connect(
            account="fakesnow", user="test", password="test",
            warehouse="wh", database="DB", schema="PUBLIC",
        )
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE test_events (
                user_id VARCHAR, timestamp TIMESTAMP_NTZ,
                event_name VARCHAR, properties VARIANT
            )
        """)
        cur.execute("""
            INSERT INTO test_events VALUES
            ('u1', '2024-01-01 10:00:00'::TIMESTAMP_NTZ, 'page_view', PARSE_JSON('{"page": "/home"}')),
            ('u1', '2024-01-01 10:05:00'::TIMESTAMP_NTZ, 'click', PARSE_JSON('{"element": "btn"}')),
            ('u2', '2024-01-02 09:00:00'::TIMESTAMP_NTZ, 'page_view', PARSE_JSON('{"page": "/about"}'))
        """)
        cur.close()
        yield conn
        conn.close()


# ── Databricks (stub) ─────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def databricks_conn():
    from backend.tests.contract.stubs.databricks_stub import connect
    conn = connect(server_hostname="stub", http_path="/sql/stub", access_token="stub")
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE test_events (
            user_id VARCHAR, timestamp TIMESTAMP,
            event_name VARCHAR, properties VARCHAR
        )
    """)
    cur.execute("""
        INSERT INTO test_events VALUES
        ('u1', '2024-01-01 10:00:00', 'page_view', '{"page": "/home"}'),
        ('u1', '2024-01-01 10:05:00', 'click', '{"element": "btn"}'),
        ('u2', '2024-01-02 09:00:00', 'page_view', '{"page": "/about"}')
    """)
    yield conn
    conn.close()


# ── Parametrized fixture ──────────────────────────────────────────────────────

from backend.backends.duckdb import DuckDBBackend
from backend.backends.sqlite import SQLiteBackend
from backend.backends.postgresql import PostgreSQLBackend
from backend.backends.clickhouse import ClickHouseBackend
from backend.backends.snowflake import SnowflakeBackend
from backend.backends.databricks import DatabricksBackend


@pytest.fixture(scope="session")
def all_backend_fixtures(request, duckdb_conn, sqlite_conn, snowflake_conn, databricks_conn):
    """Build backend map. Docker-backed fixtures are fetched lazily so tests skip gracefully."""
    result = {
        "duckdb":     (DuckDBBackend(),     duckdb_conn),
        "sqlite":     (SQLiteBackend(),     sqlite_conn),
        "snowflake":  (SnowflakeBackend(),  snowflake_conn),
        "databricks": (DatabricksBackend(), databricks_conn),
    }
    for db_type, backend_cls, fixture_name in [
        ("postgresql", PostgreSQLBackend, "postgresql_conn"),
        ("clickhouse", ClickHouseBackend, "clickhouse_conn"),
    ]:
        try:
            conn = request.getfixturevalue(fixture_name)
            result[db_type] = (backend_cls(), conn)
        except pytest.skip.Exception:
            pass
    return result


@pytest.fixture(
    params=["duckdb", "sqlite", "postgresql", "clickhouse", "snowflake", "databricks"]
)
def backend_and_conn(request, all_backend_fixtures):
    """Yields (backend_instance, live_connection) for each db type."""
    db_type = request.param
    fixture = all_backend_fixtures.get(db_type)
    if fixture is None:
        pytest.skip(f"{db_type} fixture not available")
    return fixture
