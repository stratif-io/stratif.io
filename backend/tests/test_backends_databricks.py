"""Tests for the Databricks database backend (mock-based)."""

from unittest.mock import MagicMock

import pytest

from backend.backends.base import DatabaseBackend
from backend.backends.databricks import DatabricksBackend
from backend.backends.databricks.credentials import DatabricksCredentials


@pytest.fixture
def backend():
    return DatabricksBackend()


def _make_conn(rows=None):
    cursor = MagicMock()
    cursor.description = [("col",)]
    cursor.fetchall.return_value = rows or []
    conn = MagicMock()
    conn.cursor.return_value = cursor
    return conn, cursor


class TestDatabricksIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "databricks"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == "`"

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestDatabricksCredentials:
    def test_valid(self):
        c = DatabricksCredentials(host="h", http_path="/p", token="t")
        assert c.host == "h"

    def test_parse_credentials(self, backend):
        creds = backend.parse_credentials(
            {"host": "h", "http_path": "/p", "token": "t"}
        )
        assert isinstance(creds, DatabricksCredentials)

    def test_pool_key(self, backend):
        creds = DatabricksCredentials(host="h", http_path="/p", token="t")
        assert backend.pool_key("c42", creds) == ("c42", "databricks")


class TestDatabricksExecution:
    def test_execute_converts_to_named_params(self, backend):
        conn, cursor = _make_conn([(42,)])
        backend.execute(conn, "SELECT * FROM t WHERE id = ?", ["abc"])
        call_args = cursor.execute.call_args
        assert ":p0" in call_args[0][0]

    def test_execute_no_params(self, backend):
        conn, cursor = _make_conn([(7,)])
        result = backend.execute(conn, "SELECT 7", None)
        assert result == [(7,)]

    def test_is_connection_error_false_for_generic(self, backend):
        assert backend.is_connection_error(ValueError("nope")) is False


class TestDatabricksBrowse:
    def test_browse_no_catalog_returns_catalogs(self, backend):
        conn, cursor = _make_conn([("main",), ("hive_metastore",)])
        items = backend.browse(conn, catalog=None, schema=None)
        assert all(i["kind"] == "catalog" for i in items)
        assert any(i["name"] == "main" for i in items)

    def test_browse_catalog_no_schema_returns_schemas(self, backend):
        conn, cursor = _make_conn([("default",)])
        items = backend.browse(conn, catalog="main", schema=None)
        assert all(i["kind"] == "schema" for i in items)

    def test_browse_catalog_and_schema_returns_tables(self, backend):
        # SHOW TABLES returns (namespace, tableName, isTemporary) — 3 columns
        conn, cursor = _make_conn([("default", "events", False)])
        items = backend.browse(conn, catalog="main", schema="default")
        assert all(i["kind"] == "table" for i in items)
        assert items[0]["name"] == "events"
        assert items[0]["full_name"] == "main.default.events"

    def test_browse_unity_catalog_show_tables_returns_4_cols(self, backend):
        """Unity Catalog SHOW TABLES IN catalog.schema returns 4 columns:
        (catalog, database, tableName, isTemporary).
        The backend must read tableName from r[-2], not r[1].
        Without the fix: r[1] = 'default' (schema name, WRONG).
        With the fix: r[-2] = 'events' (table name, CORRECT).
        """
        conn, cursor = _make_conn([("main", "default", "events", False)])
        items = backend.browse(conn, catalog="main", schema="default")
        assert len(items) == 1
        assert items[0]["kind"] == "table"
        assert items[0]["name"] == "events", (
            f"Expected table name 'events', got {items[0]['name']!r}. "
            "Unity Catalog SHOW TABLES returns 4 cols; r[1] is schema name not table name."
        )
        assert items[0]["full_name"] == "main.default.events"

    def test_get_tables_unity_catalog_4_cols(self, backend):
        """get_tables must also handle the 4-column Unity Catalog SHOW TABLES format."""
        conn, cursor = _make_conn([("main", "default", "events", False)])
        # Patch current_catalog/current_database query to return something
        cursor.fetchone.return_value = ("main", "default")
        tables = backend.get_tables(conn)
        assert "events" in tables, (
            f"Expected 'events' in tables, got {tables}. "
            "Unity Catalog 4-col format: r[1] is schema name, r[-2] is table name."
        )


class TestDatabricksCTE:
    def test_build_events_cte_uses_except(self, backend):
        cte = backend.build_events_cte("cat.sch.raw", "uid", "ts", "action", [])
        assert "EXCEPT" in cte.upper()
        assert "uid" in cte and "user_id" in cte

    def test_prepend_events_cte(self, backend):
        result = backend.prepend_events_cte(
            "(SELECT * FROM raw)", "SELECT 1 FROM events"
        )
        assert "WITH events AS" in result


class TestDatabricksSQLFragments:
    def test_date_trunc(self, backend):
        assert "DATE_TRUNC" in backend.date_trunc("day", "ts").upper()

    def test_cast_to_text_uses_string(self, backend):
        assert "STRING" in backend.cast_to_text("x").upper()

    def test_json_extract_uses_get_json_object(self, backend):
        assert "get_json_object" in backend.json_extract_string("p", "k").lower()

    def test_epoch_diff_seconds_uses_unix_timestamp(self, backend):
        assert "unix_timestamp" in backend.epoch_diff_seconds("a", "b").lower()

    def test_date_diff_days(self, backend):
        assert "DATEDIFF" in backend.date_diff_days("a", "b").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()

    def test_identifier_quote_char_is_backtick(self, backend):
        assert backend.identifier_quote_char == "`"

    def test_date_trunc_day(self, backend):
        result = backend.date_trunc("day", "ts")
        assert "DATE_TRUNC" in result.upper() or "TRUNC" in result.upper()

    def test_date_diff_days_with_alias(self, backend):
        result = backend.date_diff_days("a", "b")
        assert "DATEDIFF" in result.upper() or "TIMESTAMPDIFF" in result.upper()

    def test_json_extract_string(self, backend):
        result = backend.json_extract_string("v", "key")
        assert "v" in result and "key" in result
        assert "get_json_object" in result.lower() or ":" in result

    def test_build_events_cte_no_exclude(self, backend):
        cte = backend.build_events_cte("raw", "uid", "ts", "action", [])
        assert "EXCLUDE" not in cte

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "30" in result

    def test_cast_to_text(self, backend):
        result = backend.cast_to_text("x")
        assert "x" in result
        assert (
            "STRING" in result.upper()
            or "TEXT" in result.upper()
            or "VARCHAR" in result.upper()
        )
