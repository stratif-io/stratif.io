"""Integration tests for /api/retention endpoint."""

import duckdb
import pytest

from backend.backends.duckdb import DuckDBBackend
from backend.main import app
from backend.services.connection_executor import AnalyticsDatabase, get_analytics_db


def _make_db_with_pre_existing_users() -> AnalyticsDatabase:
    """DB where some users had their first event BEFORE the queried date range.

    user-old: first event 2023-12-01 (before range), also active in Jan 2024 —
              should NOT appear in Jan 2024 cohorts.
    user-new: first event 2024-01-05 (within range) — SHOULD appear in Jan 2024 cohort.
    user-retained: first event 2024-01-10 (within range), returns Jan 11 —
                   SHOULD appear with Day 1 retention.
    """
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR,
            timestamp TIMESTAMP,
            event_name VARCHAR,
            properties VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            -- user-old: pre-existing, first event before range
            ('user-old', '2023-12-01 10:00:00', 'Home', '{}'),
            ('user-old', '2024-01-03 10:00:00', 'Home', '{}'),
            ('user-old', '2024-01-20 10:00:00', 'Home', '{}'),
            -- user-new: truly new in range
            ('user-new', '2024-01-05 09:00:00', 'Home', '{}'),
            -- user-retained: new in range, comes back next day
            ('user-retained', '2024-01-10 08:00:00', 'Home', '{}'),
            ('user-retained', '2024-01-11 08:00:00', 'Home', '{}')
    """)
    return AnalyticsDatabase(conn=conn, backend=DuckDBBackend(), events_cte=None)


@pytest.fixture()
def client_pre_existing(monkeypatch):
    """TestClient seeded with pre-existing-user scenario."""
    test_db = _make_db_with_pre_existing_users()

    async def override_db():
        yield test_db

    app.dependency_overrides[get_analytics_db] = override_db

    from starlette.testclient import TestClient

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


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

    def test_excludes_users_whose_first_event_predates_range(self, client_pre_existing):
        """user-old had their first event in Dec 2023 — must NOT appear in Jan 2024 cohorts."""
        response = client_pre_existing.get(
            "/api/retention",
            params={"start_date": "2024-01-01", "end_date": "2024-01-31"},
        )
        assert response.status_code == 200
        data = response.json()["data"]

        # All cohort sizes combined should only count user-new and user-retained (2 users)
        total_users_in_cohorts = sum(row["cohort_size"] for row in data)
        assert total_users_in_cohorts == 2, (
            f"Expected 2 new users in cohorts, got {total_users_in_cohorts}. "
            "user-old had their first event before the date range and must be excluded."
        )

    def test_includes_truly_new_users(self, client_pre_existing):
        """user-new and user-retained, whose first events are within range, must appear."""
        response = client_pre_existing.get(
            "/api/retention",
            params={"start_date": "2024-01-01", "end_date": "2024-01-31"},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) > 0, "Expected at least one cohort with new users"

    def test_day1_retention_for_returning_user(self, client_pre_existing):
        """user-retained returned on Day 1 — their cohort must show Day 1 > 0%."""
        response = client_pre_existing.get(
            "/api/retention",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "granularity": "day",
            },
        )
        assert response.status_code == 200
        data = response.json()["data"]
        milestones = response.json()["milestones"]

        # Find the cohort that contains user-retained (Jan 10)
        jan10_cohorts = [r for r in data if r["cohort_date"].startswith("2024-01-10")]
        assert len(jan10_cohorts) == 1
        cohort = jan10_cohorts[0]

        # Day 1 is the first milestone
        day1_idx = milestones.index(1)
        day1_pct = cohort["milestone_values"][day1_idx]
        assert day1_pct == 100.0, (
            f"user-retained returned on Day 1, expected 100% Day-1 retention, got {day1_pct}%"
        )
