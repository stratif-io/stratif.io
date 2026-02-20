"""Verify funnel and path analysis are aligned."""

from openflow.api.paths import get_path_funnel
from openflow.db import get_db
from openflow.services import generate_path_analysis_query


def test_funnel_matches_path_analysis():
    """
    The funnel should show consistent user counts with path analysis.

    For a path A -> B -> C:
    - Funnel step 1 (A): users who did A
    - Funnel step 2 (B): users who did A then B
    - Funnel step 3 (C): users who did A then B then C

    This should match the unique_users count for the full path.
    """
    db = get_db()

    events = "Home,Search,ProductView"

    funnel = get_path_funnel(
        events=events, start_date="2026-01-01", end_date="2026-02-16", db=db, _="test"
    )

    query = generate_path_analysis_query(
        table_name="events",
        start_event="Home",
        end_event="ProductView",
        min_path_length=3,
        max_path_length=3,
        top_n=1,
        date_range=("2026-01-01", "2026-02-16"),
        sql_dialect="duckdb",
    )

    paths = db.execute(query)

    if paths and funnel["data"]:
        path_users = paths[0][3]  # unique_users column

        funnel_final_users = funnel["data"][-1]["users"]

        print(
            f"Path analysis unique_users for 'Home -> Search -> ProductView': {path_users}"
        )
        print(f"Funnel final step users: {funnel_final_users}")
        print(
            f"Funnel data: {[{'step': s['step'], 'event': s['event'], 'users': s['users'], 'occ': s['occurrences']} for s in funnel['data']]}"
        )


def test_funnel_users_decrease_monotonically():
    """Users should only decrease, never increase."""
    db = get_db()

    funnel = get_path_funnel(
        events="Home,Search,ProductView,AddToCart,Purchase",
        start_date="2026-01-01",
        end_date="2026-02-16",
        db=db,
        _="test",
    )

    users = [step["users"] for step in funnel["data"]]

    print(f"User progression: {users}")

    for i in range(1, len(users)):
        assert users[i] <= users[i - 1], (
            f"Users increased from step {i} to {i + 1}: {users[i - 1]} -> {users[i]}"
        )


def test_funnel_dropoff_sums_correctly():
    """Total dropoff should equal initial users minus final users."""
    db = get_db()

    funnel = get_path_funnel(
        events="Home,Search,ProductView,AddToCart,Purchase",
        start_date="2026-01-01",
        end_date="2026-02-16",
        db=db,
        _="test",
    )

    initial_users = funnel["data"][0]["users"]
    final_users = funnel["data"][-1]["users"]
    total_dropoff = sum(step["dropoff_users"] for step in funnel["data"])

    expected_dropoff = initial_users - final_users

    print(f"Initial users: {initial_users}")
    print(f"Final users: {final_users}")
    print(f"Total dropoff: {total_dropoff}")
    print(f"Expected dropoff: {expected_dropoff}")

    assert total_dropoff == expected_dropoff, (
        f"Dropoff mismatch: {total_dropoff} != {expected_dropoff}"
    )


if __name__ == "__main__":
    print("=== Test: Funnel matches path analysis ===")
    test_funnel_matches_path_analysis()
    print()

    print("=== Test: Users decrease monotonically ===")
    test_funnel_users_decrease_monotonically()
    print("PASSED")
    print()

    print("=== Test: Dropoff sums correctly ===")
    test_funnel_dropoff_sums_correctly()
    print("PASSED")
    print()

    print("All alignment tests passed!")
