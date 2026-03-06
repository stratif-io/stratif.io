"""Unit tests for path funnel API."""

from openflow.api.paths import get_path_funnel
from openflow.services.connection_executor import AnalyticsDatabase


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
