"""Integration tests for /api/retention endpoint."""


class TestRetentionEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get(
            "/api/retention",
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
            "/api/retention",
            params={
                "start_date": "baddate",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 400
