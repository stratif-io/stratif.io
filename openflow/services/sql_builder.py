"""Dialect-aware SQL fragment builders for OpenFlow Analytics.

Use these helpers instead of raw SQL strings whenever a construct differs
between database engines. Each function returns a SQL string fragment that
is correct for the specified dialect — no transpilation step required.

Supported dialects (mirrors SQLGlot + common targets):
    "duckdb", "sqlite", "postgres", "mysql",
    "bigquery", "snowflake", "redshift", "tsql"

Usage pattern in API endpoints:
    from openflow.services.sql_builder import date_trunc, date_diff_days

    dialect = db.get_dialect()
    day_col  = date_trunc("day", "timestamp", dialect)
    query    = f"SELECT {day_col} AS date, COUNT(*) FROM events GROUP BY {day_col}"
    result   = db.execute(query, params)
"""

# ---------------------------------------------------------------------------
# Date / timestamp truncation
# ---------------------------------------------------------------------------


def date_trunc(unit: str, col_expr: str, dialect: str = "duckdb") -> str:
    """Truncate *col_expr* to the start of the given time *unit*.

    Args:
        unit:     "hour" | "day" | "week" | "month" | "year"
        col_expr: SQL expression for the timestamp column (e.g. ``"timestamp"``)
        dialect:  Target SQL dialect

    Dialect rendering:
        DuckDB / Postgres / Snowflake / Redshift:
            DATE_TRUNC('day', timestamp)
        BigQuery:
            DATE_TRUNC(timestamp, DAY)
        SQLite:
            DATE(timestamp)  /  STRFTIME('%Y-%m-01', timestamp)  / …
        MySQL:
            DATE(timestamp)  /  DATE_FORMAT(timestamp, '%Y-%m-01')  / …
    """
    if dialect == "sqlite":
        _sqlite_map: dict[str, str] = {
            "hour": f"STRFTIME('%Y-%m-%d %H:00:00', {col_expr})",
            "day": f"DATE({col_expr})",
            "week": f"DATE({col_expr}, 'weekday 1', '-6 days')",  # ISO Mon
            "month": f"STRFTIME('%Y-%m-01', {col_expr})",
            "year": f"STRFTIME('%Y-01-01', {col_expr})",
        }
        return _sqlite_map.get(unit, f"DATE({col_expr})")

    if dialect == "mysql":
        _mysql_map: dict[str, str] = {
            "hour": f"DATE_FORMAT({col_expr}, '%Y-%m-%d %H:00:00')",
            "day": f"DATE({col_expr})",
            "week": f"DATE_FORMAT({col_expr}, '%x-%v')",  # ISO week
            "month": f"DATE_FORMAT({col_expr}, '%Y-%m-01')",
            "year": f"DATE_FORMAT({col_expr}, '%Y-01-01')",
        }
        return _mysql_map.get(unit, f"DATE({col_expr})")

    if dialect == "bigquery":
        _bq_unit = {
            "hour": "HOUR",
            "day": "DAY",
            "week": "WEEK",
            "month": "MONTH",
            "year": "YEAR",
        }.get(unit, unit.upper())
        return f"DATE_TRUNC({col_expr}, {_bq_unit})"

    if dialect == "tsql":
        _tsql_map: dict[str, str] = {
            "hour": f"DATEADD(hour, DATEDIFF(hour, 0, {col_expr}), 0)",
            "day": f"CAST({col_expr} AS DATE)",
            "week": f"DATEADD(week, DATEDIFF(week, 0, {col_expr}), 0)",
            "month": f"DATEADD(month, DATEDIFF(month, 0, {col_expr}), 0)",
            "year": f"DATEADD(year, DATEDIFF(year, 0, {col_expr}), 0)",
        }
        return _tsql_map.get(unit, f"CAST({col_expr} AS DATE)")

    # DuckDB, Postgres, Snowflake, Redshift
    return f"DATE_TRUNC('{unit}', {col_expr})"


# ---------------------------------------------------------------------------
# Date difference
# ---------------------------------------------------------------------------


def date_diff_days(start_expr: str, end_expr: str, dialect: str = "duckdb") -> str:
    """Integer number of whole days between *start_expr* and *end_expr*.

    Args:
        start_expr: Earlier date/timestamp expression
        end_expr:   Later date/timestamp expression
        dialect:    Target SQL dialect

    Dialect rendering:
        DuckDB:             DATE_DIFF('day', start, end)
        Postgres:           EXTRACT(DAY FROM (end::timestamp - start::timestamp))::INTEGER
        SQLite:             CAST(julianday(end) - julianday(start) AS INTEGER)
        MySQL:              DATEDIFF(end, start)
        BigQuery:           DATE_DIFF(end, start, DAY)
        Snowflake/Redshift: DATEDIFF('day', start, end)
    """
    if dialect == "sqlite":
        return f"CAST(julianday({end_expr}) - julianday({start_expr}) AS INTEGER)"
    if dialect == "mysql":
        return f"DATEDIFF({end_expr}, {start_expr})"
    if dialect == "postgres":
        return f"CAST(EXTRACT(DAY FROM ({end_expr}::timestamp - {start_expr}::timestamp)) AS INTEGER)"
    if dialect == "bigquery":
        return f"DATE_DIFF({end_expr}, {start_expr}, DAY)"
    if dialect in ("snowflake", "redshift"):
        return f"DATEDIFF('day', {start_expr}, {end_expr})"
    if dialect == "tsql":
        return f"DATEDIFF(day, {start_expr}, {end_expr})"
    # DuckDB
    return f"DATE_DIFF('day', {start_expr}, {end_expr})"


# ---------------------------------------------------------------------------
# Epoch / seconds difference
# ---------------------------------------------------------------------------


def epoch_diff_seconds(start_expr: str, end_expr: str, dialect: str = "duckdb") -> str:
    """Difference between two timestamps in **seconds** (as a number).

    Commonly used for session duration and time-to-complete metrics.

    Args:
        start_expr: Earlier timestamp expression (e.g. ``"MIN(timestamp)"``)
        end_expr:   Later timestamp expression  (e.g. ``"MAX(timestamp)"``)
        dialect:    Target SQL dialect

    Dialect rendering:
        DuckDB / Postgres: EXTRACT(EPOCH FROM (end - start))
        SQLite:            STRFTIME('%s', end) - STRFTIME('%s', start)
        MySQL:             TIMESTAMPDIFF(SECOND, start, end)
        BigQuery:          TIMESTAMP_DIFF(end, start, SECOND)
        Snowflake/Redshift: DATEDIFF('second', start, end)
        TSQL:              DATEDIFF(second, start, end)
    """
    if dialect == "sqlite":
        return f"(STRFTIME('%s', {end_expr}) - STRFTIME('%s', {start_expr}))"
    if dialect == "mysql":
        return f"TIMESTAMPDIFF(SECOND, {start_expr}, {end_expr})"
    if dialect == "bigquery":
        return f"TIMESTAMP_DIFF({end_expr}, {start_expr}, SECOND)"
    if dialect in ("snowflake", "redshift"):
        return f"DATEDIFF('second', {start_expr}, {end_expr})"
    if dialect == "tsql":
        return f"DATEDIFF(second, {start_expr}, {end_expr})"
    # DuckDB, Postgres
    return f"EXTRACT(EPOCH FROM ({end_expr} - {start_expr}))"


# ---------------------------------------------------------------------------
# Session / interval helpers
# ---------------------------------------------------------------------------


def interval_minutes_exceeded(
    col_earlier: str, col_later: str, minutes: int, dialect: str = "duckdb"
) -> str:
    """SQL condition: the gap between *col_earlier* and *col_later* exceeds *minutes*.

    Used in session-boundary detection (is this event the start of a new session?).

    Args:
        col_earlier: Earlier timestamp column / expression
        col_later:   Later timestamp column / expression
        minutes:     Threshold in minutes
        dialect:     Target SQL dialect

    Dialect rendering:
        DuckDB / Postgres / Snowflake:
            col_later - col_earlier > INTERVAL 'N minutes'
        SQLite:
            (STRFTIME('%s', col_later) - STRFTIME('%s', col_earlier)) > N*60
        MySQL:
            TIMESTAMPDIFF(MINUTE, col_earlier, col_later) > N
        BigQuery:
            TIMESTAMP_DIFF(col_later, col_earlier, MINUTE) > N
        Redshift:
            DATEDIFF('minute', col_earlier, col_later) > N
        TSQL:
            DATEDIFF(minute, col_earlier, col_later) > N
    """
    if dialect == "sqlite":
        secs = minutes * 60
        return f"(STRFTIME('%s', {col_later}) - STRFTIME('%s', {col_earlier})) > {secs}"
    if dialect == "mysql":
        return f"TIMESTAMPDIFF(MINUTE, {col_earlier}, {col_later}) > {minutes}"
    if dialect == "bigquery":
        return f"TIMESTAMP_DIFF({col_later}, {col_earlier}, MINUTE) > {minutes}"
    if dialect == "redshift":
        return f"DATEDIFF('minute', {col_earlier}, {col_later}) > {minutes}"
    if dialect == "tsql":
        return f"DATEDIFF(minute, {col_earlier}, {col_later}) > {minutes}"
    # DuckDB, Postgres, Snowflake
    return f"{col_later} - {col_earlier} > INTERVAL '{minutes} minutes'"


# ---------------------------------------------------------------------------
# String utilities
# ---------------------------------------------------------------------------


def string_concat(*parts: str, dialect: str = "duckdb") -> str:
    """String concatenation, rendered for the target dialect.

    All dialects except MySQL support the ``||`` operator.
    MySQL requires ``CONCAT()``.

    Args:
        *parts:  SQL expressions to concatenate
        dialect: Target SQL dialect

    Examples:
        string_concat("user_id", "'-'", "CAST(n AS TEXT)", dialect="duckdb")
        → user_id || '-' || CAST(n AS TEXT)

        string_concat("user_id", "'-'", "CAST(n AS TEXT)", dialect="mysql")
        → CONCAT(user_id, '-', CAST(n AS TEXT))
    """
    if dialect == "mysql":
        return f"CONCAT({', '.join(parts)})"
    return " || ".join(parts)


def cast_to_text(expr: str, dialect: str = "duckdb") -> str:
    """Cast *expr* to a string/text type appropriate for the dialect.

    Args:
        expr:    SQL expression to cast
        dialect: Target SQL dialect

    Dialect rendering:
        MySQL: CAST(expr AS CHAR)
        All others: CAST(expr AS TEXT)

    Note: ``TEXT`` is preferred over ``VARCHAR`` because it is valid in
    SQLite's CAST expressions (SQLite silently accepts any type name but
    only guarantees TEXT/INTEGER/REAL/NUMERIC/BLOB affinities).
    """
    if dialect == "mysql":
        return f"CAST({expr} AS CHAR)"
    return f"CAST({expr} AS TEXT)"


# ---------------------------------------------------------------------------
# JSON column access
# ---------------------------------------------------------------------------


def json_extract_string(col: str, key: str, dialect: str = "duckdb") -> str:
    """Extract a **string** value from a JSON column.

    Supports simple keys (``"device_type"``) and dot-separated nested paths
    (``"campaign.source"``).

    Args:
        col:     Column name containing JSON data (e.g. ``"properties"``)
        key:     Property key or dot-path (e.g. ``"device_type"``)
        dialect: Target SQL dialect

    Dialect rendering:
        DuckDB:    json_extract_string(properties, '$.device_type')
        SQLite:    json_extract(properties, '$.device_type')
        Postgres:  properties->>'device_type'
        MySQL:     JSON_UNQUOTE(JSON_EXTRACT(properties, '$.device_type'))
        BigQuery:  JSON_EXTRACT_SCALAR(properties, '$.device_type')
        Snowflake: properties:device_type::STRING
        Redshift/TSQL: JSON_EXTRACT_PATH_TEXT(properties, 'device_type')

    Note: DuckDB uses json_extract_string() (not ->>) because the ->> operator
    on DuckDB JSON/VARCHAR columns returns a JSON type rather than VARCHAR, which
    causes type-conversion errors when the result is compared to a bound parameter.
    """
    parts = key.split(".")
    json_path = "$." + ".".join(parts)

    if dialect == "sqlite":
        return f"json_extract({col}, '{json_path}')"
    if dialect == "mysql":
        return f"JSON_UNQUOTE(JSON_EXTRACT({col}, '{json_path}'))"
    if dialect == "bigquery":
        return f"JSON_EXTRACT_SCALAR({col}, '{json_path}')"
    if dialect == "snowflake":
        path = ":".join(parts)
        return f"{col}:{path}::STRING"
    if dialect in ("redshift", "tsql"):
        extract_key = ".".join(parts)
        return f"JSON_EXTRACT_PATH_TEXT({col}, '{extract_key}')"
    if dialect == "postgres":
        # PostgreSQL ->> returns text from JSON/JSONB
        if len(parts) == 1:
            return f"{col}->>'{key}'"
        path_args = ", ".join(f"'{p}'" for p in parts)
        return f"json_extract_path_text({col}, {path_args})"
    # DuckDB: always use json_extract_string() which explicitly returns VARCHAR.
    # The ->> operator on DuckDB JSON columns returns a JSON type (not VARCHAR),
    # which causes ConversionException when compared to a bound string parameter.
    return f"json_extract_string({col}, '{json_path}')"


# ---------------------------------------------------------------------------
# Timestamp part extraction
# ---------------------------------------------------------------------------


def extract_hour(col_expr: str, dialect: str = "duckdb") -> str:
    """Extract the hour (0–23) from a timestamp as an integer.

    Dialect rendering:
        DuckDB / Postgres / Snowflake / Redshift:
            CAST(EXTRACT(HOUR FROM timestamp) AS INTEGER)
        SQLite: CAST(STRFTIME('%H', timestamp) AS INTEGER)
        MySQL:  HOUR(timestamp)
        BigQuery: EXTRACT(HOUR FROM timestamp)
        TSQL:   DATEPART(hour, timestamp)
    """
    if dialect == "sqlite":
        return f"CAST(STRFTIME('%H', {col_expr}) AS INTEGER)"
    if dialect == "mysql":
        return f"HOUR({col_expr})"
    if dialect == "bigquery":
        return f"EXTRACT(HOUR FROM {col_expr})"
    if dialect == "tsql":
        return f"DATEPART(hour, {col_expr})"
    return f"CAST(EXTRACT(HOUR FROM {col_expr}) AS INTEGER)"


def extract_year(col_expr: str, dialect: str = "duckdb") -> str:
    """Extract the year as an integer (e.g. 2024)."""
    if dialect == "sqlite":
        return f"CAST(STRFTIME('%Y', {col_expr}) AS INTEGER)"
    if dialect == "mysql":
        return f"YEAR({col_expr})"
    if dialect == "bigquery":
        return f"EXTRACT(YEAR FROM {col_expr})"
    if dialect == "tsql":
        return f"DATEPART(year, {col_expr})"
    return f"CAST(EXTRACT(YEAR FROM {col_expr}) AS INTEGER)"


def extract_quarter(col_expr: str, dialect: str = "duckdb") -> str:
    """Extract the quarter as an integer (1–4)."""
    if dialect == "sqlite":
        return f"CAST((CAST(STRFTIME('%m', {col_expr}) AS INTEGER) + 2) / 3 AS INTEGER)"
    if dialect == "mysql":
        return f"QUARTER({col_expr})"
    if dialect == "bigquery":
        return f"EXTRACT(QUARTER FROM {col_expr})"
    if dialect == "tsql":
        return f"DATEPART(quarter, {col_expr})"
    return f"CAST(EXTRACT(QUARTER FROM {col_expr}) AS INTEGER)"


def extract_month(col_expr: str, dialect: str = "duckdb") -> str:
    """Extract the month as an integer (1–12)."""
    if dialect == "sqlite":
        return f"CAST(STRFTIME('%m', {col_expr}) AS INTEGER)"
    if dialect == "mysql":
        return f"MONTH({col_expr})"
    if dialect == "bigquery":
        return f"EXTRACT(MONTH FROM {col_expr})"
    if dialect == "tsql":
        return f"DATEPART(month, {col_expr})"
    return f"CAST(EXTRACT(MONTH FROM {col_expr}) AS INTEGER)"


def extract_week(col_expr: str, dialect: str = "duckdb") -> str:
    """Extract the ISO week number as an integer (1–53)."""
    if dialect == "sqlite":
        return f"CAST(STRFTIME('%W', {col_expr}) AS INTEGER)"
    if dialect == "mysql":
        return f"WEEK({col_expr}, 3)"
    if dialect == "bigquery":
        return f"EXTRACT(ISOWEEK FROM {col_expr})"
    if dialect == "tsql":
        return f"DATEPART(iso_week, {col_expr})"
    # DuckDB, Postgres, Snowflake, Redshift
    return f"CAST(EXTRACT(WEEK FROM {col_expr}) AS INTEGER)"


def extract_day_of_week(col_expr: str, dialect: str = "duckdb") -> str:
    """Extract day of week from a timestamp (0 = Sunday, 6 = Saturday).

    Dialect rendering:
        DuckDB:   CAST(EXTRACT(DAYOFWEEK FROM timestamp) AS INTEGER)
        Postgres: CAST(EXTRACT(DOW FROM timestamp) AS INTEGER)
        SQLite:   CAST(STRFTIME('%w', timestamp) AS INTEGER)
        MySQL:    (DAYOFWEEK(timestamp) - 1)   ← MySQL 1-indexes from Sunday
        BigQuery: EXTRACT(DAYOFWEEK FROM timestamp) - 1
        TSQL:     (DATEPART(weekday, timestamp) - 1)
    """
    if dialect == "sqlite":
        return f"CAST(STRFTIME('%w', {col_expr}) AS INTEGER)"
    if dialect == "mysql":
        return f"(DAYOFWEEK({col_expr}) - 1)"
    if dialect == "bigquery":
        return f"(EXTRACT(DAYOFWEEK FROM {col_expr}) - 1)"
    if dialect == "postgres":
        return f"CAST(EXTRACT(DOW FROM {col_expr}) AS INTEGER)"
    if dialect == "tsql":
        return f"(DATEPART(weekday, {col_expr}) - 1)"
    # DuckDB, Snowflake, Redshift
    return f"CAST(EXTRACT(DAYOFWEEK FROM {col_expr}) AS INTEGER)"
