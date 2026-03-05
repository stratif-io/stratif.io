"""Tests for openflow.services.connection_executor internals."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from openflow.services.connection_executor import (
    AnalyticsDatabase,
    _to_named_params,
    get_analytics_db,
)


@pytest.mark.anyio
async def test_get_analytics_db_raises_503_when_no_connection():
    """get_analytics_db should raise 503 when no connection is configured."""
    mock_user = MagicMock()
    mock_user.id = "user-123"

    with patch(
        "openflow.services.connection_executor.get_product_db"
    ) as mock_product_db:
        mock_db = MagicMock()
        mock_db.fetchone.return_value = None  # no connection found
        mock_product_db.return_value = mock_db

        gen = get_analytics_db(connection_id=None, current_user=mock_user)
        with pytest.raises(HTTPException) as exc_info:
            await gen.__anext__()
        assert exc_info.value.status_code == 503


class TestToNamedParams:
    def test_no_params_returns_query_unchanged_and_empty_dict(self):
        query, named = _to_named_params("SELECT 1", [])
        assert query == "SELECT 1"
        assert named == {}

    def test_single_param_replaced(self):
        query, named = _to_named_params("SELECT * FROM t WHERE id = ?", [42])
        assert ":p0" in query
        assert "?" not in query
        assert named == {"p0": 42}

    def test_multiple_params_replaced_in_order(self):
        query, named = _to_named_params(
            "SELECT * FROM t WHERE a = ? AND b = ?", ["hello", 99]
        )
        assert ":p0" in query
        assert ":p1" in query
        assert "?" not in query
        assert named == {"p0": "hello", "p1": 99}

    def test_preserves_query_structure_around_placeholders(self):
        query, named = _to_named_params("SELECT ? + ?", [1, 2])
        assert query == "SELECT :p0 + :p1"
        assert named == {"p0": 1, "p1": 2}

    def test_handles_none_value(self):
        query, named = _to_named_params("WHERE x = ?", [None])
        assert named == {"p0": None}

    def test_handles_string_with_quotes(self):
        query, named = _to_named_params("WHERE name = ?", ["O'Brien"])
        assert named == {"p0": "O'Brien"}
        # Value must NOT be escaped/modified — driver handles it
        assert "O'Brien" in str(named["p0"])

    def test_handles_float_value(self):
        query, named = _to_named_params("WHERE score > ?", [3.14])
        assert named == {"p0": 3.14}

    def test_more_placeholders_than_params_fills_none(self):
        query, named = _to_named_params("WHERE a = ? AND b = ?", [1])
        assert named["p0"] == 1
        assert named["p1"] is None


class TestBuildFilterClauses:
    """Test AnalyticsDatabase.build_filter_clauses via an in-memory instance."""

    def _make_db(self, custom_prop_exprs: dict) -> AnalyticsDatabase:
        import duckdb

        conn = duckdb.connect(":memory:")
        return AnalyticsDatabase(
            conn=conn,
            dialect="duckdb",
            events_cte=None,
            custom_prop_exprs=custom_prop_exprs,
        )

    def test_empty_filters_returns_empty(self):
        db = self._make_db({"country": '"country"'})
        clauses, params = db.build_filter_clauses({})
        assert clauses == []
        assert params == []

    def test_single_value_filter(self):
        db = self._make_db({"country": '"country"'})
        clauses, params = db.build_filter_clauses({"country": "US"})
        assert len(clauses) == 1
        assert '"country"' in clauses[0]
        assert "= ?" in clauses[0]
        assert params == ["US"]

    def test_multi_value_pipe_separated(self):
        db = self._make_db({"country": '"country"'})
        clauses, params = db.build_filter_clauses({"country": "US|UK|DE"})
        assert len(clauses) == 1
        assert "IN (" in clauses[0]
        assert params == ["US", "UK", "DE"]

    def test_unknown_field_skipped(self):
        db = self._make_db({"country": '"country"'})
        clauses, params = db.build_filter_clauses({"nonexistent": "foo"})
        assert clauses == []
        assert params == []

    def test_empty_value_skipped(self):
        db = self._make_db({"country": '"country"'})
        clauses, params = db.build_filter_clauses({"country": ""})
        assert clauses == []
        assert params == []

    def test_multiple_fields(self):
        db = self._make_db({"country": '"country"', "device": '"device"'})
        clauses, params = db.build_filter_clauses({"country": "US", "device": "Mobile"})
        assert len(clauses) == 2
        assert len(params) == 2


class TestHasColumn:
    def _make_db(self, available_columns=None, custom_props=None, events_cte=None):
        import duckdb

        conn = duckdb.connect(":memory:")
        return AnalyticsDatabase(
            conn=conn,
            dialect="duckdb",
            events_cte=events_cte,
            custom_props=custom_props or [],
            available_columns=available_columns,
        )

    def test_standard_columns_always_present(self):
        db = self._make_db(available_columns=frozenset())
        # standard cols are in the fallback but NOT in available_columns
        # so with real introspection (empty set), they'd be False
        # This tests the real-introspection path: trusts available_columns
        assert db.has_column("user_id") is False  # not in frozenset()

    def test_with_real_columns_set(self):
        db = self._make_db(
            available_columns=frozenset(
                ["user_id", "timestamp", "event_name", "properties"]
            )
        )
        assert db.has_column("user_id") is True
        assert db.has_column("properties") is True
        assert db.has_column("nonexistent") is False

    def test_fallback_when_no_introspection(self):
        db = self._make_db(available_columns=None)
        # No CTE, no available_columns → conservative: assume all exist
        assert db.has_column("user_id") is True
        assert db.has_column("properties") is True
        assert db.has_column("anything") is True

    def test_fallback_with_cte_uses_custom_props_roots(self):
        db = self._make_db(
            available_columns=None,
            events_cte="(SELECT user_id, event_name, timestamp FROM src)",
            custom_props=[{"name": "country", "path": "properties.country"}],
        )
        assert db.has_column("user_id") is True
        assert db.has_column("properties") is True  # root of custom prop path
        assert db.has_column("nonexistent") is False
