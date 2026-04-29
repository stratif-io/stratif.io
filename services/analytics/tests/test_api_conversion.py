"""Integration tests for /api/conversion endpoint."""


class TestConversionEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get(
            "/api/conversion",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "entry_event": "Home",
                "goal_event": "Purchase",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert body["entry_event"] == "Home"
        assert body["goal_event"] == "Purchase"

    def test_invalid_date_returns_400(self, client):
        response = client.get(
            "/api/conversion",
            params={
                "start_date": "not-a-date",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 400
