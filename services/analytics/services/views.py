"""Inline CTE definitions for analytics derived datasets.

These functions return CTE chains (everything that follows the WITH keyword,
without the WITH keyword itself) so that callers can compose them into any
query without needing write access to the target database.

All functions accept a *dialect* parameter and use helpers from
``stratifio.services.sql_builder`` to emit the correct SQL for each engine.
The generated CTEs are valid for DuckDB, SQLite, PostgreSQL, MySQL,
BigQuery, Snowflake, and Redshift without any post-processing.
"""

from services.analytics.services.sql_builder import (
    cast_to_text,
    epoch_diff_seconds,
    interval_minutes_exceeded,
    json_extract_string,
    lag_expr,
    string_concat,
)


def session_ctes(
    session_timeout_minutes: int = 30,
    dialect: str = "duckdb",
    events_prefilter: str = "",
) -> str:
    """CTE chain (without WITH) that defines ``derived_sessions``.

    Segments events into sessions based on an inactivity gap.  A new session
    starts whenever the gap between two consecutive events of the same user
    exceeds *session_timeout_minutes*.

    Usage:
        db.execute(f"WITH {session_ctes(30, db.get_dialect())} SELECT ... FROM derived_sessions")

    For endpoints that only care about sessions starting within a known time
    window, pass ``events_prefilter`` to push a WHERE clause into the first
    CTE stage. Any session starting in ``[T_start, T_end]`` is fully
    determined by events in ``[T_start - timeout_minutes, T_end]`` — older
    events can't participate (their gap > timeout → new session by
    definition). This turns the window-function passes from full-table scans
    into time-scoped scans. On large tables that's ~10-100x faster.

        events_prefilter = "WHERE timestamp >= ? AND timestamp <= ?"
        # caller binds ? to [period_start - timeout, period_end]

    Columns exposed by ``derived_sessions``:
        session_id  TEXT   — unique per user+session
        user_id     TEXT
        start_time  TIMESTAMP — first event of the session
        duration_sec FLOAT  — seconds from first to last event
        event_count INTEGER

    Args:
        session_timeout_minutes: Inactivity gap that starts a new session.
        dialect: Target SQL dialect (duckdb | sqlite | postgres | mysql | …)
        events_prefilter: Optional full ``WHERE ...`` clause applied to the
            ``events`` scan in the first CTE stage. Empty → full-table scan
            (backward-compat default).
    """
    interval_check = interval_minutes_exceeded(
        "prev_timestamp", "timestamp", session_timeout_minutes, dialect
    )
    duration_expr = epoch_diff_seconds("MIN(timestamp)", "MAX(timestamp)", dialect)
    session_num_cast = cast_to_text("session_number", dialect)
    session_id_expr = string_concat("user_id", "'-'", session_num_cast, dialect=dialect)
    lag_ts = lag_expr("timestamp", 1, dialect)
    lag_frame = (
        " ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING"
        if dialect == "clickhouse"
        else ""
    )

    return f"""
events_with_lag AS (
    SELECT
        user_id,
        event_name,
        timestamp,
        {lag_ts} OVER (PARTITION BY user_id ORDER BY timestamp{lag_frame}) AS prev_timestamp
    FROM events
    {events_prefilter}
),
session_markers AS (
    SELECT
        user_id,
        event_name,
        timestamp,
        CASE
            WHEN prev_timestamp IS NULL
                OR {interval_check}
            THEN 1
            ELSE 0
        END AS is_new_session
    FROM events_with_lag
),
session_ids AS (
    SELECT
        user_id,
        event_name,
        timestamp,
        SUM(is_new_session) OVER (
            PARTITION BY user_id
            ORDER BY timestamp
            ROWS UNBOUNDED PRECEDING
        ) AS session_number
    FROM session_markers
),
derived_sessions AS (
    SELECT
        {session_id_expr} AS session_id,
        user_id,
        MIN(timestamp) AS start_time,
        {duration_expr} AS duration_sec,
        COUNT(*) AS event_count
    FROM session_ids
    GROUP BY user_id, session_number
)"""


def path_analysis_ctes(
    session_timeout_minutes: int = 30,
    dialect: str = "duckdb",
    device_type_expr: str | None = None,
) -> str:
    """CTE chain (without WITH) that defines ``derived_path_analysis``.

    Builds a look-back view: for each event, records the three preceding
    events in the same user's timeline along with device type.

    Usage:
        db.execute(f"WITH {path_analysis_ctes(30, db.get_dialect())} SELECT ... FROM derived_path_analysis")

    Columns exposed by ``derived_path_analysis``:
        event_id     TEXT
        user_id      TEXT
        session_id   TEXT
        target_event TEXT  — the event that occurred
        step_minus_1 TEXT  — previous event (NULL if first in session)
        step_minus_2 TEXT  — two events ago
        step_minus_3 TEXT  — three events ago
        device_type  TEXT  — extracted from the JSON properties column

    Args:
        session_timeout_minutes: Inactivity gap that starts a new session.
        dialect: Target SQL dialect (duckdb | sqlite | postgres | mysql | …)
    """
    interval_check = interval_minutes_exceeded(
        "prev_timestamp", "timestamp", session_timeout_minutes, dialect
    )
    if device_type_expr is None:
        device_type_expr = json_extract_string("properties", "device_type", dialect)

    # Window expression for building session_number inside a CAST
    session_window = (
        "SUM(is_new_session) OVER "
        "(PARTITION BY user_id ORDER BY timestamp ROWS UNBOUNDED PRECEDING)"
    )
    session_num_cast = cast_to_text(session_window, dialect)
    session_id_expr = string_concat("user_id", "'-'", session_num_cast, dialect=dialect)

    # event_id uses ROW_NUMBER over the full table
    row_num_cast = cast_to_text("ROW_NUMBER() OVER (ORDER BY timestamp)", dialect)
    event_id_expr = string_concat("user_id", "'-'", row_num_cast, dialect=dialect)

    lag_ts = lag_expr("timestamp", 1, dialect)
    lag_en1 = lag_expr("event_name", 1, dialect)
    lag_en2 = lag_expr("event_name", 2, dialect)
    lag_en3 = lag_expr("event_name", 3, dialect)
    lag_frame = (
        " ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING"
        if dialect == "clickhouse"
        else ""
    )

    return f"""
events_with_lag AS (
    SELECT
        user_id,
        event_name,
        timestamp,
        {device_type_expr} AS device_type,
        {lag_ts} OVER (PARTITION BY user_id ORDER BY timestamp{lag_frame}) AS prev_timestamp,
        {lag_en1} OVER (PARTITION BY user_id ORDER BY timestamp{lag_frame}) AS step_minus_1,
        {lag_en2} OVER (PARTITION BY user_id ORDER BY timestamp{lag_frame}) AS step_minus_2,
        {lag_en3} OVER (PARTITION BY user_id ORDER BY timestamp{lag_frame}) AS step_minus_3
    FROM events
),
events_with_session AS (
    SELECT
        user_id,
        event_name,
        timestamp,
        device_type,
        step_minus_1,
        step_minus_2,
        step_minus_3,
        CASE
            WHEN prev_timestamp IS NULL
                OR {interval_check}
            THEN 1
            ELSE 0
        END AS is_new_session
    FROM events_with_lag
),
events_with_session_id AS (
    SELECT
        user_id,
        event_name,
        timestamp,
        device_type,
        step_minus_1,
        step_minus_2,
        step_minus_3,
        {session_id_expr} AS session_id
    FROM events_with_session
),
derived_path_analysis AS (
    SELECT
        {event_id_expr} AS event_id,
        user_id,
        session_id,
        event_name AS target_event,
        step_minus_1,
        step_minus_2,
        step_minus_3,
        device_type
    FROM events_with_session_id
    WHERE step_minus_1 IS NOT NULL
)"""
