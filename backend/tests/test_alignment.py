"""Verify funnel API returns internally consistent data.

Uses TestClient with a seeded in-memory DuckDB so the real SQL runs.
"""

import duckdb
import pytest
from starlette.testclient import TestClient

from openflow.core.jwt_auth import get_current_auth_user
from openflow.main import app
from openflow.services.connection_executor import AnalyticsDatabase, get_analytics_db


class FakeUser:
    id = "test-user-id"
    email = "test@example.com"
    display_name = "Test User"
    avatar_url = None
    created_at = "2024-01-01T00:00:00"
    last_login_at = None


def _make_funnel_db() -> AnalyticsDatabase:
    """Seed a DB with a clear funnel: Home → Search → ProductView → Purchase.

    user-1: completes all 4 steps
    user-2: stops after Search
    user-3: only does Home
    """
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
            ('user-1', '2026-01-01 10:00:00', 'Home',        '{}'),
            ('user-1', '2026-01-01 10:01:00', 'Search',      '{}'),
            ('user-1', '2026-01-01 10:02:00', 'ProductView', '{}'),
            ('user-1', '2026-01-01 10:03:00', 'Purchase',    '{}'),
            ('user-2', '2026-01-01 11:00:00', 'Home',        '{}'),
            ('user-2', '2026-01-01 11:01:00', 'Search',      '{}'),
            ('user-3', '2026-01-01 12:00:00', 'Home',        '{}')
    """)
    return AnalyticsDatabase(conn=conn, dialect="duckdb", events_cte=None)


@pytest.fixture()
def funnel_client():
    fake_user = FakeUser()
    test_db = _make_funnel_db()

    async def override_auth():
        return fake_user

    async def override_db():
        yield test_db

    app.dependency_overrides[get_current_auth_user] = override_auth
    app.dependency_overrides[get_analytics_db] = override_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_funnel_user_counts_are_correct(funnel_client):
    """Funnel Home→Search→ProductView→Purchase should count 3, 2, 1, 1 users."""
    response = funnel_client.get(
        "/api/path-funnel",
        params={"events": "Home,Search,ProductView,Purchase"},
    )
    assert response.status_code == 200
    data = response.json()["data"]

    assert data[0]["event"] == "Home"
    assert data[0]["users"] == 3  # user-1, user-2, user-3

    assert data[1]["event"] == "Search"
    assert data[1]["users"] == 2  # user-1, user-2

    assert data[2]["event"] == "ProductView"
    assert data[2]["users"] == 1  # user-1 only

    assert data[3]["event"] == "Purchase"
    assert data[3]["users"] == 1  # user-1 only


def test_funnel_users_decrease_monotonically(funnel_client):
    """Users at each step must be <= users at the previous step."""
    response = funnel_client.get(
        "/api/path-funnel",
        params={"events": "Home,Search,ProductView,Purchase"},
    )
    assert response.status_code == 200
    users = [step["users"] for step in response.json()["data"]]

    for i in range(1, len(users)):
        assert users[i] <= users[i - 1], (
            f"Users increased from step {i} to {i + 1}: {users[i - 1]} -> {users[i]}"
        )


def test_funnel_dropoff_sums_correctly(funnel_client):
    """Sum of all dropoffs must equal initial_users - final_users."""
    response = funnel_client.get(
        "/api/path-funnel",
        params={"events": "Home,Search,ProductView,Purchase"},
    )
    assert response.status_code == 200
    steps = response.json()["data"]

    initial_users = steps[0]["users"]
    final_users = steps[-1]["users"]
    total_dropoff = sum(s["dropoff_users"] for s in steps)

    assert total_dropoff == initial_users - final_users


def test_funnel_step_conversion_rates(funnel_client):
    """Step conversion rate should be users[i] / users[i-1] * 100."""
    response = funnel_client.get(
        "/api/path-funnel",
        params={"events": "Home,Search,ProductView,Purchase"},
    )
    assert response.status_code == 200
    steps = response.json()["data"]

    assert steps[0]["step_conversion_rate"] == 100.0
    assert steps[1]["step_conversion_rate"] == pytest.approx(66.67, abs=0.1)  # 2/3
    assert steps[2]["step_conversion_rate"] == pytest.approx(50.0)  # 1/2
    assert steps[3]["step_conversion_rate"] == pytest.approx(100.0)  # 1/1


def test_funnel_requires_at_least_two_events(funnel_client):
    """Single-event funnel should return an error."""
    response = funnel_client.get("/api/path-funnel", params={"events": "Home"})
    assert response.status_code == 200
    assert "error" in response.json()
