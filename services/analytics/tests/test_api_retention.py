"""Integration tests for /api/retention endpoint."""

import duckdb
import pytest

from services.analytics.backends.duckdb import DuckDBBackend
from services.analytics.main import app
from services.analytics.services.connection_executor import (
    AnalyticsDatabase,
    get_analytics_db,
)


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


def _make_db_bracket() -> AnalyticsDatabase:
    """DB designed to distinguish bracket from exact-day semantics.

    Cohort: user-a and user-b both sign up on 2024-01-01.
    user-a: returns on day 3 only (within D7 bracket, NOT on day 7 exactly)
    user-b: returns on day 8 only (outside D7 bracket, within D30 bracket)
    user-c: never returns

    Expected bracket D7 (days 1–7): 1/3 = 33.3% (user-a hit it)
    Expected bracket D30 (days 1–30): 2/3 = 66.7% (user-a + user-b hit it)
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
            ('user-a', '2024-01-01 08:00:00', 'signup', '{}'),
            ('user-a', '2024-01-04 08:00:00', 'pageview', '{}'),
            ('user-b', '2024-01-01 09:00:00', 'signup', '{}'),
            ('user-b', '2024-01-09 09:00:00', 'pageview', '{}'),
            ('user-c', '2024-01-01 10:00:00', 'signup', '{}')
    """)
    return AnalyticsDatabase(conn=conn, backend=DuckDBBackend(), events_cte=None)


@pytest.fixture()
def client_bracket():
    test_db = _make_db_bracket()

    async def override_db():
        yield test_db

    app.dependency_overrides[get_analytics_db] = override_db
    from starlette.testclient import TestClient

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _make_db_today_cohort() -> AnalyticsDatabase:
    """DB with a user who just signed up today. D7/D30/D90 milestones are unreached."""
    from datetime import date

    today_str = date.today().isoformat()
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR,
            timestamp TIMESTAMP,
            event_name VARCHAR,
            properties VARCHAR
        )
    """)
    conn.execute(f"""
        INSERT INTO events VALUES
            ('user-today', '{today_str} 08:00:00', 'signup', '{{}}')
    """)
    return AnalyticsDatabase(conn=conn, backend=DuckDBBackend(), events_cte=None)


@pytest.fixture()
def client_today_cohort():
    test_db = _make_db_today_cohort()

    async def override_db():
        yield test_db

    app.dependency_overrides[get_analytics_db] = override_db
    from starlette.testclient import TestClient

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestBracketRetention:
    def test_user_returning_within_bracket_counts_for_d7(self, client_bracket):
        """user-a returned on day 3 — must count for D7 bracket (days 1–7)."""
        response = client_bracket.get(
            "/api/retention",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-01",
                "granularity": "day",
            },
        )
        assert response.status_code == 200
        body = response.json()
        cohort = body["data"][0]
        milestones = body["milestones"]
        d7_idx = milestones.index(7)
        d7_pct = cohort["milestone_values"][d7_idx]
        assert d7_pct == pytest.approx(33.3, abs=0.2), (
            f"user-a returned on day 3 → should count for D7 bracket. Got {d7_pct}%"
        )

    def test_user_returning_after_bracket_does_not_count_for_d7(self, client_bracket):
        """user-b returned on day 8 — must NOT count for D7 bracket."""
        response = client_bracket.get(
            "/api/retention",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-01",
                "granularity": "day",
            },
        )
        assert response.status_code == 200
        body = response.json()
        cohort = body["data"][0]
        milestones = body["milestones"]
        d7_idx = milestones.index(7)
        d7_pct = cohort["milestone_values"][d7_idx]
        assert d7_pct == pytest.approx(33.3, abs=0.2), (
            f"D7 bracket should count only user-a (33.3%), not user-b. Got {d7_pct}%"
        )

    def test_user_returning_on_day_8_counts_for_d30(self, client_bracket):
        """user-b returned on day 8 — must count for D30 bracket (days 1–30)."""
        response = client_bracket.get(
            "/api/retention",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-01",
                "granularity": "day",
            },
        )
        assert response.status_code == 200
        body = response.json()
        cohort = body["data"][0]
        milestones = body["milestones"]
        d30_idx = milestones.index(30)
        d30_pct = cohort["milestone_values"][d30_idx]
        assert d30_pct == pytest.approx(66.7, abs=0.2), (
            f"user-a + user-b both hit D30 bracket → 66.7%. Got {d30_pct}%"
        )

    def test_unreached_milestone_returns_null(self, client_bracket):
        """milestone_values must contain only floats or None — never other types.

        Note: the null-for-unreached behavior is date-dependent and verified
        by the frontend type system. This test verifies structural correctness.
        """
        response = client_bracket.get(
            "/api/retention",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-01",
                "granularity": "day",
            },
        )
        assert response.status_code == 200
        body = response.json()
        cohort = body["data"][0]
        assert len(cohort["milestone_values"]) == len(body["milestones"])
        for v in cohort["milestone_values"]:
            assert v is None or isinstance(v, (int, float))

    def test_unreached_milestones_are_null_for_today_cohort(self, client_today_cohort):
        """A cohort from today has not reached D7/D30/D90 — those must be None."""
        from datetime import date

        today = date.today().isoformat()
        response = client_today_cohort.get(
            "/api/retention",
            params={"start_date": today, "end_date": today, "granularity": "day"},
        )
        assert response.status_code == 200
        body = response.json()
        assert len(body["data"]) == 1
        cohort = body["data"][0]
        milestones = body["milestones"]

        # D1 may or may not be None depending on exact timing (day 0 vs day 1),
        # but D7, D30, D90 are definitely unreached for a cohort from today.
        for m, v in zip(milestones, cohort["milestone_values"], strict=False):
            if m >= 7:
                assert v is None, (
                    f"Milestone D{m} should be None for today's cohort, got {v}"
                )


# ---------------------------------------------------------------------------
# ClickHouse dialect — date param format
# ---------------------------------------------------------------------------


class _FakeClickHouseDB:
    """Minimal AnalyticsDatabase stand-in that records execute() params."""

    def __init__(self):
        self.all_params: list = []

    def get_dialect(self) -> str:
        return "clickhouse"

    def execute(self, query: str, params: list | None) -> list[tuple]:
        if params:
            self.all_params.extend(params)
        return []

    def build_filter_clauses(self, filters: dict) -> tuple[list[str], list]:
        return [], []


@pytest.fixture()
def client_clickhouse_fake(monkeypatch):
    """TestClient wired to a fake ClickHouse db that records params."""
    from services.analytics.services import get_analytics_db

    fake_db = _FakeClickHouseDB()

    async def override_db():
        yield fake_db

    app.dependency_overrides[get_analytics_db] = override_db
    from starlette.testclient import TestClient

    with TestClient(app) as c:
        yield c, fake_db

    app.dependency_overrides.clear()


def _make_db_with_country_filter() -> AnalyticsDatabase:
    """DB with a country column so filter_params are non-empty.

    This is necessary to reproduce the params-order bug:
    params = filter_params + filter_params + date_params  ← wrong
    The SQL CTE order is first_seen(filter) → signups(date) → user_activity(filter),
    so 'UK' (a filter value) would land in the date slot and DuckDB raises:
    ConversionException: invalid date field format: "UK".
    """
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR,
            timestamp TIMESTAMP,
            event_name VARCHAR,
            properties VARCHAR,
            country VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('user-uk-1', '2024-01-05 09:00:00', 'Home', '{}', 'UK'),
            ('user-uk-2', '2024-01-10 08:00:00', 'Home', '{}', 'UK'),
            ('user-uk-2', '2024-01-11 08:00:00', 'Home', '{}', 'UK'),
            ('user-us',   '2024-01-03 10:00:00', 'Home', '{}', 'US')
    """)
    return AnalyticsDatabase(
        conn=conn,
        backend=DuckDBBackend(),
        events_cte=None,
        filter_exprs={"country": "country"},
    )


@pytest.fixture()
def client_country_filter():
    test_db = _make_db_with_country_filter()

    async def override_db():
        yield test_db

    app.dependency_overrides[get_analytics_db] = override_db
    from starlette.testclient import TestClient

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestFilterParamsOrder:
    def test_dimension_filter_with_date_range_returns_matching_users(
        self, client_country_filter
    ):
        """A country filter must not corrupt the date params and vice versa.

        Root cause: params = filter_params + filter_params + date_params (wrong)
        The SQL CTE order is first_seen(filter) → signups(date) → user_activity(filter),
        so 'UK' lands in the date slot → signups WHERE first_seen >= 'UK' returns 0 rows.
        Correct order: filter_params + date_params + filter_params.
        """
        response = client_country_filter.get(
            "/api/retention",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "filters": '{"country": "UK"}',
            },
        )
        assert response.status_code == 200
        data = response.json()["data"]
        # There are 2 UK users with first events in Jan 2024 — at least one cohort must appear
        assert len(data) > 0, (
            "Expected UK users to appear in retention cohorts but got 0 cohorts. "
            "Likely params order bug: filter value 'UK' landing in date param slots "
            "causes signups CTE to return 0 rows."
        )


class TestClickHouseDateParams:
    def test_date_range_params_are_date_only_strings(self, client_clickhouse_fake):
        """Retention for ClickHouse must pass '2025-01-01' not '2025-01-01 00:00:00'.

        toStartOfDay(DateTime64) returns Date in ClickHouse 24.x.
        Comparing Date >= '2025-01-01 00:00:00' raises CODE 53 TYPE_MISMATCH.
        Date-only strings ('2025-01-01') work for both Date and DateTime columns.
        """
        client, fake_db = client_clickhouse_fake
        response = client.get(
            "/api/retention",
            params={"start_date": "2025-01-01", "end_date": "2025-01-31"},
        )
        assert response.status_code == 200

        # The date-range params must NOT contain time info (space + HH:MM:SS)
        for p in fake_db.all_params:
            if isinstance(p, str) and ("2025-01-01" in p or "2025-01-31" in p):
                assert " " not in p, (
                    f"ClickHouse date param must be date-only, got: {p!r}. "
                    "toStartOfDay(DateTime64) returns Date in ClickHouse 24.x; "
                    "datetime strings cause TYPE_MISMATCH (code 53)."
                )
