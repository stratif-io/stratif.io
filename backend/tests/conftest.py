"""Shared fixtures for API integration tests."""

import duckdb
import pytest
from starlette.testclient import TestClient

from backend.main import app
from backend.services.connection_executor import AnalyticsDatabase, get_analytics_db


def _make_test_db() -> AnalyticsDatabase:
    """Create an in-memory DuckDB seeded with minimal analytics data."""
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR,
            timestamp TIMESTAMP,
            event_name VARCHAR,
            properties VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('user-1', '2024-01-15 10:00:00', 'Home', '{}'),
            ('user-1', '2024-01-15 10:05:00', 'Purchase', '{}'),
            ('user-2', '2024-01-16 11:00:00', 'Home', '{}'),
            ('user-2', '2024-01-16 11:10:00', 'Checkout', '{}')
    """)
    return AnalyticsDatabase(conn=conn, dialect="duckdb", events_cte=None)


@pytest.fixture()
def client():
    """TestClient with analytics DB overridden for testing."""
    test_db = _make_test_db()

    async def override_db():
        yield test_db

    app.dependency_overrides[get_analytics_db] = override_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture()
def db():
    """Raw AnalyticsDatabase for direct SQL testing."""
    return _make_test_db()
