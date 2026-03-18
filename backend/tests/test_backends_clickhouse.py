"""Unit tests for ClickHouseBackend (mock-based)."""
import pytest
from backend.backends.clickhouse.credentials import ClickHouseCredentials


class TestClickHouseCredentials:
    def test_valid_minimal(self):
        c = ClickHouseCredentials(host="ch.example.com", database="analytics",
                                   user="default", password="secret")
        assert c.port == 8443
        assert c.secure is True
        assert c.always_final is False

    def test_custom_port(self):
        c = ClickHouseCredentials(host="localhost", database="db",
                                   user="u", password="p", port=9000, secure=False)
        assert c.port == 9000
        assert c.secure is False

    def test_always_final_flag(self):
        c = ClickHouseCredentials(host="h", database="db", user="u",
                                   password="p", always_final=True)
        assert c.always_final is True


from backend.backends.clickhouse import ClickHouseBackend
from backend.backends.base import DatabaseBackend


@pytest.fixture
def backend():
    return ClickHouseBackend()


class TestClickHouseIdentity:
    def test_dialect_name(self, backend):
        assert backend.dialect_name == "clickhouse"

    def test_identifier_quote_char(self, backend):
        assert backend.identifier_quote_char == '`'

    def test_use_pool_is_true(self, backend):
        assert backend.use_pool is True

    def test_implements_protocol(self, backend):
        assert isinstance(backend, DatabaseBackend)

    def test_pool_key(self, backend):
        creds = ClickHouseCredentials(host="h", database="db", user="u", password="p")
        assert backend.pool_key("conn1", creds) == ("conn1", "clickhouse")


class TestClickHouseDialect:
    def test_date_trunc_hour(self, backend):
        assert backend.date_trunc("hour", "ts") == "toStartOfHour(ts)"

    def test_date_trunc_day(self, backend):
        assert backend.date_trunc("day", "ts") == "toStartOfDay(ts)"

    def test_date_trunc_week(self, backend):
        assert backend.date_trunc("week", "ts") == "toStartOfWeek(ts)"

    def test_date_trunc_month(self, backend):
        assert backend.date_trunc("month", "ts") == "toStartOfMonth(ts)"

    def test_date_trunc_quarter(self, backend):
        assert backend.date_trunc("quarter", "ts") == "toStartOfQuarter(ts)"

    def test_date_trunc_year(self, backend):
        assert backend.date_trunc("year", "ts") == "toStartOfYear(ts)"

    def test_date_trunc_unknown_raises(self, backend):
        with pytest.raises(ValueError, match="Unsupported date_trunc unit"):
            backend.date_trunc("decade", "ts")

    def test_date_diff_days(self, backend):
        result = backend.date_diff_days("a", "b")
        assert "dateDiff" in result and "'day'" in result

    def test_epoch_diff_seconds(self, backend):
        result = backend.epoch_diff_seconds("a", "b")
        assert "dateDiff" in result and "'second'" in result

    def test_interval_minutes_exceeded(self, backend):
        result = backend.interval_minutes_exceeded("a", "b", 30)
        assert "dateDiff" in result and "30" in result

    def test_string_concat_two(self, backend):
        result = backend.string_concat("a", "b")
        assert result == "concat(a, b)"

    def test_string_concat_three(self, backend):
        result = backend.string_concat("a", "b", "c")
        assert result == "concat(a, b, c)"

    def test_cast_to_text(self, backend):
        assert backend.cast_to_text("x") == "toString(x)"

    def test_json_extract_string(self, backend):
        result = backend.json_extract_string("props", "key")
        assert "JSONExtractString" in result

    def test_extract_hour(self, backend):
        assert backend.extract_hour("ts") == "toHour(ts)"

    def test_extract_day_of_week(self, backend):
        assert backend.extract_day_of_week("ts") == "toDayOfWeek(ts)"

    def test_extract_year(self, backend):
        assert backend.extract_year("ts") == "toYear(ts)"

    def test_extract_month(self, backend):
        assert backend.extract_month("ts") == "toMonth(ts)"

    def test_extract_week(self, backend):
        assert backend.extract_week("ts") == "toWeek(ts)"

    def test_extract_quarter(self, backend):
        assert backend.extract_quarter("ts") == "toQuarter(ts)"
