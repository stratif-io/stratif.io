"""Integration tests for /api/events, /api/events/top, /api/raw/events endpoints."""

import duckdb
import pytest
from starlette.testclient import TestClient

from backend.backends.duckdb import DuckDBBackend
from backend.main import app
from backend.services.connection_executor import AnalyticsDatabase, get_analytics_db


def _make_flat_columns_db() -> AnalyticsDatabase:
    """DB whose events table stores properties as flat columns, not a JSON blob.

    Simulates a connection where device_type and country are top-level columns
    (no 'properties' JSON column) and are configured as custom properties.
    """
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR,
            timestamp TIMESTAMP,
            event_name VARCHAR,
            device_type VARCHAR,
            country VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('u1', '2024-01-15 10:00:00', 'Home', 'Mobile', 'US'),
            ('u1', '2024-01-15 10:05:00', 'Purchase', 'Mobile', 'US')
    """)
    return AnalyticsDatabase(
        conn=conn,
        backend=DuckDBBackend(),
        events_cte=None,
        custom_props=[
            {"name": "device_type", "path": "device_type"},
            {"name": "country", "path": "country"},
        ],
        custom_prop_exprs={
            "device_type": '"device_type"',
            "country": '"country"',
        },
        available_columns=frozenset(
            ["user_id", "timestamp", "event_name", "device_type", "country"]
        ),
    )


@pytest.fixture()
def flat_client():
    test_db = _make_flat_columns_db()

    async def override_db():
        yield test_db

    app.dependency_overrides[get_analytics_db] = override_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


class TestRawEventsCustomProperties:
    def test_custom_props_appear_in_properties_dict(self, flat_client):
        """When the connection has flat-column custom properties, they must be
        returned inside the 'properties' dict — not left empty."""
        response = flat_client.get("/api/raw/events")
        assert response.status_code == 200
        row = response.json()["data"][0]
        assert row["properties"].get("device_type") == "Mobile"
        assert row["properties"].get("country") == "US"

    def test_user_events_custom_props_appear_in_properties_dict(self, flat_client):
        """Same check for the /users/{id}/events endpoint."""
        response = flat_client.get("/api/users/u1/events")
        assert response.status_code == 200
        row = response.json()["data"][0]
        assert row["properties"].get("device_type") == "Mobile"
        assert row["properties"].get("country") == "US"


class TestEventsEndpoint:
    def test_top_events_returns_200(self, client):
        response = client.get(
            "/api/events/top",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert isinstance(body["data"], list)

    def test_raw_events_returns_200(self, client):
        response = client.get(
            "/api/raw/events",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 200

    def test_invalid_date_returns_400(self, client):
        response = client.get(
            "/api/events/top",
            params={
                "start_date": "2024/01/01",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 400
