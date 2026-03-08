"""Unit tests for path analysis and path funnel."""

import pytest

from backend.services.path_analyzer import (
    PathAnalyzerError,
    generate_path_analysis_query,
)


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
