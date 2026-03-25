"""Unit tests for path funnel API."""

from backend.api.paths import get_path_funnel
from backend.services.connection_executor import AnalyticsDatabase


class MockDB(AnalyticsDatabase):
    """Minimal mock for testing funnel calculation logic.

    The current get_path_funnel implementation issues:
      - 1 CTE-based funnel query  → one row with N columns (step0_users, step1_users, ...)
      - N occurrence queries       → each returns [(count,)]

    Provide results in that order.
    """

    def __init__(self, results):
        self.results = results
        self.call_count = 0

    def execute(self, query, params=None):
        result = (
            self.results[self.call_count] if self.call_count < len(self.results) else []
        )
        self.call_count += 1
        return result


class CapturingDB(AnalyticsDatabase):
    """MockDB variant that also records every (query, params) pair passed to execute()."""

    def __init__(self, results):
        self.results = results
        self.call_count = 0
        self.calls: list[tuple[str, list]] = []

    def execute(self, query, params=None):
        self.calls.append((query, params or []))
        result = (
            self.results[self.call_count] if self.call_count < len(self.results) else []
        )
        self.call_count += 1
        return result


class TestPathFunnelAPI:
    def test_requires_at_least_two_events(self):
        db = MockDB([])
        result = get_path_funnel(
            events="Home",
            start_date=None,
            end_date=None,
            device_type=None,
            filters=None,
            db=db,
        )
        assert "error" in result
        assert "At least 2 events" in result["error"]

    def test_first_step_has_full_conversion_rate(self):
        # Funnel CTE: step0=50, step1=30. Occurrences: Home=100, Search=60.
        db = MockDB([[(50, 30)], [(100,)], [(60,)]])
        result = get_path_funnel(
            events="Home,Search",
            start_date="2026-01-01",
            end_date="2026-01-31",
            device_type=None,
            filters=None,
            db=db,
        )
        assert result["data"][0]["event"] == "Home"
        assert result["data"][0]["users"] == 50
        assert result["data"][0]["occurrences"] == 100
        assert result["data"][0]["step_conversion_rate"] == 100.0

    def test_step_conversion_rate_calculation(self):
        # Funnel CTE: step0=50, step1=30. Step conversion = 30/50 = 60%.
        db = MockDB([[(50, 30)], [(100,)], [(60,)]])
        result = get_path_funnel(
            events="Home,Search",
            start_date=None,
            end_date=None,
            device_type=None,
            filters=None,
            db=db,
        )
        assert result["data"][0]["users"] == 50
        assert result["data"][1]["users"] == 30
        assert result["data"][1]["step_conversion_rate"] == 60.0  # 30/50 * 100
        assert result["data"][1]["dropoff_users"] == 20

    def test_overall_conversion_rate(self):
        # Funnel CTE: step0=50, step1=30, step2=10.
        db = MockDB([[(50, 30, 10)], [(200,)], [(100,)], [(40,)]])
        result = get_path_funnel(
            events="A,B,C",
            start_date=None,
            end_date=None,
            device_type=None,
            filters=None,
            db=db,
        )
        assert result["data"][0]["overall_conversion_rate"] == 100.0
        assert result["data"][1]["overall_conversion_rate"] == 60.0  # 30/50
        assert result["data"][2]["overall_conversion_rate"] == 20.0  # 10/50

    def test_dropoff_calculation(self):
        # Funnel CTE: step0=100, step1=25. Dropoff = 75, dropoff_rate = 75%.
        db = MockDB([[(100, 25)], [(200,)], [(50,)]])
        result = get_path_funnel(
            events="Home,Purchase",
            start_date=None,
            end_date=None,
            device_type=None,
            filters=None,
            db=db,
        )
        assert result["data"][1]["dropoff_users"] == 75
        assert result["data"][1]["dropoff_rate"] == 75.0

    def test_returns_event_list(self):
        # Funnel CTE: step0=10, step1=5, step2=2.
        db = MockDB([[(10, 5, 2)], [(100,)], [(50,)], [(20,)]])
        result = get_path_funnel(
            events="Home,Search,Purchase",
            start_date=None,
            end_date=None,
            device_type=None,
            filters=None,
            db=db,
        )
        assert result["events"] == ["Home", "Search", "Purchase"]
        assert result["total_steps"] == 3


class TestPathFunnelJoinSQLStructure:
    """Regression tests for ClickHouse JOIN ON compatibility.

    ClickHouse only allows equality conditions between the two joined tables in
    JOIN ON. Non-equality conditions (timestamp >, event_name =, date filters)
    must go in WHERE, not ON.

    See: DB::Exception: join expression contains column from left and right table
         (INVALID_JOIN_ON_EXPRESSION) — version 24.10.2.80
    """

    def _funnel_query(self, events: str, start_date=None, end_date=None) -> str:
        """Return the first SQL query (the funnel CTE) generated for the given events."""
        n = len([e for e in events.split(",") if e.strip()])
        # funnel query + n occurrence queries
        db = CapturingDB([[(tuple(range(n)))]] + [[(10,)]] * n)
        get_path_funnel(
            events=events,
            start_date=start_date,
            end_date=end_date,
            device_type=None,
            filters=None,
            db=db,
        )
        return db.calls[0][0]  # first execute call = funnel CTE query

    def test_join_on_contains_only_user_id_equality(self):
        query = self._funnel_query("Home,Search,Purchase")
        # Extract all JOIN...ON blocks
        import re
        on_clauses = re.findall(r"JOIN\s+events\s+e\s+ON\s+([^G]+?)(?=WHERE|GROUP|$)", query, re.IGNORECASE | re.DOTALL)
        for on_clause in on_clauses:
            # ON may only contain the user_id equality — nothing else
            assert "event_name" not in on_clause, (
                f"event_name filter must be in WHERE, not JOIN ON: {on_clause!r}"
            )
            assert "timestamp >" not in on_clause, (
                f"timestamp inequality must be in WHERE, not JOIN ON: {on_clause!r}"
            )
            assert "timestamp >=" not in on_clause, (
                f"date filter must be in WHERE, not JOIN ON: {on_clause!r}"
            )
            assert "timestamp <=" not in on_clause, (
                f"date filter must be in WHERE, not JOIN ON: {on_clause!r}"
            )

    def test_join_on_contains_only_user_id_equality_with_date_filter(self):
        query = self._funnel_query("Home,Search", start_date="2026-01-01", end_date="2026-01-31")
        import re
        on_clauses = re.findall(r"JOIN\s+events\s+e\s+ON\s+([^G]+?)(?=WHERE|GROUP|$)", query, re.IGNORECASE | re.DOTALL)
        for on_clause in on_clauses:
            assert "event_name" not in on_clause
            assert "timestamp" not in on_clause or "= e.user_id" in on_clause
