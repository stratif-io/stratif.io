"""Tests for backend.services.connection_executor internals."""

import duckdb
import pytest
from fastapi import HTTPException

from backend.services.connection_executor import (
    AnalyticsDatabase,
    _to_named_params,
    get_analytics_db,
)


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


def test_trend_endpoint_signature_requires_db():
    """trend endpoint should declare db as non-Optional AnalyticsDatabase."""
    import inspect
    import typing

    from backend.api.trend import get_trend
    from backend.services.connection_executor import AnalyticsDatabase

    sig = inspect.signature(get_trend)
    db_param = sig.parameters["db"]
    annotation = db_param.annotation
    args = typing.get_args(annotation)
    db_type = args[0] if args else annotation
    assert db_type is AnalyticsDatabase, f"Expected AnalyticsDatabase, got {db_type}"


class TestHasColumn:
    def _make_db(self, available_columns=None, custom_props=None, events_cte=None):
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
        assert db.has_column("properties") is True
        assert db.has_column("nonexistent") is False


def test_pooled_db_stores_pool_key():
    """Pooled AnalyticsDatabase instances should store their pool key."""
    db = AnalyticsDatabase(
        conn=duckdb.connect(":memory:"),
        dialect="duckdb",
        events_cte=None,
    )
    db._pooled = True
    db._pool_key = ("conn-1", "user-1", "duckdb")
    assert db._pool_key == ("conn-1", "user-1", "duckdb")


def test_execute_raises_503_on_stale_databricks_connection():
    """execute() should raise 503 when Databricks connection is dead."""
    from unittest.mock import MagicMock

    try:
        from databricks.sql.exc import Error as DatabricksError
    except ImportError:
        pytest.skip("databricks-sql-connector not installed")

    dead_conn = MagicMock()
    dead_cursor = MagicMock()
    dead_cursor.execute.side_effect = DatabricksError("Connection closed")
    dead_conn.cursor.return_value = dead_cursor

    db = AnalyticsDatabase(
        conn=dead_conn,
        dialect="databricks",
        events_cte=None,
    )
    db._pooled = True
    db._pool_key = ("conn-1", "user-1", "databricks")

    with pytest.raises(HTTPException) as exc_info:
        db.execute("SELECT 1")
    assert exc_info.value.status_code == 503
    assert "retry" in exc_info.value.detail.lower()


def test_execute_raises_503_on_stale_postgres_connection():
    """execute() should raise 503 when PostgreSQL connection is dead."""
    from unittest.mock import MagicMock

    try:
        import psycopg2
    except ImportError:
        pytest.skip("psycopg2 not installed")

    dead_conn = MagicMock()
    dead_cursor = MagicMock()
    dead_cursor.execute.side_effect = psycopg2.OperationalError("server closed connection")
    dead_conn.cursor.return_value = dead_cursor

    db = AnalyticsDatabase(
        conn=dead_conn,
        dialect="postgres",
        events_cte=None,
    )
    db._pooled = True
    db._pool_key = ("conn-2", "user-2", "postgres")

    with pytest.raises(HTTPException) as exc_info:
        db.execute("SELECT 1")
    assert exc_info.value.status_code == 503
