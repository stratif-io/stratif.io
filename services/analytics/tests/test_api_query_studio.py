"""Integration tests for POST /api/query-studio/execute endpoint."""


class TestQueryStudioExecute:
    def test_valid_sql_returns_columns_and_rows(self, client):
        response = client.post(
            "/api/query-studio/execute",
            json={"sql": "SELECT 1 AS n"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["columns"] == ["n"]
        assert body["rows"] == [[1]]
        assert isinstance(body["execution_time_ms"], int)
        assert body["error"] is None

    def test_multi_column_query(self, client):
        response = client.post(
            "/api/query-studio/execute",
            json={"sql": "SELECT 42 AS a, 'hello' AS b"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["columns"] == ["a", "b"]
        assert body["rows"] == [[42, "hello"]]
        assert body["error"] is None

    def test_invalid_sql_returns_200_with_error_message(self, client):
        response = client.post(
            "/api/query-studio/execute",
            json={"sql": "SELECT * FROM nonexistent_table_xyz"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["columns"] == []
        assert body["rows"] == []
        assert body["error"] is not None
        assert len(body["error"]) > 0

    def test_query_against_events_table(self, client):
        response = client.post(
            "/api/query-studio/execute",
            json={"sql": "SELECT COUNT(*) AS cnt FROM events"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["columns"] == ["cnt"]
        assert body["rows"] == [[4]]
        assert body["error"] is None
