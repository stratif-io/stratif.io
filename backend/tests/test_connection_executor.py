"""Tests for backend.services.connection_executor internals."""

import inspect

from backend.services.connection_executor import get_analytics_db


def test_get_analytics_db_accepts_session_param():
    sig = inspect.signature(get_analytics_db)
    assert "session" in sig.parameters


def test_get_analytics_db_accepts_registry_param():
    sig = inspect.signature(get_analytics_db)
    assert "registry" in sig.parameters


import duckdb  # noqa: E402
import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402

from backend.backends.duckdb import DuckDBBackend  # noqa: E402
from backend.services.connection_executor import (  # noqa: E402
    AnalyticsDatabase,
    _to_named_params,
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
            backend=DuckDBBackend(),
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

    def test_standard_field_in_filter_exprs_but_not_custom_prop_exprs(self):
        """user_id is a standard field — it lives in filter_exprs, not custom_prop_exprs.
        build_filter_clauses must apply it when it's in filter_exprs."""
        conn = duckdb.connect(":memory:")
        db = AnalyticsDatabase(
            conn=conn,
            backend=DuckDBBackend(),
            events_cte=None,
            custom_prop_exprs={},  # user_id is NOT a custom prop
            filter_exprs={"user_id": '"user_id"'},  # but IS a configured filter field
        )
        clauses, params = db.build_filter_clauses({"user_id": "abc-123"})
        assert len(clauses) == 1, "user_id filter must generate a WHERE clause"
        assert params == ["abc-123"]


class TestHasColumn:
    def _make_db(self, available_columns=None, custom_props=None, events_cte=None):
        conn = duckdb.connect(":memory:")
        return AnalyticsDatabase(
            conn=conn,
            backend=DuckDBBackend(),
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
        backend=DuckDBBackend(),
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

    from backend.backends.databricks import DatabricksBackend

    db = AnalyticsDatabase(
        conn=dead_conn,
        backend=DatabricksBackend(),
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
    dead_cursor.execute.side_effect = psycopg2.OperationalError(
        "server closed connection"
    )
    dead_conn.cursor.return_value = dead_cursor

    from backend.backends.postgresql import PostgreSQLBackend

    db = AnalyticsDatabase(
        conn=dead_conn,
        backend=PostgreSQLBackend(),
        events_cte=None,
    )
    db._pooled = True
    db._pool_key = ("conn-2", "user-2", "postgres")

    with pytest.raises(HTTPException) as exc_info:
        db.execute("SELECT 1")
    assert exc_info.value.status_code == 503


class TestOpenAnalyticsDbIdentityFieldFilters:
    """open_analytics_db must include identity fields (first_name, email, etc.) in
    filter_exprs and custom_prop_exprs so global filters work for non-event properties."""

    def _make_session(self, schema_data: dict, filter_fields: list[dict]):
        """Build a mock AsyncSession that returns ORM-like objects."""
        from unittest.mock import AsyncMock, MagicMock

        # Build mock custom_property objects
        custom_props_objs = []
        for i, cp in enumerate(schema_data.get("custom_properties", [])):
            obj = MagicMock()
            obj.name = cp.get("name", "")
            obj.path = cp.get("path", "")
            obj.type = cp.get("type", "string")
            obj.category = cp.get("category", "")
            obj.sort_order = i
            custom_props_objs.append(obj)

        # Build mock filter_field objects
        filter_field_objs = []
        for i, ff in enumerate(filter_fields):
            obj = MagicMock()
            obj.field = ff.get("field", "")
            obj.label = ff.get("label", "")
            obj.icon = ff.get("icon", "")
            obj.sort_order = i
            filter_field_objs.append(obj)

        # Build mock schema_config
        if schema_data.get("has_schema", True):
            schema_config = MagicMock()
            schema_config.user_id_field = schema_data.get("user_id_field", "user_id")
            schema_config.timestamp_field = schema_data.get("timestamp_field", "timestamp")
            schema_config.event_name_field = schema_data.get("event_name_field", "event_name")
            schema_config.events_table = schema_data.get("events_table", "events")
            schema_config.custom_properties = custom_props_objs
            schema_config.session_timeout_minutes = schema_data.get("session_timeout_minutes", 30)
            schema_config.resurrection_window_days = schema_data.get("resurrection_window_days", 30)
            schema_config.power_user_threshold_days = schema_data.get("power_user_threshold_days", 4)
            schema_config.email_field = schema_data.get("email_field")
            schema_config.first_name_field = schema_data.get("first_name_field")
            schema_config.last_name_field = schema_data.get("last_name_field")
            schema_config.date_of_birth_field = schema_data.get("date_of_birth_field")
            schema_config.phone_field = schema_data.get("phone_field")
        else:
            schema_config = None

        filter_config = MagicMock()
        filter_config.filter_fields = filter_field_objs

        conn_obj = MagicMock()
        conn_obj.db_type = "duckdb"
        conn_obj.credentials_encrypted = "dummy"
        conn_obj.schema_config = schema_config
        conn_obj.filter_config = filter_config

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = conn_obj

        session = AsyncMock()
        session.execute = AsyncMock(return_value=mock_result)
        return session

    async def _open_db(self, schema_data: dict, filter_fields: list[dict]):
        from unittest.mock import patch

        import duckdb

        from backend.backends.duckdb import DuckDBBackend
        from backend.services.analytics_db import open_analytics_db

        backend = DuckDBBackend()
        real_conn = duckdb.connect(":memory:")
        session = self._make_session(schema_data, filter_fields)

        with (
            patch(
                "backend.services.crypto.decrypt_credentials",
                return_value={"file_path": ":memory:"},
            ),
            patch.object(backend, "open", return_value=real_conn),
            patch.object(backend, "get_table_columns", return_value=None),
        ):
            return await open_analytics_db("conn-1", session, {"duckdb": backend})

    def _default_schema(self, **overrides):
        base = {
            "user_id_field": "user_id",
            "timestamp_field": "timestamp",
            "event_name_field": "event_name",
            "events_table": "events",
            "custom_properties": [],
            "session_timeout_minutes": 30,
            "resurrection_window_days": 30,
            "power_user_threshold_days": 4,
            "email_field": None,
            "first_name_field": None,
            "last_name_field": None,
            "date_of_birth_field": None,
            "phone_field": None,
            "has_schema": True,
        }
        base.update(overrides)
        return base

    async def test_first_name_identity_field_included_in_filter_exprs(self):
        schema = self._default_schema(first_name_field="first_name")
        db = await self._open_db(
            schema, [{"field": "first_name", "label": "First Name", "icon": "user"}]
        )
        assert "first_name" in db.get_filter_exprs(), (
            "first_name should be in filter_exprs so get_filter_options() can return values"
        )

    async def test_first_name_identity_field_filterable_via_build_filter_clauses(self):
        schema = self._default_schema(first_name_field="first_name")
        db = await self._open_db(
            schema, [{"field": "first_name", "label": "First Name", "icon": "user"}]
        )
        clauses, params = db.build_filter_clauses({"first_name": "Alice"})
        assert len(clauses) == 1, (
            "build_filter_clauses must generate a WHERE clause for first_name"
        )
        assert params == ["Alice"]

    async def test_email_identity_field_included_in_filter_exprs(self):
        schema = self._default_schema(email_field="user_email")
        db = await self._open_db(
            schema, [{"field": "user_email", "label": "Email", "icon": "mail"}]
        )
        assert "user_email" in db.get_filter_exprs()

    async def test_identity_field_not_added_when_not_selected_as_filter_field(self):
        schema = self._default_schema(first_name_field="first_name")
        db = await self._open_db(schema, [])  # no filter fields configured
        assert "first_name" not in db.get_filter_exprs()

    async def test_plain_column_filter_field_without_identity_mapping(self):
        """A filter field that is a plain column but not configured as an identity field
        must still land in filter_exprs so autocomplete and filtering work."""
        schema = self._default_schema()  # first_name_field NOT set
        db = await self._open_db(
            schema, [{"field": "first_name", "label": "First Name", "icon": "user"}]
        )
        assert "first_name" in db.get_filter_exprs(), (
            "plain column filter field must be in filter_exprs even without identity mapping"
        )
        clauses, params = db.build_filter_clauses({"first_name": "Alice"})
        assert len(clauses) == 1
        assert params == ["Alice"]

    async def test_dotted_path_filter_field_generates_json_extraction(self):
        """A filter field like 'traits.first_name' not in custom_prop_exprs must resolve
        to a JSON extraction expression, not a quoted dotted identifier."""
        schema = self._default_schema()
        db = await self._open_db(
            schema,
            [{"field": "traits.first_name", "label": "First Name", "icon": "user"}],
        )
        exprs = db.get_filter_exprs()
        assert "traits.first_name" in exprs
        # Must not be a plain quoted identifier — must reference traits column
        assert '"traits.first_name"' not in exprs["traits.first_name"]
        assert "traits" in exprs["traits.first_name"]

    async def test_identity_field_with_custom_column_name(self):
        schema = self._default_schema(first_name_field="fname")
        db = await self._open_db(
            schema, [{"field": "fname", "label": "First Name", "icon": "user"}]
        )
        clauses, params = db.build_filter_clauses({"fname": "Bob"})
        assert len(clauses) == 1
        assert params == ["Bob"]


def test_execute_reconnects_and_retries_on_stale_postgres_connection():
    """execute() should evict the stale pool entry, open a fresh connection, and retry."""
    from unittest.mock import MagicMock, patch

    try:
        import psycopg2
    except ImportError:
        pytest.skip("psycopg2 not installed")

    # First connection: stale — cursor.execute raises OperationalError
    dead_conn = MagicMock()
    dead_cursor = MagicMock()
    dead_cursor.execute.side_effect = psycopg2.OperationalError(
        "server closed connection"
    )
    dead_conn.cursor.return_value = dead_cursor

    # Fresh connection returned by the factory — succeeds
    fresh_conn = MagicMock()
    fresh_cursor = MagicMock()
    fresh_cursor.fetchall.return_value = [(1,)]
    fresh_conn.cursor.return_value = fresh_cursor

    factory = MagicMock(return_value=fresh_conn)

    from backend.backends.postgresql import PostgreSQLBackend

    db = AnalyticsDatabase(conn=dead_conn, backend=PostgreSQLBackend(), events_cte=None)
    db._pooled = True
    db._pool_key = ("conn-3", "user-3", "postgres")
    db._pool_factory = factory

    with (
        patch("backend.services.analytics_db._pool_evict") as mock_evict,
        patch("backend.services.analytics_db._pool_get", return_value=fresh_conn),
    ):
        result = db.execute("SELECT 1")

    mock_evict.assert_called_once_with(("conn-3", "user-3", "postgres"))
    assert result == [(1,)]
