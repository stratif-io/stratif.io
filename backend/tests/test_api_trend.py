"""Integration tests for /api/trend endpoint."""


class TestTrendEndpoint:
    def test_happy_path_returns_200_with_data_list(self, client):
        response = client.get(
            "/api/trend",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert isinstance(body["data"], list)

    def test_invalid_date_returns_400(self, client):
        response = client.get(
            "/api/trend",
            params={
                "start_date": "not-a-date",
                "end_date": "2024-01-31",
            },
        )
        assert response.status_code == 400

