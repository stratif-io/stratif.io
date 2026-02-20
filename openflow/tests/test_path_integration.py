"""Integration tests for path analysis with real database."""

import pytest

from openflow.db import get_db
from openflow.services import generate_path_analysis_query


@pytest.fixture
def db():
    return get_db()


class TestPathAnalysisIntegration:
    def test_basic_path_analysis(self, db):
        query = generate_path_analysis_query(
            table_name="events",
            min_path_length=2,
            max_path_length=3,
            top_n=5,
            sql_dialect="duckdb",
        )
        result = db.execute(query)

        assert len(result) <= 5
        for row in result:
            path, path_length, occurrence_count, unique_users, percentage = row[:5]
            assert path_length >= 2
            assert path_length <= 3
            assert occurrence_count > 0
            assert unique_users > 0
            assert percentage > 0
            assert " -> " in path

    def test_path_analysis_with_date_range(self, db):
        query = generate_path_analysis_query(
            table_name="events",
            min_path_length=2,
            max_path_length=4,
            date_range=("2026-01-01", "2026-01-31"),
            sql_dialect="duckdb",
        )
        result = db.execute(query)

        for row in result:
            assert row[2] > 0  # occurrence_count

    def test_path_analysis_with_start_event(self, db):
        query = generate_path_analysis_query(
            table_name="events",
            start_event="Home",
            min_path_length=2,
            max_path_length=3,
            top_n=10,
            sql_dialect="duckdb",
        )
        result = db.execute(query)

        for row in result:
            path = row[0]
            first_event = path.split(" -> ")[0]
            assert first_event == "Home", (
                f"Path should start with Home, got {first_event}"
            )

    def test_path_analysis_with_end_event(self, db):
        query = generate_path_analysis_query(
            table_name="events",
            end_event="Purchase",
            min_path_length=2,
            max_path_length=5,
            top_n=10,
            sql_dialect="duckdb",
        )
        result = db.execute(query)

        for row in result:
            path = row[0]
            last_event = path.split(" -> ")[-1]
            assert last_event == "Purchase", (
                f"Path should end with Purchase, got {last_event}"
            )
