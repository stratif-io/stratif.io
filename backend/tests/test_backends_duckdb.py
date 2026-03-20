"""Tests for the DuckDB database backend."""
import duckdb
import pytest

from backend.backends.duckdb import DuckDBBackend
from backend.backends.duckdb.credentials import DuckDBCredentials
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return DuckDBBackend()


@pytest.fixture
def mem_conn():
    conn = duckdb.connect(":memory:")
    conn.execute("""
        CREATE TABLE events (
            user_id VARCHAR, timestamp TIMESTAMP, event_name VARCHAR, properties VARCHAR
        )
    """)
    conn.execute("""
        INSERT INTO events VALUES
            ('u1', '2024-01-01 10:00:00', 'PageView', '{"device":"mobile"}'),
            ('u2', '2024-01-02 11:00:00', 'Purchase', NULL)
    """)
    yield conn
    conn.close()


class TestDuckDBBackendIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "duckdb"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_false(self, backend):
        assert backend.use_pool is False

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)


class TestDuckDBCredentials:
    def test_file_path_valid(self):
        c = DuckDBCredentials(file_path="/tmp/test.duckdb")
        assert c.file_path == "/tmp/test.duckdb"

    def test_s3_path_valid(self):
        c = DuckDBCredentials(s3_path="s3://bucket/db.duckdb")
        assert c.s3_path == "s3://bucket/db.duckdb"

    def test_neither_path_raises(self):
        with pytest.raises(Exception):
            DuckDBCredentials()

    def test_parse_credentials_file_path(self, backend):
        creds = backend.parse_credentials({"file_path": "/tmp/test.duckdb"})
        assert isinstance(creds, DuckDBCredentials)
        assert creds.file_path == "/tmp/test.duckdb"

    def test_parse_credentials_s3(self, backend):
        creds = backend.parse_credentials({"s3_path": "s3://bucket/db.duckdb"})
        assert isinstance(creds, DuckDBCredentials)
        assert creds.s3_path == "s3://bucket/db.duckdb"


class TestDuckDBExecution:
    def test_execute_returns_rows(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT COUNT(*) FROM events", None)
        assert rows == [(2,)]

    def test_execute_with_params(self, backend, mem_conn):
        rows = backend.execute(mem_conn, "SELECT user_id FROM events WHERE event_name = ?", ["Purchase"])
        assert rows == [("u2",)]

    def test_table_exists_true(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "events") is True

    def test_table_exists_false(self, backend, mem_conn):
        assert backend.table_exists(mem_conn, "nonexistent") is False

    def test_get_table_columns(self, backend, mem_conn):
        cols = backend.get_table_columns(mem_conn, '"events"')
        assert "user_id" in cols
        assert "timestamp" in cols

    def test_get_table_columns_bad_table_returns_empty(self, backend, mem_conn):
        cols = backend.get_table_columns(mem_conn, '"nope"')
        assert cols == frozenset()

    def test_get_tables(self, backend, mem_conn):
        tables = backend.get_tables(mem_conn)
        assert "events" in tables

    def test_get_columns_for_browse(self, backend, mem_conn):
        cols = backend.get_columns_for_browse(mem_conn, "events")
        assert "user_id" in cols

    def test_is_connection_error_false_for_unrelated(self, backend):
        assert backend.is_connection_error(ValueError("nope")) is False


class TestDuckDBBrowse:
    def test_browse_schema_none_returns_schemas(self, backend, mem_conn):
        items = backend.browse(mem_conn, catalog=None, schema=None)
        names = [i["name"] for i in items]
        assert "main" in names
        assert all(i["kind"] == "schema" for i in items)

    def test_browse_with_schema_returns_tables(self, backend, mem_conn):
        items = backend.browse(mem_conn, catalog=None, schema="main")
        names = [i["name"] for i in items]
        assert "events" in names
        assert all(i["kind"] == "table" for i in items)


class TestDuckDBDetectSchema:
    def test_detect_schema_finds_events_table(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.events_table == "events"
        assert len(info.columns) > 0

    def test_detect_schema_columns_have_name_and_type(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        col_names = [c.name for c in info.columns]
        assert "user_id" in col_names
        assert all(c.type for c in info.columns)  # type is non-empty

    def test_detect_schema_suggests_standard_fields(self, backend, mem_conn):
        info = backend.detect_schema(mem_conn, None)
        assert info.suggestions.get("user_id_field") == "user_id"
        assert info.suggestions.get("timestamp_field") == "timestamp"

    def test_detect_schema_hint_selects_table(self, backend, mem_conn):
        mem_conn.execute("CREATE TABLE other_table (id INTEGER)")
        info = backend.detect_schema(mem_conn, "other_table")
        assert info.events_table == "other_table"

    def test_detect_schema_infers_numeric_json_property(self, backend):
        import duckdb as _duckdb
        conn = _duckdb.connect(":memory:")
        conn.execute(
            "CREATE TABLE events (user_id VARCHAR, timestamp TIMESTAMP, event_name VARCHAR, properties JSON)"
        )
        conn.execute(
            "INSERT INTO events VALUES "
            "('u1', '2024-01-01', 'Purchase', '{\"total_amount\": 99.99}'), "
            "('u2', '2024-01-02', 'Purchase', '{\"total_amount\": 49.50}')"
        )
        info = backend.detect_schema(conn, None)
        conn.close()
        prop = next((p for p in info.proposed_custom_properties if p["name"] == "total_amount"), None)
        assert prop is not None, "total_amount should be in proposed_custom_properties"
        assert prop["type"] == "number", f"expected 'number', got '{prop['type']}'"


class TestDuckDBCTE:
    def test_build_events_cte_with_remap(self, backend):
        cte = backend.build_events_cte(
            source_table="raw_events",
            uid_field="uid",
            ts_field="ts",
            en_field="action",
            custom_props=[],
        )
        assert "uid" in cte
        assert "user_id" in cte
        assert "EXCLUDE" in cte  # DuckDB uses EXCLUDE

    def test_prepend_events_cte_wraps_query(self, backend):
        cte_body = "(SELECT * FROM raw)"
        query = "SELECT COUNT(*) FROM events"
        result = backend.prepend_events_cte(cte_body, query)
        assert result.startswith("WITH events AS")
        assert "SELECT COUNT(*) FROM events" in result

    def test_prepend_events_cte_appends_to_existing_with(self, backend):
        cte_body = "(SELECT * FROM raw)"
        query = "WITH x AS (SELECT 1) SELECT * FROM events JOIN x ON true"
        result = backend.prepend_events_cte(cte_body, query)
        assert "events AS" in result
        assert "x AS" in result


class TestDuckDBSQLFragments:
    def test_date_trunc_day(self, backend):
        assert backend.date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"

    def test_date_diff_days(self, backend):
        assert "date_diff" in backend.date_diff_days("a", "b").lower()

    def test_epoch_diff_seconds(self, backend):
        assert "EPOCH" in backend.epoch_diff_seconds("a", "b").upper()

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "30" in result and "INTERVAL" in result.upper()

    def test_string_concat(self, backend):
        assert backend.string_concat("a", "b") == "a || b"

    def test_cast_to_text(self, backend):
        assert backend.cast_to_text("x") == "CAST(x AS TEXT)"

    def test_json_extract_string_simple(self, backend):
        result = backend.json_extract_string("properties", "device")
        assert "properties" in result and "device" in result

    def test_json_extract_string_nested(self, backend):
        result = backend.json_extract_string("props", "a.b")
        assert "props" in result and "a" in result and "b" in result

    def test_extract_hour(self, backend):
        assert "HOUR" in backend.extract_hour("ts").upper()

    def test_extract_day_of_week(self, backend):
        result = backend.extract_day_of_week("ts")
        assert "DAYOFWEEK" in result.upper() or "DOW" in result.upper()

    def test_extract_year(self, backend):
        assert "YEAR" in backend.extract_year("ts").upper()

    def test_extract_month(self, backend):
        assert "MONTH" in backend.extract_month("ts").upper()

    def test_extract_week(self, backend):
        assert "WEEK" in backend.extract_week("ts").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()
