"""Shared fixtures for API integration tests."""

import os

# Set required env vars before importing the app (pydantic-settings reads them at import time)
os.environ.setdefault("OPENFLOW_API_URL", "http://localhost:8000")
os.environ.setdefault("OPENFLOW_API_KEY", "test-api-key")
os.environ.setdefault("OPENFLOW_JWT_SECRET", "test-jwt-secret-for-testing-only")
os.environ.setdefault("OPENFLOW_JWT_ALGORITHM", "HS256")
os.environ.setdefault("OPENFLOW_JWT_EXPIRE_DAYS", "7")
os.environ.setdefault("OPENFLOW_CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("OPENFLOW_PRODUCT_DB_PATH", ":memory:")
os.environ.setdefault(
    "OPENFLOW_ENCRYPTION_KEY", "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcy0xMjM0NQ=="
)

import duckdb
import pytest
from starlette.testclient import TestClient

from openflow.core.jwt_auth import get_current_auth_user
from openflow.main import app
from openflow.services.connection_executor import AnalyticsDatabase, get_analytics_db


def _make_fake_user():
    """Create a minimal AuthUserRow-like object for tests."""

    class FakeUser:
        id = "test-user-id"
        email = "test@example.com"
        display_name = "Test User"
        avatar_url = None
        created_at = "2024-01-01T00:00:00"
        last_login_at = None

    return FakeUser()


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
    """TestClient with auth and analytics DB overridden for testing."""
    fake_user = _make_fake_user()
    test_db = _make_test_db()

    async def override_auth():
        return fake_user

    async def override_db():
        yield test_db

    app.dependency_overrides[get_current_auth_user] = override_auth
    app.dependency_overrides[get_analytics_db] = override_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
