"""Tests for the in-memory analytics query cache."""

from __future__ import annotations

import pytest

from backend.services import query_cache


@pytest.fixture(autouse=True)
def clear_cache():
    """Ensure a clean cache before each test."""
    query_cache._store.clear()
    yield
    query_cache._store.clear()


class TestBasicGetSet:
    def test_miss_returns_none(self):
        assert query_cache.get("conn-1", "mc_metric", "total_events") is None

    def test_set_then_get_returns_value(self):
        query_cache.set("conn-1", {"current": 42}, "mc_metric", "total_events")
        result = query_cache.get("conn-1", "mc_metric", "total_events")
        assert result == {"current": 42}

    def test_different_connections_are_isolated(self):
        query_cache.set("conn-1", {"v": 1}, "mc_metric", "total_events")
        query_cache.set("conn-2", {"v": 2}, "mc_metric", "total_events")
        assert query_cache.get("conn-1", "mc_metric", "total_events") == {"v": 1}
        assert query_cache.get("conn-2", "mc_metric", "total_events") == {"v": 2}

    def test_different_params_are_isolated(self):
        query_cache.set("conn-1", {"v": 1}, "mc_metric", "total_events", "2024-01-01")
        query_cache.set("conn-1", {"v": 2}, "mc_metric", "total_events", "2024-02-01")
        assert query_cache.get("conn-1", "mc_metric", "total_events", "2024-01-01") == {
            "v": 1
        }
        assert query_cache.get("conn-1", "mc_metric", "total_events", "2024-02-01") == {
            "v": 2
        }


class TestTTL:
    def test_entry_expires_after_ttl(self):
        query_cache.set("conn-1", {"v": 99}, "mc_metric", "wau", ttl=0)
        # TTL=0 means already expired
        assert query_cache.get("conn-1", "mc_metric", "wau") is None

    def test_entry_valid_before_ttl(self):
        query_cache.set("conn-1", {"v": 7}, "mc_metric", "wau", ttl=60)
        assert query_cache.get("conn-1", "mc_metric", "wau") == {"v": 7}


class TestInvalidate:
    def test_invalidate_clears_connection_entries(self):
        query_cache.set("conn-1", {"v": 1}, "mc_metric", "total_events")
        query_cache.set("conn-1", {"v": 2}, "mc_metric", "unique_users")
        query_cache.set("conn-2", {"v": 3}, "mc_metric", "total_events")

        query_cache.invalidate("conn-1")

        assert query_cache.get("conn-1", "mc_metric", "total_events") is None
        assert query_cache.get("conn-1", "mc_metric", "unique_users") is None
        # conn-2 unaffected
        assert query_cache.get("conn-2", "mc_metric", "total_events") == {"v": 3}

    def test_invalidate_nonexistent_connection_is_noop(self):
        # Should not raise
        query_cache.invalidate("does-not-exist")
