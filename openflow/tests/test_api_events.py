"""Integration tests for /api/events, /api/events/top, /api/raw/events endpoints."""


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
