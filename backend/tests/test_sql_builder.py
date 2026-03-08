"""Tests for openflow.services.sql_builder dialect outputs."""

from backend.services.sql_builder import (
    cast_to_text,
    date_diff_days,
    date_trunc,
    epoch_diff_seconds,
    extract_day_of_week,
    extract_hour,
    extract_year,
    interval_minutes_exceeded,
    json_extract_string,
    string_concat,
)

# ---------------------------------------------------------------------------
# date_trunc
# ---------------------------------------------------------------------------


class TestDateTrunc:
    def test_duckdb_day(self):
        assert date_trunc("day", "ts", "duckdb") == "DATE_TRUNC('day', ts)"

    def test_duckdb_month(self):
        assert date_trunc("month", "ts", "duckdb") == "DATE_TRUNC('month', ts)"

    def test_postgres_week(self):
        assert date_trunc("week", "ts", "postgres") == "DATE_TRUNC('week', ts)"

    def test_databricks_day(self):
        assert date_trunc("day", "ts", "databricks") == "DATE_TRUNC('day', ts)"

    def test_sqlite_day(self):
        assert date_trunc("day", "ts", "sqlite") == "DATE(ts)"

    def test_sqlite_month(self):
        assert date_trunc("month", "ts", "sqlite") == "STRFTIME('%Y-%m-01', ts)"

    def test_sqlite_year(self):
        assert date_trunc("year", "ts", "sqlite") == "STRFTIME('%Y-01-01', ts)"

    def test_bigquery_swaps_args(self):
        result = date_trunc("day", "ts", "bigquery")
        assert result == "DATE_TRUNC(ts, DAY)"

    def test_bigquery_month(self):
        result = date_trunc("month", "ts", "bigquery")
        assert result == "DATE_TRUNC(ts, MONTH)"

    def test_default_dialect_is_duckdb(self):
        assert date_trunc("day", "ts") == "DATE_TRUNC('day', ts)"


# ---------------------------------------------------------------------------
# date_diff_days
# ---------------------------------------------------------------------------


class TestDateDiffDays:
    def test_duckdb(self):
        assert date_diff_days("s", "e", "duckdb") == "DATE_DIFF('day', s, e)"

    def test_sqlite(self):
        assert (
            date_diff_days("s", "e", "sqlite")
            == "CAST(julianday(e) - julianday(s) AS INTEGER)"
        )

    def test_postgres(self):
        result = date_diff_days("s", "e", "postgres")
        assert "EXTRACT" in result
        assert "DAY" in result

    def test_databricks_end_before_start_in_args(self):
        # Databricks DATEDIFF(end, start) — note reversed arg order
        result = date_diff_days("s", "e", "databricks")
        assert result == "DATEDIFF(e, s)"

    def test_mysql(self):
        result = date_diff_days("s", "e", "mysql")
        assert result == "DATEDIFF(e, s)"

    def test_bigquery(self):
        result = date_diff_days("s", "e", "bigquery")
        assert result == "DATE_DIFF(e, s, DAY)"


# ---------------------------------------------------------------------------
# json_extract_string
# ---------------------------------------------------------------------------


class TestJsonExtractString:
    def test_duckdb_simple_key(self):
        result = json_extract_string("props", "country", "duckdb")
        assert "json_extract_string" in result
        assert "$.country" in result

    def test_sqlite_uses_json_extract(self):
        result = json_extract_string("props", "country", "sqlite")
        assert result == "json_extract(props, '$.country')"

    def test_postgres_simple_key_uses_arrow(self):
        result = json_extract_string("props", "country", "postgres")
        assert result == "props->>'country'"

    def test_postgres_nested_key(self):
        result = json_extract_string("props", "campaign.source", "postgres")
        assert "json_extract_path_text" in result
        assert "'campaign'" in result
        assert "'source'" in result

    def test_databricks_uses_get_json_object(self):
        result = json_extract_string("props", "country", "databricks")
        assert "get_json_object" in result
        assert "$.country" in result

    def test_nested_dot_path(self):
        result = json_extract_string("props", "a.b.c", "duckdb")
        assert "$.a.b.c" in result

    def test_mysql_uses_json_unquote(self):
        result = json_extract_string("props", "key", "mysql")
        assert "JSON_UNQUOTE" in result
        assert "JSON_EXTRACT" in result


# ---------------------------------------------------------------------------
# string_concat
# ---------------------------------------------------------------------------


class TestStringConcat:
    def test_duckdb_uses_pipe(self):
        assert string_concat("a", "b", dialect="duckdb") == "a || b"

    def test_mysql_uses_concat_function(self):
        assert string_concat("a", "b", dialect="mysql") == "CONCAT(a, b)"

    def test_three_parts(self):
        assert string_concat("a", "'-'", "b", dialect="duckdb") == "a || '-' || b"

    def test_databricks_uses_pipe(self):
        assert string_concat("a", "b", dialect="databricks") == "a || b"


# ---------------------------------------------------------------------------
# cast_to_text
# ---------------------------------------------------------------------------


class TestCastToText:
    def test_duckdb(self):
        assert cast_to_text("x", "duckdb") == "CAST(x AS TEXT)"

    def test_mysql_uses_char(self):
        assert cast_to_text("x", "mysql") == "CAST(x AS CHAR)"

    def test_databricks_uses_string(self):
        assert cast_to_text("x", "databricks") == "CAST(x AS STRING)"

    def test_sqlite(self):
        assert cast_to_text("x", "sqlite") == "CAST(x AS TEXT)"


# ---------------------------------------------------------------------------
# interval_minutes_exceeded
# ---------------------------------------------------------------------------


class TestIntervalMinutesExceeded:
    def test_sqlite_converts_to_seconds(self):
        result = interval_minutes_exceeded("a", "b", 30, "sqlite")
        assert "1800" in result  # 30 * 60

    def test_databricks_uses_unix_timestamp(self):
        result = interval_minutes_exceeded("a", "b", 30, "databricks")
        assert "unix_timestamp" in result
        assert "1800" in result

    def test_duckdb_uses_interval_syntax(self):
        result = interval_minutes_exceeded("a", "b", 30, "duckdb")
        assert "INTERVAL" in result
        assert "30 minutes" in result

    def test_mysql_uses_timestampdiff(self):
        result = interval_minutes_exceeded("a", "b", 30, "mysql")
        assert "TIMESTAMPDIFF" in result
        assert "MINUTE" in result


# ---------------------------------------------------------------------------
# extract_hour / extract_year / extract_day_of_week
# ---------------------------------------------------------------------------


class TestExtractFunctions:
    def test_extract_hour_sqlite(self):
        result = extract_hour("ts", "sqlite")
        assert "STRFTIME('%H'" in result

    def test_extract_hour_duckdb(self):
        result = extract_hour("ts", "duckdb")
        assert "EXTRACT(HOUR FROM ts)" in result

    def test_extract_year_sqlite(self):
        result = extract_year("ts", "sqlite")
        assert "STRFTIME('%Y'" in result

    def test_extract_year_duckdb(self):
        result = extract_year("ts", "duckdb")
        assert "EXTRACT(YEAR FROM ts)" in result

    def test_extract_day_of_week_postgres(self):
        result = extract_day_of_week("ts", "postgres")
        assert "DOW" in result

    def test_extract_day_of_week_sqlite(self):
        result = extract_day_of_week("ts", "sqlite")
        assert "STRFTIME('%w'" in result


# ---------------------------------------------------------------------------
# epoch_diff_seconds
# ---------------------------------------------------------------------------


class TestEpochDiffSeconds:
    def test_duckdb(self):
        result = epoch_diff_seconds("s", "e", "duckdb")
        assert "EPOCH" in result

    def test_sqlite(self):
        result = epoch_diff_seconds("s", "e", "sqlite")
        assert "STRFTIME('%s'" in result

    def test_databricks(self):
        result = epoch_diff_seconds("s", "e", "databricks")
        assert "unix_timestamp" in result

    def test_mysql(self):
        result = epoch_diff_seconds("s", "e", "mysql")
        assert "TIMESTAMPDIFF(SECOND" in result
