"""E2E test: all API endpoints against a real Databricks connection.

Required env var:
    TEST_DATABRICKS_CONNECTION_ID   UUID of a pre-configured connection in the product DB
                                    (with schema config set up via PUT /api/connections/{id}/schema)

Also required:
    STRATIFIO_PRODUCT_DB_PATH     Path to the product DB containing the connection record
    STRATIFIO_ENCRYPTION_KEY      Key used to encrypt credentials in the product DB
"""
import os
import pytest
from backend.tests.e2e.conftest import make_client, default_params

CONNECTION_ID = os.environ.get("TEST_DATABRICKS_CONNECTION_ID", "")


@pytest.mark.e2e
@pytest.mark.skipif(not CONNECTION_ID, reason="TEST_DATABRICKS_CONNECTION_ID not set")
class TestDatabricksE2E:
    @pytest.fixture(scope="class")
    def client(self):
        return make_client()

    @pytest.fixture(scope="class")
    def params(self):
        return default_params(CONNECTION_ID)

    @pytest.fixture(scope="class")
    def first_event(self, client, params):
        r = client.get("/api/events", params={"connection_id": CONNECTION_ID})
        events = r.json().get("events", [])
        return events[0] if events else None

    @pytest.fixture(scope="class")
    def first_user(self, client, params):
        r = client.get("/api/raw/events", params=params)
        data = r.json().get("data", [])
        return data[0]["user_id"] if data else None

    def test_events(self, client, params):
        r = client.get("/api/events", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["events"], list)

    def test_events_top(self, client, params):
        r = client.get("/api/events/top", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_trend(self, client, params):
        r = client.get("/api/trend", params=params)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["total_unique_users"], (int, float))

    def test_retention(self, client, params):
        r = client.get("/api/retention", params=params)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["granularity"], str)
        assert isinstance(body["milestones"], list)
        assert isinstance(body["total_available_cohorts"], int)

    def test_conversion(self, client, params):
        r = client.get("/api/conversion", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_paths(self, client, params, first_event):
        if not first_event:
            pytest.skip("No events in test DB")
        r = client.get("/api/paths", params={**params, "target_event": first_event})
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["target_event"], str)

    def test_path_analysis(self, client, params):
        r = client.get("/api/path-analysis", params=params)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["total_paths"], int)

    def test_path_funnel(self, client, params, first_event):
        if not first_event:
            pytest.skip("No events in test DB")
        r = client.get("/api/path-funnel", params={**params, "events": first_event})
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["total_steps"], int)

    def test_pivot(self, client, params):
        r = client.get("/api/pivot", params={**params, "measures": "count_events"})
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["measures"], list)

    def test_pivot_options(self, client):
        r = client.get("/api/pivot/options", params={"connection_id": CONNECTION_ID})
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["dimensions"], list)
        assert isinstance(body["measures"], list)

    def test_raw_events(self, client, params):
        r = client.get("/api/raw/events", params=params)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["total"], int)
        assert isinstance(body["limit"], int)
        assert isinstance(body["offset"], int)

    def test_raw_sessions(self, client, params):
        r = client.get("/api/raw/sessions", params=params)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["total"], int)
        assert isinstance(body["limit"], int)
        assert isinstance(body["offset"], int)

    def test_sessions_summary(self, client, params):
        r = client.get("/api/sessions/summary", params=params)
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_user_events(self, client, params, first_user):
        if not first_user:
            pytest.skip("No users in test DB")
        r = client.get(
            f"/api/users/{first_user}/events",
            params={"connection_id": CONNECTION_ID},
        )
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["user_id"], str)

    def test_connection_test(self, client):
        r = client.post(f"/api/connections/{CONNECTION_ID}/test")
        assert r.status_code == 200

    def test_connection_schema(self, client):
        r = client.get(f"/api/connections/{CONNECTION_ID}/schema")
        assert r.status_code == 200
        assert isinstance(r.json(), dict)
