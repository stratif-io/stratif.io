"""Unit tests for DemoSeeder generation helpers."""
import pytest

from seeders.seeder_demo import DemoSeeder, EVENTS, PLATFORMS


@pytest.fixture
def seeder():
    return DemoSeeder(num_users=10, num_days=7)


def test_events_list_contains_required_events(seeder):
    required = {
        "app_open", "app_close", "signup", "onboarding_started",
        "onboarding_completed", "screen_view", "feature_used",
        "purchase", "upgrade_clicked", "share", "search",
        "push_notification_opened",
    }
    assert required.issubset(set(EVENTS))


def test_platforms_are_ios_and_android():
    assert set(PLATFORMS) == {"ios", "android"}


def test_generate_users_returns_correct_count(seeder):
    users = seeder._generate_users()
    assert len(users) == 10


def test_user_has_required_fields(seeder):
    user = seeder._generate_users()[0]
    for field in ("id", "platform", "is_returning", "signup_day"):
        assert field in user, f"Missing field: {field}"


def test_generate_session_produces_events(seeder):
    from datetime import datetime
    users = seeder._generate_users()
    events = seeder._generate_session(users[0], session_idx=0, session_start=datetime.now())
    assert len(events) > 0


def test_session_events_have_required_columns(seeder):
    from datetime import datetime
    users = seeder._generate_users()
    events = seeder._generate_session(users[0], session_idx=0, session_start=datetime.now())
    for row in events:
        user_id, session_id, event_name, timestamp, platform, properties = row
        assert isinstance(user_id, str)
        assert isinstance(session_id, str)
        assert event_name in EVENTS
        assert platform in PLATFORMS
        assert isinstance(properties, dict)


def test_app_open_is_first_event_in_session(seeder):
    from datetime import datetime
    users = seeder._generate_users()
    events = seeder._generate_session(users[0], session_idx=0, session_start=datetime.now())
    assert events[0][2] == "app_open"


def test_app_close_is_last_event_in_session(seeder):
    from datetime import datetime
    users = seeder._generate_users()
    events = seeder._generate_session(users[0], session_idx=0, session_start=datetime.now())
    assert events[-1][2] == "app_close"


def test_new_user_session_includes_signup_and_onboarding(seeder):
    """First session for a new user should always include signup + onboarding events."""
    from datetime import datetime
    # Force a new (non-returning) user
    users = [u for u in seeder._generate_users() if not u["is_returning"]]
    if not users:
        pytest.skip("No new users in sample — rerun or increase num_users")
    events = seeder._generate_session(users[0], session_idx=0, session_start=datetime.now())
    event_names = [e[2] for e in events]
    assert "signup" in event_names
    assert "onboarding_started" in event_names
