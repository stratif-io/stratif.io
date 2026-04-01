"""Unit tests for SnowflakeBackend (mock-based)."""

import pytest

from backend.backends.snowflake.credentials import SnowflakeCredentials


class TestSnowflakeCredentials:
    def test_valid_minimal(self):
        c = SnowflakeCredentials(
            account="xy12345.us-east-1",
            user="alice",
            password="secret",
            warehouse="COMPUTE_WH",
            database="ANALYTICS",
            schema="PUBLIC",
        )
        assert c.role is None

    def test_with_role(self):
        c = SnowflakeCredentials(
            account="xy12345.us-east-1",
            user="alice",
            password="secret",
            warehouse="COMPUTE_WH",
            database="ANALYTICS",
            schema="PUBLIC",
            role="ANALYST",
        )
        assert c.role == "ANALYST"


from backend.backends.base import DatabaseBackend  # noqa: E402
from backend.backends.snowflake import SnowflakeBackend  # noqa: E402


@pytest.fixture
def backend():
    return SnowflakeBackend()


class TestSnowflakeIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "snowflake"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '"'

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)

    def test_pool_key(self, backend):
        creds = SnowflakeCredentials(
            account="a", user="u", password="p", warehouse="w", database="d", schema="s"
        )
        assert backend.pool_key("conn1", creds) == ("conn1", "snowflake")


class TestSnowflakeDialect:
    def test_date_trunc_day(self, backend):
        assert backend.date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"

    def test_date_trunc_month(self, backend):
        assert backend.date_trunc("month", "ts") == "DATE_TRUNC('month', ts)"

    def test_date_diff_days(self, backend):
        result = backend.date_diff_days("a", "b")
        assert "DATEDIFF" in result.upper() and "'day'" in result.lower()

    def test_epoch_diff_seconds(self, backend):
        result = backend.epoch_diff_seconds("a", "b")
        assert "DATEDIFF" in result.upper() and "'second'" in result.lower()

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "DATEDIFF" in result.upper() and "30" in result

    def test_string_concat_two(self, backend):
        result = backend.string_concat("a", "b")
        assert "||" in result

    def test_string_concat_three(self, backend):
        result = backend.string_concat("a", "b", "c")
        assert result.count("||") == 2

    def test_cast_to_text(self, backend):
        assert "::string" in backend.cast_to_text("x")

    def test_json_extract_string(self, backend):
        result = backend.json_extract_string("props", "key")
        assert "::string" in result

    def test_extract_hour(self, backend):
        assert "HOUR" in backend.extract_hour("ts").upper()

    def test_extract_day_of_week(self, backend):
        assert "DAYOFWEEK" in backend.extract_day_of_week("ts").upper()

    def test_extract_year(self, backend):
        assert "YEAR" in backend.extract_year("ts").upper()

    def test_extract_month(self, backend):
        assert "MONTH" in backend.extract_month("ts").upper()

    def test_extract_week(self, backend):
        assert "WEEK" in backend.extract_week("ts").upper()

    def test_extract_quarter(self, backend):
        assert "QUARTER" in backend.extract_quarter("ts").upper()


class TestSnowflakeSQLFragments:
    def test_date_trunc_day(self, backend):
        result = backend.date_trunc("day", "ts")
        assert "DATE_TRUNC" in result.upper() and "day" in result

    def test_date_diff_days(self, backend):
        result = backend.date_diff_days("a", "b")
        assert "DATEDIFF" in result.upper() or "TIMESTAMPDIFF" in result.upper()

    def test_json_extract_string(self, backend):
        result = backend.json_extract_string("v", "key")
        assert "v" in result and "key" in result

    def test_build_events_cte_no_exclude(self, backend):
        cte = backend.build_events_cte("raw", "uid", "ts", "action", [])
        assert "EXCLUDE" not in cte

    def test_cast_to_text(self, backend):
        result = backend.cast_to_text("x")
        assert "x" in result
        assert (
            "TEXT" in result.upper()
            or "VARCHAR" in result.upper()
            or "STRING" in result.upper()
        )

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "30" in result

    def test_string_concat(self, backend):
        result = backend.string_concat("a", "b")
        assert "||" in result or "CONCAT" in result.upper()
