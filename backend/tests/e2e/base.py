"""Base class for all backend E2E tests.

Subclasses must set CONNECTION_ID as a class variable and apply
@pytest.mark.e2e and @pytest.mark.skipif.

Example:
    CONNECTION_ID = os.environ.get("TEST_POSTGRES_CONNECTION_ID", "")

    @pytest.mark.e2e
    @pytest.mark.skipif(not CONNECTION_ID, reason="TEST_POSTGRES_CONNECTION_ID not set")
    class TestPostgreSQLE2E(BaseE2ETest):
        CONNECTION_ID = CONNECTION_ID
"""
import pytest
from backend.tests.e2e.conftest import make_client, default_params


class BaseE2ETest:
    CONNECTION_ID: str = ""

    @pytest.fixture(scope="class")
    def client(self):
        return make_client()

    @pytest.fixture(scope="class")
    def params(self):
        return default_params(type(self).CONNECTION_ID)

    @pytest.fixture(scope="class")
    def first_event(self, client, params):
        r = client.get("/api/events", params={"connection_id": type(self).CONNECTION_ID})
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

    def test_path_funnel(self, client, params):
        r = client.get("/api/events", params={"connection_id": type(self).CONNECTION_ID})
        events = r.json().get("events", [])
        if len(events) < 2:
            pytest.skip("Need at least 2 distinct events for funnel test")
        funnel_events = ",".join(events[:2])
        r = client.get("/api/path-funnel", params={**params, "events": funnel_events})
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
        r = client.get("/api/pivot/options", params={"connection_id": type(self).CONNECTION_ID})
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
            params={"connection_id": type(self).CONNECTION_ID},
        )
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert isinstance(body["user_id"], str)

    def test_connection_test(self, client):
        r = client.post(f"/api/connections/{type(self).CONNECTION_ID}/test")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_connection_schema(self, client):
        r = client.get(f"/api/connections/{type(self).CONNECTION_ID}/schema")
        assert r.status_code == 200
        # Returns null when no schema config has been saved yet, dict otherwise
        assert r.json() is None or isinstance(r.json(), dict)

    def test_connection_schema_detect(self, client):
        r = client.get(f"/api/connections/{type(self).CONNECTION_ID}/schema/detect")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["tables"], list)
        assert isinstance(body["columns"], list)
        assert len(body["tables"]) > 0
