"""Integration tests for /api/mission-control endpoint."""

import json

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

    def test_new_users_excludes_users_with_earlier_history(self, client):
        # user-1's first event is 2024-01-15, user-2's first event is 2024-01-16
        # Querying only 2024-01-16: user-2 is new, user-1 is returning
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-16", "end_date": "2024-01-16"},
        )
        body = response.json()
        # user-1's first event (2024-01-15) is outside this window, so not new
        # user-1 has no events on 2024-01-16, so unique_users=1 (user-2 only)
        assert body["current"]["new_users"] == 1  # only user-2
        assert (
            body["current"]["returning_users"] == 0
        )  # user-1 not active on 2024-01-16

    def test_dau_mau_ratio_nonzero_when_data_exists(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        # There are 2 users active in this 2-day window — ratio must be > 0
        assert body["current"]["dau_mau_ratio"] > 0.0

    def test_filters_param_accepted(self, client):
        """Filters param is accepted without error and scopes results."""
        response = client.get(
            "/api/mission-control",
            params={
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
                "filters": json.dumps({}),
            },
        )
        assert response.status_code == 200

    def test_dau_mau_mau_includes_users_before_start_date(self, client):
        # Querying only 2024-01-16: user-1 (from 2024-01-15) is in the 30-day MAU window.
        # Both DAU and MAU use the same trailing 30-day window ending 2024-01-16.
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-16", "end_date": "2024-01-16"},
        )
        body = response.json()
        # MAU = distinct users in 30-day window = 2 (user-1 + user-2)
        # DAU = avg daily distinct users in same window: (1 + 1) / 2 days with data = 1.0
        # ratio = 1.0 / 2 = 0.5
        assert body["current"]["dau_mau_ratio"] == pytest.approx(0.5, abs=0.01)


class TestFilterApplicationAcrossMetrics:
    """Filters must scope every user-classification metric consistently.

    Without this, applying a filter (e.g. country=US) produces incoherent
    results: new_users ignores the filter, returning/resurrected/churned
    miscategorize users whose global history differs from their history
    within the filtered segment.

    Fixture seed (filterable_client, conftest.py): period 2024-03-15.
    With filter country=US:
      - user-A: first US event in period (was UK in 2023) → NEW
      - user-C: US before + in period, within 30d window → RETURNING
      - user-D: first ever event in period → NEW
      - user-E: first US event in period (was UK 2024-03-01) → NEW
      - user-B: UK only, absent in current period → NOT in any count
    """

    PERIOD = {"start_date": "2024-03-15", "end_date": "2024-03-15"}
    US_FILTER = {"filters": json.dumps({"country": "US"})}

    def _get(self, filterable_client, metric: str):
        return filterable_client.get(
            "/api/mission-control/metric",
            params={"metric": metric, **self.PERIOD, **self.US_FILTER},
        ).json()["current"]

    def test_unique_users_respects_filter(self, filterable_client):
        # 4 users have a US event on 2024-03-15: A, C, D, E
        assert self._get(filterable_client, "unique_users") == 4

    def test_new_users_respects_filter(self, filterable_client):
        # NEW = first event *in the filtered segment* falls in period.
        # A, D, E all qualify (C's first US event is 2024-02-20).
        assert self._get(filterable_client, "new_users") == 3

    def test_returning_users_respects_filter(self, filterable_client):
        # RETURNING = prior activity *within filtered segment*, within window.
        # Only user-C qualifies (US on 2024-02-20, within 30d cutoff 2024-02-14).
        assert self._get(filterable_client, "returning_users") == 1

    def test_resurrected_users_respects_filter(self, filterable_client):
        # RESURRECTED = prior activity in filtered segment, beyond window.
        # No user has a US event before 2024-02-14, so the count is 0.
        assert self._get(filterable_client, "resurrected_users") == 0

    def test_churned_users_respects_filter(self, filterable_client):
        # CHURNED = active in prev period (filtered), absent in current (filtered).
        # No user has a US event on 2024-03-14 (prev period). Count is 0.
        assert self._get(filterable_client, "churned_users") == 0

    def test_user_partition_identity_holds_with_filter(self, filterable_client):
        """new + returning + resurrected == unique_users (under any filter)."""
        new = self._get(filterable_client, "new_users")
        ret = self._get(filterable_client, "returning_users")
        res = self._get(filterable_client, "resurrected_users")
        uniq = self._get(filterable_client, "unique_users")
        assert new + ret + res == uniq, (
            f"partition broken: new={new} + ret={ret} + res={res} != uniq={uniq}"
        )

    def test_trend_resurrected_respects_filter(self, filterable_client):
        resp = filterable_client.get(
            "/api/mission-control/trend",
            params={
                "metric": "resurrected_users",
                "start_date": "2024-03-15",
                "end_date": "2024-03-15",
                **self.US_FILTER,
            },
        )
        assert resp.status_code == 200
        # No US user has prior history beyond the resurrection window.
        assert sum(d["value"] for d in resp.json()["data"]) == 0

    def test_trend_churned_respects_filter(self, filterable_client):
        resp = filterable_client.get(
            "/api/mission-control/trend",
            params={
                "metric": "churned_users",
                "start_date": "2024-03-15",
                "end_date": "2024-03-15",
                **self.US_FILTER,
            },
        )
        assert resp.status_code == 200
        # No US user was active in the 7-day prev window and absent today.
        assert sum(d["value"] for d in resp.json()["data"]) == 0

    def test_aggregate_endpoint_respects_filter(self, filterable_client):
        """The /api/mission-control (aggregate) endpoint mirrors per-metric values."""
        resp = filterable_client.get(
            "/api/mission-control",
            params={**self.PERIOD, **self.US_FILTER},
        )
        assert resp.status_code == 200
        cur = resp.json()["current"]
        assert cur["unique_users"] == 4
        assert cur["new_users"] == 3
        assert cur["returning_users"] == 1
        assert cur["resurrected_users"] == 0
        assert cur["churned_users"] == 0


class TestMissionControlTrendEndpoint:
    def test_trend_happy_path(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "total_events",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["metric"] == "total_events"
        assert isinstance(body["data"], list)
        assert all("date" in d and "value" in d for d in body["data"])

    def test_trend_unknown_metric_returns_400(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "bogus_metric",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 400

    def test_trend_unique_users_returns_daily_counts(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "unique_users",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        body = response.json()
        assert all(d["value"] >= 0 for d in body["data"])

    def test_trend_new_users_non_negative(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "new_users",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert all(d["value"] >= 0 for d in body["data"])

    def test_trend_dau_mau_ratio_between_0_and_1(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "dau_mau_ratio",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert all(0.0 <= d["value"] <= 1.0 for d in body["data"])

    def test_trend_returns_all_dates_in_range(self, client):
        """new_users and returning_users fill in 0s for empty days."""
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "new_users",
                "start_date": "2024-01-14",
                "end_date": "2024-01-16",
            },
        )
        body = response.json()
        dates = [d["date"] for d in body["data"]]
        assert "2024-01-14" in dates
        assert "2024-01-15" in dates
        assert "2024-01-16" in dates


class TestMissionControlMetricEndpoint:
    def test_returns_metric_current_previous(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "total_events",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["metric"] == "total_events"
        assert isinstance(body["current"], (int, float))
        assert isinstance(body["previous"], (int, float))

    def test_unsupported_metric_returns_400(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "bogus",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 400

    def test_invalid_date_returns_400(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "total_events",
                "start_date": "not-a-date",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 400

    def test_start_after_end_returns_400(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "total_events",
                "start_date": "2024-01-31",
                "end_date": "2024-01-01",
            },
        )
        assert response.status_code == 400

    def test_same_day_is_valid(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "unique_users",
                "start_date": "2024-01-15",
                "end_date": "2024-01-15",
            },
        )
        assert response.status_code == 200
        assert response.json()["metric"] == "unique_users"

    def test_empty_range_returns_zeros(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "total_events",
                "start_date": "2000-01-01",
                "end_date": "2000-01-02",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["current"] == 0
        assert body["previous"] == 0

    def test_total_events_nonzero_for_seeded_data(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "total_events",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.json()["current"] >= 1

    def test_returning_users_non_negative(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "returning_users",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.json()["current"] >= 0

    def test_dau_mau_ratio_between_0_and_1(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={
                "metric": "dau_mau_ratio",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        body = response.json()
        assert 0.0 <= body["current"] <= 1.0

    def test_all_14_metrics_return_200(self, client):
        metrics = [
            "total_events",
            "unique_users",
            "total_sessions",
            "avg_session_duration_sec",
            "avg_events_per_session",
            "new_users",
            "returning_users",
            "resurrected_users",
            "dau_mau_ratio",
            "wau",
            "avg_active_days",
            "power_users",
            "churned_users",
            "retention_rate",
        ]
        for m in metrics:
            r = client.get(
                "/api/mission-control/metric",
                params={
                    "metric": m,
                    "start_date": "2024-01-15",
                    "end_date": "2024-01-16",
                },
            )
            assert r.status_code == 200, f"metric {m} returned {r.status_code}"


def test_mission_control_aggregate_includes_all_14_metrics(client):
    resp = client.get(
        "/api/mission-control",
        params={"start_date": "2024-01-01", "end_date": "2024-01-31"},
    )
    assert resp.status_code == 200
    current = resp.json()["current"]
    expected_keys = {
        "total_events",
        "unique_users",
        "total_sessions",
        "avg_session_duration_sec",
        "avg_events_per_session",
        "new_users",
        "returning_users",
        "resurrected_users",
        "churned_users",
        "retention_rate",
        "wau",
        "avg_active_days",
        "power_users",
        "dau_mau_ratio",
    }
    assert expected_keys == set(current.keys())


def test_resurrected_users_in_supported_metrics(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "resurrected_users",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200


def test_returning_users_non_negative(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "returning_users",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["current"] >= 0


def test_resurrected_users_non_negative(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "resurrected_users",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["current"] >= 0


def test_analytics_db_exposes_resurrection_window():
    from unittest.mock import MagicMock

    from backend.services.analytics_db import AnalyticsDatabase

    backend_mock = MagicMock()
    backend_mock.dialect_name = "sqlite"
    db = AnalyticsDatabase(
        conn=MagicMock(),
        backend=backend_mock,
        events_cte=None,
        resurrection_window_days=14,
        power_user_threshold_days=7,
    )
    assert db.get_resurrection_window_days() == 14
    assert db.get_power_user_threshold_days() == 7


def test_analytics_db_defaults():
    from unittest.mock import MagicMock

    from backend.services.analytics_db import AnalyticsDatabase

    backend_mock = MagicMock()
    backend_mock.dialect_name = "sqlite"
    db = AnalyticsDatabase(conn=MagicMock(), backend=backend_mock, events_cte=None)
    assert db.get_resurrection_window_days() == 30
    assert db.get_power_user_threshold_days() == 4


def test_trend_resurrected_users_returns_daily_counts(client):
    resp = client.get(
        "/api/mission-control/trend",
        params={
            "metric": "resurrected_users",
            "start_date": "2024-01-15",
            "end_date": "2024-01-16",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert all(d["value"] >= 0 for d in body["data"])


def test_churned_users_non_negative(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "churned_users",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["current"] >= 0


def test_retention_rate_between_zero_and_one(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "retention_rate",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    assert 0.0 <= resp.json()["current"] <= 1.0


def test_retention_rate_breakdown_in_response(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "retention_rate",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "breakdown" in data
    assert "retained_count" in data["breakdown"]
    assert "prev_unique_users" in data["breakdown"]


def test_trend_churned_users(client):
    resp = client.get(
        "/api/mission-control/trend",
        params={
            "metric": "churned_users",
            "start_date": "2024-01-15",
            "end_date": "2024-01-16",
        },
    )
    assert resp.status_code == 200
    assert all(d["value"] >= 0 for d in resp.json()["data"])


def test_trend_retention_rate(client):
    resp = client.get(
        "/api/mission-control/trend",
        params={
            "metric": "retention_rate",
            "start_date": "2024-01-15",
            "end_date": "2024-01-16",
        },
    )
    assert resp.status_code == 200
    assert all(0.0 <= d["value"] <= 1.0 for d in resp.json()["data"])


def test_wau_non_negative(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={"metric": "wau", "start_date": "2024-01-01", "end_date": "2024-01-31"},
    )
    assert resp.status_code == 200
    assert resp.json()["current"] >= 0


def test_avg_active_days_non_negative(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "avg_active_days",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["current"] >= 0


def test_power_users_lte_unique_users(client):
    uniq = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "unique_users",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    ).json()["current"]
    power = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "power_users",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    ).json()["current"]
    assert power <= uniq


def test_trend_wau(client):
    resp = client.get(
        "/api/mission-control/trend",
        params={"metric": "wau", "start_date": "2024-01-15", "end_date": "2024-01-16"},
    )
    assert resp.status_code == 200
    assert all(d["value"] >= 0 for d in resp.json()["data"])


def test_trend_power_users(client):
    resp = client.get(
        "/api/mission-control/trend",
        params={
            "metric": "power_users",
            "start_date": "2024-01-15",
            "end_date": "2024-01-16",
        },
    )
    assert resp.status_code == 200
    assert all(d["value"] >= 0 for d in resp.json()["data"])


def test_metric_response_includes_sql(client):
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "unique_users",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "sql" in data
    sql = data["sql"]
    sql_text = " ".join(sql) if isinstance(sql, list) else sql
    assert "COUNT(DISTINCT" in sql_text


def test_dau_mau_ratio_sql_uses_portable_cast(client):
    """dau_mau_ratio must not use CAST(... AS DOUBLE) — that syntax is DuckDB-only
    and raises 'type "double" does not exist' on PostgreSQL.
    The portable form is multiplication by 1.0."""
    resp = client.get(
        "/api/mission-control/metric",
        params={
            "metric": "dau_mau_ratio",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    sql = data["sql"]
    sql_text = " ".join(sql) if isinstance(sql, list) else sql
    # "CAST(... AS DOUBLE)" without "PRECISION" is DuckDB-only — must not appear
    assert "AS DOUBLE)" not in sql_text, (
        "dau_mau_ratio SQL uses CAST(... AS DOUBLE) which fails on PostgreSQL. "
        "Use '1.0 * COUNT(*)' instead."
    )
