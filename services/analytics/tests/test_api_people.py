"""Integration tests for GET /api/users endpoint."""


class TestListUsersEndpoint:
    def test_returns_200_with_users(self, client):
        response = client.get("/api/users")
        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert len(body["data"]) == 2

    def test_each_user_has_required_fields(self, client):
        response = client.get("/api/users")
        assert response.status_code == 200
        user = response.json()["data"][0]
        assert "user_id" in user
        assert "event_count" in user
        assert "first_seen" in user
        assert "last_seen" in user

    def test_event_count_is_correct(self, client):
        response = client.get("/api/users")
        assert response.status_code == 200
        users = {u["user_id"]: u for u in response.json()["data"]}
        assert users["user-1"]["event_count"] == 2
        assert users["user-2"]["event_count"] == 2

    def test_date_filter_excludes_users(self, client):
        # user-2 events are on 2024-01-16, user-1 on 2024-01-15
        response = client.get(
            "/api/users",
            params={"start_date": "2024-01-16", "end_date": "2024-01-16"},
        )
        assert response.status_code == 200
        ids = [u["user_id"] for u in response.json()["data"]]
        assert "user-2" in ids
        assert "user-1" not in ids

    def test_pagination_limit(self, client):
        response = client.get("/api/users", params={"limit": 1})
        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

    def test_pagination_offset(self, client):
        response = client.get("/api/users", params={"limit": 1, "offset": 1})
        assert response.status_code == 200
        assert len(response.json()["data"]) == 1

    def test_ordered_by_last_seen_desc(self, client):
        response = client.get("/api/users")
        assert response.status_code == 200
        users = response.json()["data"]
        last_seens = [u["last_seen"] for u in users]
        assert last_seens == sorted(last_seens, reverse=True)
