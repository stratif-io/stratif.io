"""Integration tests for /api/mission-control endpoint."""
import pytest


class TestMissionControlEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        assert response.status_code == 200
        body = response.json()
        assert "period" in body
        assert "previous_period" in body
        assert "current" in body
        assert "previous" in body

    def test_current_metrics_shape(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        current = body["current"]
        assert "total_events" in current
        assert "unique_users" in current
        assert "total_sessions" in current
        assert "avg_session_duration_sec" in current
        assert "avg_events_per_session" in current
        assert "new_users" in current
        assert "returning_users" in current
        assert "dau_mau_ratio" in current

    def test_previous_period_computed_correctly(self, client):
        # 2-day period: 2024-01-15 to 2024-01-16
        # previous: 2024-01-13 to 2024-01-14
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        assert body["previous_period"]["start_date"] == "2024-01-13"
        assert body["previous_period"]["end_date"] == "2024-01-14"

    def test_start_date_after_end_date_returns_400(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-31", "end_date": "2024-01-01"},
        )
        assert response.status_code == 400

    def test_total_events_counts_events_in_range(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-15"},
        )
        body = response.json()
        assert body["current"]["total_events"] >= 1

    def test_new_users_uses_global_min_timestamp(self, client):
        # user-1's first event ever is 2024-01-15. Querying that date → new_users >= 1
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-15"},
        )
        body = response.json()
        assert body["current"]["new_users"] >= 1

    def test_returning_users_non_negative(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        assert body["current"]["returning_users"] >= 0
        assert body["previous"]["returning_users"] >= 0

    def test_dau_mau_ratio_between_0_and_1(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        assert 0.0 <= body["current"]["dau_mau_ratio"] <= 1.0
