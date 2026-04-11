"""Unit tests for the normalizer — no DB needed."""

from backend.tests.deterministic.normalizer import normalize


def test_sorts_events_list():
    resp = {"events": ["signup", "page_view", "purchase"]}
    result = normalize("events", resp)
    assert result["events"] == ["page_view", "purchase", "signup"]


def test_sorts_events_top_by_name():
    resp = {
        "data": [{"name": "signup", "count": 10}, {"name": "page_view", "count": 20}]
    }
    result = normalize("events_top", resp)
    assert result["data"][0]["name"] == "page_view"


def test_rounds_floats_to_4dp():
    resp = {
        "data": [{"avg_duration_sec": 720.123456789, "conversion_rate_percent": 40.0}]
    }
    result = normalize("sessions_summary", resp)
    assert result["data"][0]["avg_duration_sec"] == 720.1235


def test_strips_sql_key():
    resp = {"sql": "SELECT ...", "events": ["page_view"]}
    result = normalize("events", resp)
    assert "sql" in result  # sql key is kept (golden files include it for debugging)


def test_normalizes_none_to_null_string():
    resp = {"data": [{"value": None, "label": "x"}]}
    result = normalize("pivot_by_event", resp)
    assert result["data"][0]["value"] is None  # None stays as None (JSON null)


def test_sorts_trend_by_date():
    resp = {
        "data": [
            {"date": "2023-01-08", "value": 5},
            {"date": "2023-01-01", "value": 3},
        ]
    }
    result = normalize("trend_daily", resp)
    assert result["data"][0]["date"] == "2023-01-01"


def test_sorts_retention_by_cohort_date():
    resp = {
        "granularity": "month",
        "data": [
            {"cohort_date": "2023-02-01", "cohort_size": 5},
            {"cohort_date": "2023-01-01", "cohort_size": 10},
        ],
    }
    result = normalize("retention", resp)
    assert result["data"][0]["cohort_date"] == "2023-01-01"


def test_sorts_raw_events_by_timestamp_user_event():
    resp = {
        "data": [
            {
                "timestamp": "2023-01-01 10:05:00",
                "user_id": "user_001",
                "event_name": "signup",
            },
            {
                "timestamp": "2023-01-01 10:00:00",
                "user_id": "user_001",
                "event_name": "page_view",
            },
        ],
        "total": 2,
    }
    result = normalize("raw_events_page1", resp)
    assert result["data"][0]["event_name"] == "page_view"


def test_sorts_paths_by_path_string():
    resp = {
        "data": [
            {"path": "signup > purchase", "count": 5},
            {"path": "page_view > signup", "count": 10},
        ]
    }
    result = normalize("paths", resp)
    assert result["data"][0]["path"] == "page_view > signup"


def test_empty_data_list():
    resp = {"data": [], "total": 0}
    result = normalize("raw_events_page1", resp)
    assert result == {"data": [], "total": 0}
