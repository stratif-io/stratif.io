"""Integration tests for /api/raw/sessions endpoint."""


class TestSessionsEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get(
            "/api/raw/sessions",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert "data" in body

    def test_invalid_date_returns_400(self, client):
        response = client.get(
            "/api/raw/sessions",
            params={
                "start_date": "2024-13-01",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 400
