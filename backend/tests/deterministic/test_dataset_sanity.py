"""Fast sanity checks — no DB needed, no markers."""

from collections import Counter

from backend.tests.deterministic.dataset import EVENTS


def test_total_row_count():
    assert len(EVENTS) == 2448


def test_event_counts():
    counts = Counter(e["event_name"] for e in EVENTS)
    assert counts["page_view"] == 720
    assert counts["signup"] == 648
    assert counts["add_to_cart"] == 504
    assert counts["checkout"] == 288
    assert counts["purchase"] == 288


def test_user_count():
    users = {e["user_id"] for e in EVENTS}
    assert users == {f"user_{i:03d}" for i in range(1, 11)}


def test_timestamps_are_deterministic():
    from backend.tests.deterministic.dataset import _generate

    assert _generate() == EVENTS


def test_no_duplicate_timestamps_per_user():
    seen: set[tuple] = set()
    for e in EVENTS:
        key = (e["user_id"], e["timestamp"])
        assert key not in seen, f"Duplicate: {key}"
        seen.add(key)


def test_date_range():
    timestamps = [e["timestamp"] for e in EVENTS]
    assert min(timestamps) == "2023-01-01 10:00:00"
    assert max(timestamps) == "2024-12-15 10:20:00"
