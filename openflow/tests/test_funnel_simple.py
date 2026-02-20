"""Simple tests for path funnel with real data."""

from openflow.api.paths import get_path_funnel
from openflow.services.connection_executor import AnalyticsDatabase


class MockDB(AnalyticsDatabase):
    def __init__(self, results):
        self.results = results
        self.call_count = 0

    def execute(self, query, params=None):
        result = (
            self.results[self.call_count] if self.call_count < len(self.results) else []
        )
        self.call_count += 1
        return result


def test_funnel_simple_two_steps():
    db = MockDB([])
    result = get_path_funnel(
        events="Home,Search",
        start_date="2026-01-01",
        end_date="2026-02-16",
        db=db,
    )

    assert "error" not in result
    assert len(result["data"]) == 2
    assert result["data"][0]["event"] == "Home"
    assert result["data"][1]["event"] == "Search"
    assert result["data"][0]["users"] >= result["data"][1]["users"], (
        f"Users should decrease: {result['data'][0]['users']} -> {result['data'][1]['users']}"
    )


def test_funnel_counts_decrease():
    db = MockDB([])

    result = get_path_funnel(
        events="Home,Search,ProductView,AddToCart,Purchase",
        start_date="2026-01-01",
        end_date="2026-02-16",
        db=db,
    )

    users = [step["users"] for step in result["data"]]

    for i in range(1, len(users)):
        assert users[i] <= users[i - 1], f"Users should not increase: {users}"

    assert users[0] > 0, "First step should have users"


def test_funnel_occurrences_decrease():
    db = MockDB([])

    result = get_path_funnel(
        events="Home,Search,ProductView",
        start_date="2026-01-01",
        end_date="2026-02-16",
        db=db,
    )

    occ = [step["occurrences"] for step in result["data"]]

    for i in range(1, len(occ)):
        assert occ[i] <= occ[i - 1], f"Occurrences should not increase: {occ}"


def test_funnel_dropoff_matches():
    db = MockDB([])

    result = get_path_funnel(
        events="Home,Search,ProductView",
        start_date="2026-01-01",
        end_date="2026-02-16",
        db=db,
    )

    for i in range(1, len(result["data"])):
        prev_users = result["data"][i - 1]["users"]
        curr_users = result["data"][i]["users"]
        dropoff = result["data"][i]["dropoff_users"]

        assert prev_users - curr_users == dropoff, (
            f"Dropoff mismatch at step {i + 1}: {prev_users} - {curr_users} != {dropoff}"
        )


def test_funnel_conversion_rates():
    db = MockDB([])

    result = get_path_funnel(
        events="Home,Search",
        start_date="2026-01-01",
        end_date="2026-02-16",
        db=db,
    )

    step1 = result["data"][0]
    step2 = result["data"][1]

    if step1["users"] > 0 and step2["users"] > 0:
        expected_rate = round((step2["users"] / step1["users"]) * 100, 2)
        assert step2["step_conversion_rate"] == expected_rate, (
            f"Conversion rate mismatch: {step2['step_conversion_rate']} != {expected_rate}"
        )


if __name__ == "__main__":
    test_funnel_simple_two_steps()
    test_funnel_counts_decrease()
    test_funnel_occurrences_decrease()
    test_funnel_dropoff_matches()
    test_funnel_conversion_rates()
    print("All tests passed!")
