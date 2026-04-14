"""Shared fixtures for API integration tests."""

from unittest.mock import patch

import duckdb
import pytest
from starlette.testclient import TestClient

from backend.backends.duckdb import DuckDBBackend
from backend.main import app
from backend.services.connection_executor import AnalyticsDatabase, get_analytics_db


@pytest.fixture(autouse=True)
def _patch_lifespan():
    """Prevent lifespan from touching the real product DB during tests."""
    with patch("backend.main.init_product_db"):
        yield


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
    return AnalyticsDatabase(conn=conn, backend=DuckDBBackend(), events_cte=None)


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


def _make_filterable_db() -> AnalyticsDatabase:
    """In-memory DuckDB with a `country` column and a configured filter.

    Seed designed to expose filter-application bugs across
    new/returning/resurrected/churned users. Some users have event-level
    country values that differ across their history, so their global history
    differs from their history within a filtered segment.

    Period of interest = 2024-03-15 .. 2024-03-15
    Prev period        = 2024-03-14 .. 2024-03-14 (length-matched)
    Resurrection window = 30 days (default) → cutoff = 2024-02-14

      user-A:
        2023-01-01 → UK  (far past; only non-US history)
        2024-03-15 → US  (first US event; in period)
      user-B:
        2024-03-14 → UK  (prev period only; UK user, absent in current)
      user-C:
        2024-02-20 → US  (within resurrection window, before period)
        2024-03-15 → US  (in period)
      user-D:
        2024-03-15 → US  (first ever event; truly new)
      user-E:
        2024-03-01 → UK  (prior history, but NOT in the US segment)
        2024-03-15 → US  (first US event; in period)
    """
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR,
            timestamp TIMESTAMP,
            event_name VARCHAR,
            country VARCHAR,
            properties VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('user-A', '2023-01-01 10:00:00', 'Home', 'UK', '{}'),
            ('user-A', '2024-03-15 10:00:00', 'Home', 'US', '{}'),
            ('user-B', '2024-03-14 10:00:00', 'Home', 'UK', '{}'),
            ('user-C', '2024-02-20 10:00:00', 'Home', 'US', '{}'),
            ('user-C', '2024-03-15 11:00:00', 'Purchase', 'US', '{}'),
            ('user-D', '2024-03-15 12:00:00', 'Home', 'US', '{}'),
            ('user-E', '2024-03-01 09:00:00', 'Home', 'UK', '{}'),
            ('user-E', '2024-03-15 13:00:00', 'Home', 'US', '{}')
    """)
    return AnalyticsDatabase(
        conn=conn,
        backend=DuckDBBackend(),
        events_cte=None,
        filter_fields=[{"field": "country", "label": "Country"}],
        filter_exprs={"country": "country"},
    )


@pytest.fixture()
def filterable_client():
    """TestClient backed by a DB with a `country` filter configured."""
    test_db = _make_filterable_db()

    async def override_db():
        yield test_db

    app.dependency_overrides[get_analytics_db] = override_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
