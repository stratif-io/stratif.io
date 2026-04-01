"""Tests for the PostgreSQL database backend (mock-based)."""

from unittest.mock import MagicMock

import pytest

from backend.backends.base import DatabaseBackend
from backend.backends.postgresql import PostgreSQLBackend
from backend.backends.postgresql.credentials import PostgreSQLCredentials


@pytest.fixture
def backend():
    return PostgreSQLBackend()


def _make_cursor(rows=None, description=None):
    cursor = MagicMock()
    cursor.description = description or [("col",)]
    cursor.fetchall.return_value = rows or []
    cursor.fetchone.return_value = rows[0] if rows else None
    return cursor


def _make_conn(rows=None, description=None):
    cursor = _make_cursor(rows, description)
    conn = MagicMock()
    conn.cursor.return_value = cursor
    return conn, cursor


class TestPostgreSQLIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "postgres"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestPostgreSQLCredentials:
    def test_valid_minimal(self):
        c = PostgreSQLCredentials(host="h", database="d", user="u", password="p")
        assert c.port == 5432 and c.sslmode is None

    def test_with_sslmode(self):
        c = PostgreSQLCredentials(
            host="h", database="d", user="u", password="p", sslmode="require"
        )
        assert c.sslmode == "require"

    def test_parse_credentials(self, backend):
        creds = backend.parse_credentials(
            {"host": "h", "database": "d", "user": "u", "password": "p"}
        )
        assert isinstance(creds, PostgreSQLCredentials)

    def test_pool_key(self, backend):
        creds = PostgreSQLCredentials(host="h", database="d", user="u", password="p")
        assert backend.pool_key("c1", creds) == ("c1", "postgres")


class TestPostgreSQLExecution:
    def test_execute_no_params(self, backend):
        conn, cursor = _make_conn([(42,)])
        result = backend.execute(conn, "SELECT 42", None)
        assert result == [(42,)]
        cursor.execute.assert_called_once_with("SELECT 42", None)

    def test_execute_replaces_question_marks_with_percent_s(self, backend):
        conn, cursor = _make_conn([("u1",)])
        backend.execute(conn, "SELECT * FROM t WHERE id = ?", ["u1"])
        call_sql = cursor.execute.call_args[0][0]
        assert "%s" in call_sql and "?" not in call_sql

    def test_is_connection_error_operational(self, backend):
        try:
            import psycopg2

            assert (
                backend.is_connection_error(psycopg2.OperationalError("lost")) is True
            )
        except ImportError:
            pytest.skip("psycopg2 not installed")

    def test_is_connection_error_false_for_generic(self, backend):
        assert backend.is_connection_error(ValueError("nope")) is False

    def test_get_table_columns_returns_frozenset(self, backend):
        conn, cursor = _make_conn(description=[("user_id",), ("ts",)])
        cols = backend.get_table_columns(conn, '"events"')
        assert "user_id" in cols and "ts" in cols

    def test_get_table_columns_returns_empty_on_error(self, backend):
        conn = MagicMock()
        conn.cursor.side_effect = Exception("boom")
        assert backend.get_table_columns(conn, '"nope"') == frozenset()


class TestPostgreSQLCTE:
    def test_build_events_cte_explicit_enumeration(self, backend):
        cte = backend.build_events_cte(
            "raw", "uid", "ts", "action", [{"path": "extra"}]
        )
        assert "uid" in cte and "user_id" in cte
        assert "EXCLUDE" not in cte and "EXCEPT" not in cte

    def test_prepend_events_cte(self, backend):
        result = backend.prepend_events_cte(
            "(SELECT * FROM raw)", "SELECT 1 FROM events"
        )
        assert result.startswith("WITH events AS")

    def test_build_events_cte_with_custom_props_includes_root_col(self, backend):
        cte = backend.build_events_cte(
            "raw",
            "uid",
            "ts",
            "action",
            [{"name": "device", "path": "properties.device"}],
        )
        assert '"properties"' in cte


class TestPostgreSQLDetectSchema:
    def test_detect_schema_infers_numeric_json_property(self, backend):
        """Mock cursors: table list → columns (with jsonb) → key extraction → sampling."""
        # Cursor 1: table list
        c1 = _make_cursor([("events",)])
        # Cursor 2: column list — user_id + properties jsonb
        c2 = _make_cursor([("user_id", "character varying"), ("properties", "jsonb")])
        # Cursor 3: jsonb_object_keys for 'properties' top-level keys
        c3 = _make_cursor([("amount",)])
        # Cursor 4: sub-key check for 'amount' — empty means it's a leaf, not an object
        c4 = _make_cursor([])
        # Cursor 5: sampling query — non-null means numeric
        c5 = _make_cursor([(1.0,)])

        cursor_seq = iter([c1, c2, c3, c4, c5])
        conn = MagicMock()
        conn.cursor.side_effect = lambda: next(cursor_seq)

        info = backend.detect_schema(conn, None)
        prop = next(
            (p for p in info.proposed_custom_properties if p["name"] == "amount"), None
        )
        assert prop is not None, "amount should be in proposed_custom_properties"
        assert prop["type"] == "number", f"expected 'number', got '{prop['type']}'"


class TestPostgreSQLSQLFragments:
    def test_date_trunc(self, backend):
        assert backend.date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"

    def test_date_diff_days(self, backend):
        assert "EXTRACT" in backend.date_diff_days("a", "b").upper()

    def test_epoch_diff_seconds(self, backend):
        assert "EPOCH" in backend.epoch_diff_seconds("a", "b").upper()

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "INTERVAL" in result.upper() and "30" in result

    def test_json_extract_simple(self, backend):
        assert "->>" in backend.json_extract_string("p", "k")

    def test_json_extract_nested(self, backend):
        assert (
            "json_extract_path_text" in backend.json_extract_string("p", "a.b").lower()
        )

    def test_cast_to_text(self, backend):
        assert "TEXT" in backend.cast_to_text("x").upper()

    def test_extract_hour(self, backend):
        assert "HOUR" in backend.extract_hour("ts").upper()

    def test_extract_day_of_week(self, backend):
        assert "DOW" in backend.extract_day_of_week("ts").upper()

    def test_string_concat(self, backend):
        assert backend.string_concat("a", "b") == "a || b"

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()
