"""Unit tests for path funnel API."""

from openflow.api.paths import get_path_funnel


class MockDB:
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
        result = get_path_funnel(events="Home", db=db, _="key")
        assert "error" in result
        assert "At least 2 events" in result["error"]

    def test_single_step_returns_all_users(self):
        db = MockDB([[(100, 50)]])
        result = get_path_funnel(
            events="Home,Search",
            start_date="2026-01-01",
            end_date="2026-01-31",
            db=db,
            _="key",
        )
        assert result["data"][0]["event"] == "Home"
        assert result["data"][0]["users"] == 50
        assert result["data"][0]["occurrences"] == 100
        assert result["data"][0]["step_conversion_rate"] == 100.0

    def test_step_conversion_rate_calculation(self):
        db = MockDB(
            [
                [(100, 50)],  # Step 1: Home
                [(30, 30)],  # Step 2: Search (30 users out of 50)
            ]
        )
        result = get_path_funnel(events="Home,Search", db=db, _="key")
        assert result["data"][0]["users"] == 50
        assert result["data"][1]["users"] == 30
        assert result["data"][1]["step_conversion_rate"] == 60.0  # 30/50 * 100
        assert result["data"][1]["dropoff_users"] == 20

    def test_overall_conversion_rate(self):
        db = MockDB(
            [
                [(100, 50)],  # Step 1
                [(30, 30)],  # Step 2
                [(10, 10)],  # Step 3
            ]
        )
        result = get_path_funnel(events="A,B,C", db=db, _="key")
        assert result["data"][0]["overall_conversion_rate"] == 100.0
        assert result["data"][1]["overall_conversion_rate"] == 60.0  # 30/50
        assert result["data"][2]["overall_conversion_rate"] == 20.0  # 10/50

    def test_dropoff_calculation(self):
        db = MockDB(
            [
                [(100, 100)],  # Step 1: 100 users
                [(25, 25)],  # Step 2: 25 users
            ]
        )
        result = get_path_funnel(events="Home,Purchase", db=db, _="key")
        assert result["data"][1]["dropoff_users"] == 75
        assert result["data"][1]["dropoff_rate"] == 75.0

    def test_returns_event_list(self):
        db = MockDB([[(10, 5)], [(2, 2)]])
        result = get_path_funnel(events="Home,Search,Purchase", db=db, _="key")
        assert result["events"] == ["Home", "Search", "Purchase"]
        assert result["total_steps"] == 3
