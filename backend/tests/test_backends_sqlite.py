"""Tests for the SQLite database backend."""
import sqlite3

import pytest

from backend.backends.base import DatabaseBackend
from backend.backends.sqlite import SQLiteBackend
from backend.backends.sqlite.credentials import SQLiteCredentials


@pytest.fixture
def backend():
    return SQLiteBackend()


@pytest.fixture
def mem_conn():
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id TEXT, timestamp TEXT, event_name TEXT, properties TEXT
        )
    """)
    conn.execute("INSERT INTO events VALUES ('u1', '2024-01-01', 'PageView', NULL)")
    conn.commit()
    yield conn
    conn.close()


class TestSQLiteBackendIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "sqlite"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_false(self, backend):
        assert backend.use_pool is False

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestSQLiteCredentials:
    def test_valid(self):
        c = SQLiteCredentials(file_path="/tmp/test.db")
        assert c.file_path == "/tmp/test.db"

    def test_parse_credentials(self, backend):
        creds = backend.parse_credentials({"file_path": "/tmp/test.db"})
        assert isinstance(creds, SQLiteCredentials)


class TestSQLiteExecution:
    def test_execute_no_params(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT COUNT(*) FROM events", None)
        assert rows == [(1,)]

    def test_execute_with_params(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT user_id FROM events WHERE event_name = ?", ["PageView"])
        assert rows == [("u1",)]

    def test_table_exists_true(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "events") is True

    def test_table_exists_false(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "nope") is False

    def test_get_table_columns(self, backend, mem_conn):
        cols = backend.get_table_columns(mem_conn, '"events"')
        assert "user_id" in cols and "timestamp" in cols

    def test_get_tables(self, backend, mem_conn):
        assert "events" in backend.get_tables(mem_conn)

    def test_get_columns_for_browse(self, backend, mem_conn):
        cols = backend.get_columns_for_browse(mem_conn, "events")
        assert "user_id" in cols


class TestSQLiteBrowse:
    def test_browse_returns_tables(self, backend, mem_conn):
        items = backend.browse(mem_conn, catalog=None, schema=None)
        assert any(i["name"] == "events" for i in items)
        assert all(i["kind"] == "table" for i in items)

    def test_browse_ignores_catalog_and_schema(self, backend, mem_conn):
        a = backend.browse(mem_conn, None, None)
        b = backend.browse(mem_conn, "x", "y")
        assert a == b


class TestSQLiteDetectSchema:
    def test_detect_schema_finds_events(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.events_table == "events"
        col_names = [c.name for c in info.columns]
        assert "user_id" in col_names

    def test_detect_schema_suggestions(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.suggestions.get("user_id_field") == "user_id"

    def test_detect_schema_infers_numeric_json_property(self, backend):
        import sqlite3 as _sqlite3
        conn = _sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE purchases (user_id TEXT, timestamp TEXT, event_name TEXT, props TEXT)"
        )
        conn.execute("INSERT INTO purchases VALUES ('u1', '2024-01-01', 'Buy', '{\"price\": \"9.99\"}')")
        conn.execute("INSERT INTO purchases VALUES ('u2', '2024-01-02', 'Buy', '{\"price\": \"19.99\"}')")
        conn.commit()
        info = backend.detect_schema(conn, "purchases")
        conn.close()
        prop = next((p for p in info.proposed_custom_properties if p["name"] == "price"), None)
        assert prop is not None, "price should be in proposed_custom_properties"
        assert prop["type"] == "number", f"expected 'number', got '{prop['type']}'"


class TestSQLiteCTE:
    def test_prepend_events_cte_uses_regex(self, backend):
        cte_body = "(SELECT user_id, timestamp, event_name FROM raw)"
        query = "SELECT COUNT(*) FROM events WHERE event_name = 'x'"
        result = backend.prepend_events_cte(cte_body, query)
        assert cte_body in result

    def test_build_events_cte_no_exclude(self, backend):
        cte = backend.build_events_cte("raw", "uid", "ts", "action", [{"path": "props"}])
        assert "uid" in cte and "user_id" in cte
        assert "EXCLUDE" not in cte


class TestSQLiteSQLFragments:
    def test_date_trunc_day(self, backend):
        assert "DATE" in backend.date_trunc("day", "ts").upper()

    def test_date_diff_days(self, backend):
        assert "julianday" in backend.date_diff_days("a", "b").lower()

    def test_epoch_diff_seconds(self, backend):
        assert "STRFTIME" in backend.epoch_diff_seconds("a", "b").upper()

    def test_interval_minutes_exceeded(self, backend):
        assert "1800" in backend.interval_minutes_exceeded("a", "b", 30)

    def test_string_concat(self, backend):
        assert " || " in backend.string_concat("a", "b")

    def test_cast_to_text(self, backend):
        assert "TEXT" in backend.cast_to_text("x").upper()

    def test_json_extract_string(self, backend):
        assert "json_extract" in backend.json_extract_string("props", "key").lower()

    def test_extract_hour(self, backend):
        assert "STRFTIME" in backend.extract_hour("ts").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper() or "/" in backend.extract_quarter("ts")


class TestSQLiteConnection:
    def test_execute_returns_rows(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT COUNT(*) FROM events", None)
        assert rows[0][0] == 1

    def test_get_tables_returns_events(self, backend, mem_conn):
        tables = backend.get_tables(mem_conn)
        assert "events" in tables
