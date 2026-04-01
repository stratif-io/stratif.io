"""Unit tests for path analysis and path funnel."""

import pytest

from backend.api.paths import get_paths
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.path_analyzer import (
    PathAnalyzerError,
    generate_path_analysis_query,
)


class CapturingDB(AnalyticsDatabase):
    """Records every (query, params) pair passed to execute()."""

    def __init__(self):
        self.calls: list[tuple[str, list]] = []

    def execute(self, query, params=None):
        self.calls.append((query, params or []))
        # First call = paths query (returns rows), subsequent calls = COUNT(*) queries
        if len(self.calls) == 1:
            return []  # empty paths result
        return [(0,)]  # COUNT(*) = 0

    def get_session_timeout_minutes(self):
        return 30

    def get_dialect(self):
        return "duckdb"

    def get_device_type_expr(self):
        return "device_type"

    def build_filter_clauses(self, filters):
        return [], []


class TestPathAnalyzerQuery:
    def test_min_path_length_validation(self):
        with pytest.raises(
            PathAnalyzerError, match="min_path_length must be at least 2"
        ):
            generate_path_analysis_query(table_name="events", min_path_length=1)

    def test_max_path_length_validation(self):
        with pytest.raises(
            PathAnalyzerError, match="max_path_length must be >= min_path_length"
        ):
            generate_path_analysis_query(
                table_name="events", min_path_length=5, max_path_length=3
            )

    def test_time_unit_validation(self):
        with pytest.raises(PathAnalyzerError, match="Invalid time_unit"):
            generate_path_analysis_query(table_name="events", time_unit="weeks")

    def test_group_by_validation(self):
        with pytest.raises(PathAnalyzerError, match="Invalid group_by"):
            generate_path_analysis_query(table_name="events", group_by="session")

    def test_basic_query_generation(self):
        query = generate_path_analysis_query(
            table_name="events",
            min_path_length=2,
            max_path_length=5,
            top_n=10,
        )
        assert "WITH filtered_events AS" in query
        assert "user_sequences" in query
        assert "all_subsequences" in query
        assert "valid_paths" in query

    def test_query_with_date_range(self):
        query = generate_path_analysis_query(
            table_name="events",
            date_range=("2026-01-01", "2026-01-31"),
        )
        assert "2026-01-01 00:00:00" in query
        assert "2026-01-31 23:59:59" in query

    def test_query_with_start_event(self):
        query = generate_path_analysis_query(
            table_name="events",
            start_event="Home",
        )
        assert "path[1] = 'Home'" in query

    def test_query_with_end_event(self):
        query = generate_path_analysis_query(
            table_name="events",
            end_event="Purchase",
        )
        assert "ARRAY_LENGTH(path)" in query
        assert "'Purchase'" in query

    def test_query_with_time_constraint(self):
        query = generate_path_analysis_query(
            table_name="events",
            max_time_between_events=60,
            time_unit="minutes",
        )
        assert "3600" in query  # 60 minutes = 3600 seconds


class TestPathsLimitSQL:
    """Regression tests for ClickHouse LIMIT compatibility.

    ClickHouse requires LIMIT to be an integer constant, not a parameter.
    LIMIT '5' (string) raises: LIMIT expression must be constant with numeric type.

    See: DB::Exception: INVALID_LIMIT_EXPRESSION — version 24.10.2.80
    """

    def _paths_query(self, limit=5) -> str:
        db = CapturingDB()
        get_paths(
            db=db,
            target_event="Purchase",
            start_date="2026-01-01",
            end_date="2026-01-31",
            device_type=None,
            limit=limit,
        )
        return db.calls[0][0]  # first execute call = main paths query

    def test_limit_is_integer_literal_not_parameter(self):
        query = self._paths_query(limit=5)
        # LIMIT must be an inline integer, not a ? placeholder
        assert "LIMIT ?" not in query, "LIMIT must not be parameterized — ClickHouse rejects LIMIT ?"
        assert "LIMIT 5" in query

    def test_limit_value_not_in_params(self):
        db = CapturingDB()
        get_paths(
            db=db,
            target_event="Purchase",
            start_date=None,
            end_date=None,
            device_type=None,
            limit=10,
        )
        main_query, params = db.calls[0]
        assert "10" not in [str(p) for p in params], (
            "limit value must not appear in query params — it should be inlined in SQL"
        )
        assert "LIMIT 10" in main_query

    def test_limit_respects_value(self):
        for limit in [1, 5, 10, 20]:
            query = self._paths_query(limit=limit)
            assert f"LIMIT {limit}" in query
