"""Unit tests for path analysis and path funnel."""

import duckdb
import pytest

from backend.api.paths import get_paths
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.path_analyzer import (
    PathAnalyzer,
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
        # Standard SQL (non-DuckDB) path applies time constraints inline
        query = generate_path_analysis_query(
            table_name="events",
            max_time_between_events=60,
            time_unit="minutes",
            sql_dialect="sqlite",
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
        assert "LIMIT ?" not in query, (
            "LIMIT must not be parameterized — ClickHouse rejects LIMIT ?"
        )
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

    def test_produces_exact_counts_cte(self):
        query = generate_path_analysis_query(table_name="events")
        assert "exact_counts" in query
        assert "contains_matches" in query

    def test_has_user_sequences(self):
        query = generate_path_analysis_query(table_name="events")
        assert "user_sequences" in query

    def test_null_timing(self):
        query = generate_path_analysis_query(table_name="events")
        assert "NULL" in query  # avg/median are NULL in contains mode

    def test_has_cross_join_and_match_count(self):
        query = generate_path_analysis_query(table_name="events")
        assert "CROSS JOIN" in query
        assert "match_count" in query
        assert "WHERE match_count > 0" in query
        assert "SUM(match_count)" in query

    def test_has_generate_series(self):
        query = generate_path_analysis_query(table_name="events")
        assert "generate_series" in query


class TestPathAnalysisCountingModeAPI:
    def test_api_produces_contains_query(self):
        db = CapturingDB()
        from backend.api.paths import get_path_analysis

        get_path_analysis(
            db=db,
            start_event=None,
            end_event=None,
            min_path_length=2,
            max_path_length=5,
            max_time_between_events=None,
            time_unit="seconds",
            top_n=10,
            group_by="user_id",
            start_date=None,
            end_date=None,
            filters=None,
            event_filters=None,
        )
        query = db.calls[0][0]
        assert "contains_matches" in query


class TestPathCountingModeCounts:
    """Integration tests running real DuckDB queries against toy data.

    Toy scenario
    ------------
    Two users:
      u1: Home → Search → ProductView → Home → Search   (5 events, loops back)
      u2: Home → Search → ProductView                   (3 events, straight path)

    Expected exact occurrence counts (no duplicates):
      Home → Search → ProductView          2  (once per user)
      Home → Search → ProductView → Home   1  (u1 only)
      Search → ProductView → Home → Search 1  (u1 only)
      ... etc.

    Critical invariant: for every path, contains_count >= exact_count.
    The exact counts must also be correct (no inflation from duplicate
    DuckDB array slices when j > ARRAY_LENGTH(events)).
    """

    @pytest.fixture
    def conn(self):
        c = duckdb.connect()
        c.execute("""
            CREATE TABLE events AS
            SELECT * FROM (VALUES
              ('u1', 's1', 'Home',        TIMESTAMPTZ '2024-01-01 10:00:00', '{}'),
              ('u1', 's1', 'Search',      TIMESTAMPTZ '2024-01-01 10:01:00', '{}'),
              ('u1', 's1', 'ProductView', TIMESTAMPTZ '2024-01-01 10:02:00', '{}'),
              ('u1', 's1', 'Home',        TIMESTAMPTZ '2024-01-01 10:03:00', '{}'),
              ('u1', 's1', 'Search',      TIMESTAMPTZ '2024-01-01 10:04:00', '{}'),
              ('u2', 's2', 'Home',        TIMESTAMPTZ '2024-01-01 11:00:00', '{}'),
              ('u2', 's2', 'Search',      TIMESTAMPTZ '2024-01-01 11:01:00', '{}'),
              ('u2', 's2', 'ProductView', TIMESTAMPTZ '2024-01-01 11:02:00', '{}')
            ) t(user_id, session_id, event_name, timestamp, properties)
        """)
        return c

    def _run(self, conn):
        pa = PathAnalyzer(dialect="duckdb")
        q = pa.generate_path_analysis_query(
            "events",
            min_path_length=2,
            max_path_length=5,
            top_n=20,
        )
        rows = conn.execute(q).fetchall()
        # columns: path, path_length, occurrence_count, unique_users, ...
        return {r[0]: {"occ": r[2], "users": r[3]} for r in rows}

    def test_no_duplicate_counts(self, conn):
        """Contains mode must not inflate counts due to out-of-bounds array slices.

        u1 has 5 events; max_path_length=5. The longest path for u1 starts at
        i=1 and ends at j=5. The old bug generated j=6 as well, which DuckDB
        silently truncated to the same 5-element slice — doubling the count for
        every max-length path.
        """
        result = self._run(conn)

        # Home→Search→ProductView appears exactly once per user = 2 total.
        assert result["Home -> Search -> ProductView"]["occ"] == 2

        # The full 5-event path for u1 appears exactly once, not twice.
        assert result["Home -> Search -> ProductView -> Home -> Search"]["occ"] == 1

    def test_shorter_path_gte_longer_extension(self, conn):
        """A shorter path must have contains count >= any longer path that extends it.

        Home→Search→ProductView (3 events) appears in every session that also
        has Home→Search→ProductView→Home (4 events), so the 3-event count must
        be >= the 4-event count.

        Note: the minimum returned path length is 3 events (not 2) because the
        subsequence CTE uses `j - i >= min_path_length` where length = j-i+1,
        so 2-event paths are not emitted when min_path_length=2.
        """
        result = self._run(conn)

        three_step = result["Home -> Search -> ProductView"]["occ"]
        four_step = result["Home -> Search -> ProductView -> Home"]["occ"]
        assert three_step >= four_step

    def test_unique_users_correct(self, conn):
        """unique_users for Home→Search→ProductView should be 2 (both users)."""
        result = self._run(conn)
        assert result["Home -> Search -> ProductView"]["users"] == 2
