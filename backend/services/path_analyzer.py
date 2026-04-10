"""Path analysis query generator.

Two strategies are provided:

DuckDB (fast path)
    Uses DuckDB-specific array operations: ``LIST``, array slicing with
    ``[i:j]``, ``LATERAL``/``UNNEST(range(...))``, ``EPOCH()``,
    ``list_max``, ``list_transform``, ``ARRAY_TO_STRING``, etc.
    Selected automatically when ``sql_dialect == "duckdb"``.

Standard SQL (portable path)
    Uses only ANSI SQL constructs — window functions (ROW_NUMBER, LAG, SUM
    OVER), self-joins, UNION ALL, and helpers from
    ``stratifio.services.sql_builder`` for dialect-sensitive fragments.
    Works on DuckDB, SQLite, PostgreSQL, MySQL, Snowflake, BigQuery, etc.
    Selected automatically for every non-DuckDB dialect.

Output columns are identical for both strategies (``median_time_to_complete``
is NULL for the standard strategy since SQL MEDIAN is not portable).
"""

from typing import Any

import sqlglot
from sqlglot import exp

from backend.services.sql_builder import (
    cast_to_text,
    epoch_diff_seconds,
    interval_minutes_exceeded,
    json_extract_string,
    lag_expr,
    string_concat,
)


class PathAnalyzerError(Exception):
    """Exception raised for path analyzer errors."""


class PathAnalyzer:
    """Generate SQL queries for path analysis."""

    VALID_TIME_UNITS = {"seconds", "minutes", "hours", "days"}
    VALID_GROUP_BY = {"user_id", "session_id"}
    VALID_RETURN_TYPES = {"string", "ast"}
    VALID_COUNTING_MODES = {"exact", "contains"}

    _TIME_UNIT_SECONDS = {"seconds": 1, "minutes": 60, "hours": 3600, "days": 86400}

    def __init__(self, dialect: str = "duckdb"):
        self.dialect = dialect

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_path_analysis_query(
        self,
        table_name: str,
        start_event: str | None = None,
        end_event: str | None = None,
        event_filters: dict[str, dict[str, Any]] | None = None,
        max_time_between_events: int | None = None,
        time_unit: str = "seconds",
        min_path_length: int = 2,
        max_path_length: int | None = None,
        top_n: int = 10,
        group_by: str = "user_id",
        date_range: tuple[str, str] | None = None,
        sql_dialect: str = "duckdb",
        return_type: str = "string",
        extra_where_conditions: list[str] | None = None,
        session_timeout_minutes: int = 30,
        counting_mode: str = "exact",
    ) -> str | exp.Expression:
        """Generate a SQL query that identifies the most common event paths.

        For DuckDB connections the fast array-based strategy is used.
        All other dialects use the portable self-join strategy.

        Args:
            table_name:               Events table name.
            start_event:              Paths must begin with this event.
            end_event:                Paths must end with this event.
            event_filters:            Dict of ``{event_name: {prop_key: value}}``
                                      property filters applied to the base scan.
            max_time_between_events:  Maximum gap between consecutive path events.
            time_unit:                Unit for *max_time_between_events*.
            min_path_length:          Minimum events in a path (≥ 2).
            max_path_length:          Maximum events in a path.
            top_n:                    Number of top paths to return.
            group_by:                 ``"user_id"`` or ``"session_id"``
                                      (DuckDB strategy only; standard strategy
                                      always uses session-scoped paths).
            date_range:               ``(start_date, end_date)`` tuple.
            sql_dialect:              Target SQL dialect string.
            return_type:              ``"string"`` or ``"ast"``.
            extra_where_conditions:   Pre-built SQL WHERE fragments.
            session_timeout_minutes:  Inactivity gap defining a new session.

        Returns:
            SQL string or SQLGlot AST depending on *return_type*.
        """
        self._validate_params(
            min_path_length,
            max_path_length,
            time_unit,
            group_by,
            return_type,
            counting_mode,
        )
        effective_max = max_path_length or min(10, min_path_length + 5)
        effective_dialect = sql_dialect or self.dialect

        common_kwargs: dict[str, Any] = {
            "table_name": table_name,
            "start_event": start_event,
            "end_event": end_event,
            "event_filters": event_filters,
            "max_time_between_events": max_time_between_events,
            "time_unit": time_unit,
            "min_path_length": min_path_length,
            "max_path_length": effective_max,
            "top_n": top_n,
            "date_range": date_range,
            "extra_where_conditions": extra_where_conditions,
            "session_timeout_minutes": session_timeout_minutes,
        }

        if effective_dialect == "duckdb":
            if counting_mode == "contains":
                query = self._build_duckdb_query_contains(
                    group_by=group_by, **common_kwargs
                )
            else:
                query = self._build_duckdb_query(group_by=group_by, **common_kwargs)
        else:
            query = self._build_standard_query(
                dialect=effective_dialect, **common_kwargs
            )

        if return_type == "ast":
            return sqlglot.parse_one(query, dialect=effective_dialect)
        return query

    # ------------------------------------------------------------------
    # Shared helpers
    # ------------------------------------------------------------------

    def _validate_params(
        self,
        min_path_length: int,
        max_path_length: int | None,
        time_unit: str,
        group_by: str,
        return_type: str,
        counting_mode: str = "exact",
    ) -> None:
        if min_path_length < 2:
            raise PathAnalyzerError("min_path_length must be at least 2")
        if max_path_length is not None and max_path_length < min_path_length:
            raise PathAnalyzerError("max_path_length must be >= min_path_length")
        if time_unit not in self.VALID_TIME_UNITS:
            raise PathAnalyzerError(f"Invalid time_unit: {time_unit}")
        if group_by not in self.VALID_GROUP_BY:
            raise PathAnalyzerError(f"Invalid group_by: {group_by}")
        if return_type not in self.VALID_RETURN_TYPES:
            raise PathAnalyzerError(f"Invalid return_type: {return_type}")
        if counting_mode not in self.VALID_COUNTING_MODES:
            raise PathAnalyzerError(f"Invalid counting_mode: {counting_mode}")

    def _build_where_conditions(
        self,
        date_range: tuple[str, str] | None,
        event_filters: dict[str, dict[str, Any]] | None,
        table_name: str,
        extra_where_conditions: list[str] | None,
        dialect: str = "duckdb",
    ) -> list[str]:
        conditions: list[str] = []
        if date_range:
            start, end = date_range
            start_dt = start.replace("T", " ") if "T" in start else f"{start} 00:00:00"
            end_dt = end.replace("T", " ") if "T" in end else f"{end} 23:59:59"
            conditions.append(f"timestamp BETWEEN '{start_dt}' AND '{end_dt}'")
        if extra_where_conditions:
            conditions.extend(extra_where_conditions)
        if event_filters:
            sql = self._build_event_filter_sql(event_filters, dialect)
            if sql:
                conditions.append(f"({sql})")
        return conditions

    def _build_event_filter_sql(
        self, event_filters: dict[str, dict[str, Any]], dialect: str = "duckdb"
    ) -> str:
        or_conditions = []
        for event_name, filters in event_filters.items():
            safe = event_name.replace("'", "''")
            and_conditions = [f"event_name = '{safe}'"]
            for prop_key, prop_value in filters.items():
                cond = self._build_property_filter_sql(prop_key, prop_value, dialect)
                if cond:
                    and_conditions.append(cond)
            or_conditions.append("(" + " AND ".join(and_conditions) + ")")
        return " OR ".join(or_conditions)

    def _build_property_filter_sql(
        self, prop_key: str, prop_value: Any, dialect: str = "duckdb"
    ) -> str:
        """Build a WHERE condition for a single JSON property filter.

        Operator suffixes supported: ``_gt``, ``_lt``, ``_gte``, ``_lte``,
        ``_in``, ``_like``.  Plain keys default to equality.
        """
        # Determine actual key and operator
        if prop_key.endswith("_gt"):
            key, op = prop_key[:-3], ">"
        elif prop_key.endswith("_lt"):
            key, op = prop_key[:-3], "<"
        elif prop_key.endswith("_gte"):
            key, op = prop_key[:-4], ">="
        elif prop_key.endswith("_lte"):
            key, op = prop_key[:-4], "<="
        elif prop_key.endswith("_like"):
            key = prop_key[:-5]
            col_expr = json_extract_string("properties", key, dialect)
            safe_val = str(prop_value).replace("'", "''")
            return f"{col_expr} LIKE '{safe_val}'"
        elif prop_key.endswith("_in"):
            key = prop_key[:-3]
            col_expr = json_extract_string("properties", key, dialect)
            if isinstance(prop_value, list):
                values = ", ".join(
                    f"'{str(v).replace(chr(39), chr(39) * 2)}'" for v in prop_value
                )
                return f"{col_expr} IN ({values})"
            return ""
        else:
            key, op = prop_key, None

        col_expr = json_extract_string("properties", key, dialect)

        if op:
            # Comparison operator (>, <, >=, <=) — cast to REAL for numbers
            safe_val = str(prop_value).replace("'", "''")
            return f"CAST({col_expr} AS REAL) {op} {prop_value}"

        # Equality
        if isinstance(prop_value, bool):
            safe_val = str(prop_value).lower()
            return f"{col_expr} = '{safe_val}'"
        if isinstance(prop_value, (int, float)):
            return f"CAST({col_expr} AS REAL) = {prop_value}"
        if isinstance(prop_value, list):
            values = ", ".join(
                f"'{str(v).replace(chr(39), chr(39) * 2)}'" for v in prop_value
            )
            return f"{col_expr} IN ({values})"
        if isinstance(prop_value, str):
            safe_val = prop_value.replace("'", "''")
            return f"{col_expr} = '{safe_val}'"
        return ""

    # ------------------------------------------------------------------
    # Strategy 1: DuckDB — fast array-based approach (unchanged)
    # ------------------------------------------------------------------

    def _build_duckdb_query(
        self,
        table_name: str,
        start_event: str | None,
        end_event: str | None,
        event_filters: dict[str, dict[str, Any]] | None,
        max_time_between_events: int | None,
        time_unit: str,
        min_path_length: int,
        max_path_length: int,
        top_n: int,
        group_by: str,
        date_range: tuple[str, str] | None,
        extra_where_conditions: list[str] | None,
        session_timeout_minutes: int,
    ) -> str:
        where_conditions = self._build_where_conditions(
            date_range, event_filters, table_name, extra_where_conditions, "duckdb"
        )
        where_clause = (
            ("WHERE " + " AND ".join(where_conditions)) if where_conditions else ""
        )

        time_validation = self._duckdb_time_validation(
            max_time_between_events, time_unit
        )
        start_end_conditions = self._duckdb_start_end_conditions(start_event, end_event)
        session_cte = self._duckdb_session_cte(session_timeout_minutes)
        sequences_group_by = (
            "session_id, user_id" if group_by == "session_id" else "user_id"
        )
        subsequence_cte = self._duckdb_subsequence_cte(min_path_length, max_path_length)

        return f"""
WITH filtered_events AS (
    SELECT *
    FROM {table_name}
    {where_clause}
),
{session_cte},
user_sequences AS (
    SELECT
        user_id,
        LIST(event_name ORDER BY timestamp, event_name) AS events,
        LIST(timestamp ORDER BY timestamp, event_name) AS timestamps,
        LIST(session_id ORDER BY timestamp, event_name) AS session_ids
    FROM events_sessionized
    GROUP BY {sequences_group_by}
),
{subsequence_cte},
valid_paths AS (
    SELECT user_id, path, path_timestamps, path_session_ids, start_ts, end_ts
    FROM all_subsequences
    WHERE ARRAY_LENGTH(path) >= {min_path_length}
      AND ARRAY_LENGTH(path) <= {max_path_length}
    {start_end_conditions}
    {time_validation}
)
SELECT
    ARRAY_TO_STRING(path, ' -> ')                                           AS path,
    ARRAY_LENGTH(path)                                                       AS path_length,
    COUNT(*)                                                                 AS occurrence_count,
    COUNT(DISTINCT user_id)                                                  AS unique_users,
    ARRAY_LENGTH(LIST_DISTINCT(FLATTEN(LIST(path_session_ids))))             AS unique_sessions,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)                       AS percentage_of_total,
    AVG(EPOCH(end_ts - start_ts))                                            AS avg_time_to_complete,
    MEDIAN(EPOCH(end_ts - start_ts))                                         AS median_time_to_complete
FROM valid_paths
GROUP BY path, ARRAY_LENGTH(path)
ORDER BY unique_users DESC
LIMIT {top_n}
""".strip()

    def _build_duckdb_query_contains(
        self,
        table_name: str,
        start_event: str | None,
        end_event: str | None,
        event_filters: dict[str, dict[str, Any]] | None,
        max_time_between_events: int | None,
        time_unit: str,
        min_path_length: int,
        max_path_length: int,
        top_n: int,
        group_by: str,
        date_range: tuple[str, str] | None,
        extra_where_conditions: list[str] | None,
        session_timeout_minutes: int,
    ) -> str:
        where_conditions = self._build_where_conditions(
            date_range, event_filters, table_name, extra_where_conditions, "duckdb"
        )
        where_clause = (
            ("WHERE " + " AND ".join(where_conditions)) if where_conditions else ""
        )

        start_end_conditions = self._duckdb_start_end_conditions(start_event, end_event)
        session_cte = self._duckdb_session_cte(session_timeout_minutes)
        sequences_group_by = (
            "session_id, user_id" if group_by == "session_id" else "user_id"
        )
        subsequence_cte = self._duckdb_subsequence_cte_notimed(
            min_path_length, max_path_length
        )

        return f"""
WITH filtered_events AS (
    SELECT *
    FROM {table_name}
    {where_clause}
),
{session_cte},
user_sequences AS (
    SELECT
        user_id,
        LIST(event_name ORDER BY timestamp, event_name) AS events,
        LIST(session_id ORDER BY timestamp, event_name) AS session_ids
    FROM events_sessionized
    GROUP BY {sequences_group_by}
),
{subsequence_cte},
valid_paths AS (
    SELECT user_id, path, path_session_ids
    FROM all_subsequences
    WHERE ARRAY_LENGTH(path) >= {min_path_length}
      AND ARRAY_LENGTH(path) <= {max_path_length}
    {start_end_conditions}
),
exact_counts AS (
    SELECT path, COUNT(*) AS exact_count
    FROM valid_paths
    GROUP BY path
    ORDER BY exact_count DESC
    LIMIT {top_n}
),
contains_matches AS (
    SELECT
        ec.path,
        us.user_id
    FROM exact_counts ec
    CROSS JOIN user_sequences us
    WHERE (
        SELECT bool_or(
            us.events[i : i + ARRAY_LENGTH(ec.path) - 1] = ec.path
        )
        FROM generate_series(
            1,
            GREATEST(1, ARRAY_LENGTH(us.events) - ARRAY_LENGTH(ec.path) + 1)
        ) t(i)
    )
)
SELECT
    ARRAY_TO_STRING(path, ' -> ')                          AS path,
    ARRAY_LENGTH(path)                                      AS path_length,
    COUNT(*)                                                AS occurrence_count,
    COUNT(DISTINCT user_id)                                 AS unique_users,
    COUNT(DISTINCT user_id)                                 AS unique_sessions,
    ROUND(100.0 * COUNT(*) / (
        SELECT COUNT(DISTINCT user_id) FROM user_sequences
    ), 2)                                                   AS percentage_of_total,
    NULL::DOUBLE                                            AS avg_time_to_complete,
    NULL::DOUBLE                                            AS median_time_to_complete
FROM contains_matches
GROUP BY path
ORDER BY occurrence_count DESC
LIMIT {top_n}
""".strip()

    def _duckdb_session_cte(self, session_timeout_minutes: int) -> str:
        timeout_seconds = session_timeout_minutes * 60
        return f"""events_with_prev AS (
    SELECT
        user_id, event_name, timestamp,
        LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_timestamp
    FROM filtered_events
),
events_sessionized AS (
    SELECT
        user_id, event_name, timestamp,
        user_id || '_' || CAST(
            SUM(CASE
                WHEN prev_timestamp IS NULL
                    OR EPOCH(timestamp - prev_timestamp) > {timeout_seconds}
                THEN 1 ELSE 0 END
            ) OVER (PARTITION BY user_id ORDER BY timestamp ROWS UNBOUNDED PRECEDING)
        AS VARCHAR) AS session_id
    FROM events_with_prev
)"""

    def _duckdb_subsequence_cte_notimed(self, min_length: int, max_length: int) -> str:
        """Subsequence CTE without timestamp columns (for contains mode)."""
        return f"""all_subsequences AS (
    SELECT
        user_id,
        events[i:j]           AS path,
        session_ids[i:j]      AS path_session_ids
    FROM user_sequences,
    LATERAL (SELECT UNNEST(range(1, ARRAY_LENGTH(events) + 1)) AS i),
    LATERAL (SELECT UNNEST(range(i + 1, LEAST(ARRAY_LENGTH(events) + 1, i + {max_length}) + 1)) AS j)
    WHERE j - i >= {min_length}
      AND j - i <= {max_length}
)"""

    def _duckdb_subsequence_cte(self, min_length: int, max_length: int) -> str:
        return f"""all_subsequences AS (
    SELECT
        user_id,
        events[i:j]           AS path,
        timestamps[i:j]       AS path_timestamps,
        session_ids[i:j]      AS path_session_ids,
        timestamps[i]         AS start_ts,
        timestamps[j]         AS end_ts
    FROM user_sequences,
    LATERAL (SELECT UNNEST(range(1, ARRAY_LENGTH(events) + 1)) AS i),
    LATERAL (SELECT UNNEST(range(i + 1, LEAST(ARRAY_LENGTH(events) + 1, i + {max_length}) + 1)) AS j)
    WHERE j - i >= {min_length}
      AND j - i <= {max_length}
)"""

    def _duckdb_start_end_conditions(
        self, start_event: str | None, end_event: str | None
    ) -> str:
        conditions = []
        if start_event:
            safe = start_event.replace("'", "''")
            conditions.append(f"path[1] = '{safe}'")
        if end_event:
            safe = end_event.replace("'", "''")
            conditions.append(f"path[ARRAY_LENGTH(path)] = '{safe}'")
        return ("AND " + " AND ".join(conditions)) if conditions else ""

    def _duckdb_time_validation(self, max_time: int | None, time_unit: str) -> str:
        if max_time is None:
            return ""
        max_seconds = max_time * self._TIME_UNIT_SECONDS.get(time_unit, 1)
        return f"""AND (
    ARRAY_LENGTH(path_timestamps) < 2
    OR list_max(
        list_transform(
            range(0, ARRAY_LENGTH(path_timestamps) - 1),
            i -> EPOCH(path_timestamps[i + 2] - path_timestamps[i + 1])
        )
    ) <= {max_seconds}
)"""

    # ------------------------------------------------------------------
    # Strategy 2: Standard SQL — portable self-join approach
    # ------------------------------------------------------------------

    def _build_standard_query(
        self,
        table_name: str,
        start_event: str | None,
        end_event: str | None,
        event_filters: dict[str, dict[str, Any]] | None,
        max_time_between_events: int | None,
        time_unit: str,
        min_path_length: int,
        max_path_length: int,
        top_n: int,
        date_range: tuple[str, str] | None,
        extra_where_conditions: list[str] | None,
        session_timeout_minutes: int,
        dialect: str,
    ) -> str:
        """Portable path analysis using self-joins.

        Algorithm:
        1. Filter events (date range, event property filters).
        2. Sessionize: LAG → is_new_session flag → running SUM → session_num.
        3. Assign per-session row numbers (seq) with ROW_NUMBER().
        4. For each path length L in [min..max], self-join L times on
           consecutive seq numbers within the same session, building the
           path string with string_concat().  Filter start/end events and
           time constraints here.
        5. UNION ALL all length-specific CTEs into all_paths.
        6. Aggregate: COUNT, COUNT DISTINCT, window-function percentage,
           AVG duration.  MEDIAN is returned as NULL (no portable equivalent).

        Paths are always scoped to a single session — cross-session paths
        are not produced (unlike the DuckDB strategy when group_by="user_id").
        """
        where_conditions = self._build_where_conditions(
            date_range, event_filters, table_name, extra_where_conditions, dialect
        )
        where_clause = (
            ("WHERE " + " AND ".join(where_conditions)) if where_conditions else ""
        )

        interval_check = interval_minutes_exceeded(
            "prev_ts", "timestamp", session_timeout_minutes, dialect
        )

        # ---------- build one CTE per path length ----------
        path_cte_names: list[str] = []
        path_cte_parts: list[str] = []

        for length in range(min_path_length, max_path_length + 1):
            cte_name = f"paths_L{length}"
            path_cte_names.append(cte_name)

            # Path string: e1.event_name || ' -> ' || e2.event_name || …
            concat_parts: list[str] = []
            for i in range(1, length + 1):
                concat_parts.append(f"e{i}.event_name")
                if i < length:
                    concat_parts.append("' -> '")
            path_expr = string_concat(*concat_parts, dialect=dialect)

            # Duration from first to last event in the path
            duration_expr = epoch_diff_seconds(
                "e1.timestamp", f"e{length}.timestamp", dialect
            )

            # Session ID for counting unique sessions
            session_id_expr = string_concat(
                "e1.user_id",
                "'-'",
                cast_to_text("e1.session_num", dialect),
                dialect=dialect,
            )

            # Self-joins: e2.seq = e1.seq+1, e3.seq = e2.seq+1, …
            joins = "\n".join(
                f"    JOIN session_seq e{i}"
                f" ON e{i - 1}.user_id = e{i}.user_id"
                f" AND e{i - 1}.session_num = e{i}.session_num"
                f" AND e{i}.seq = e{i - 1}.seq + 1"
                for i in range(2, length + 1)
            )

            # Per-CTE WHERE: start/end event, time constraint
            cte_where: list[str] = []
            if start_event:
                safe = start_event.replace("'", "''")
                cte_where.append(f"e1.event_name = '{safe}'")
            if end_event:
                safe = end_event.replace("'", "''")
                cte_where.append(f"e{length}.event_name = '{safe}'")
            if max_time_between_events:
                max_secs = max_time_between_events * self._TIME_UNIT_SECONDS.get(
                    time_unit, 1
                )
                for i in range(1, length):
                    diff = epoch_diff_seconds(
                        f"e{i}.timestamp", f"e{i + 1}.timestamp", dialect
                    )
                    cte_where.append(f"({diff}) <= {max_secs}")

            cte_where_sql = ("WHERE " + " AND ".join(cte_where)) if cte_where else ""

            path_cte_parts.append(
                f"{cte_name} AS (\n"
                f"    SELECT\n"
                f"        e1.user_id,\n"
                f"        {session_id_expr} AS session_id,\n"
                f"        {path_expr} AS path,\n"
                f"        {length} AS path_length,\n"
                f"        {duration_expr} AS duration_sec\n"
                f"    FROM session_seq e1\n"
                f"{joins}\n"
                f"    {cte_where_sql}\n"
                f")"
            )

        path_ctes_sql = ",\n".join(path_cte_parts)
        union_sql = "\n    UNION ALL\n    ".join(
            f"SELECT * FROM {name}" for name in path_cte_names
        )

        lag_ts = lag_expr("timestamp", 1, dialect)
        lag_frame = (
            " ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING"
            if dialect == "clickhouse"
            else ""
        )

        return f"""
WITH filtered_events AS (
    SELECT user_id, event_name, timestamp
    FROM {table_name}
    {where_clause}
),
prev_events AS (
    SELECT
        user_id, event_name, timestamp,
        {lag_ts} OVER (PARTITION BY user_id ORDER BY timestamp{lag_frame}) AS prev_ts
    FROM filtered_events
),
session_markers AS (
    SELECT
        user_id, event_name, timestamp,
        CASE WHEN prev_ts IS NULL OR {interval_check} THEN 1 ELSE 0 END AS is_new_session
    FROM prev_events
),
session_numbered AS (
    SELECT
        user_id, event_name, timestamp,
        SUM(is_new_session) OVER (
            PARTITION BY user_id ORDER BY timestamp ROWS UNBOUNDED PRECEDING
        ) AS session_num
    FROM session_markers
),
session_seq AS (
    SELECT
        user_id, event_name, timestamp, session_num,
        ROW_NUMBER() OVER (PARTITION BY user_id, session_num ORDER BY timestamp) AS seq
    FROM session_numbered
),
{path_ctes_sql},
all_paths AS (
    {union_sql}
)
SELECT
    path,
    path_length,
    COUNT(*)                                                     AS occurrence_count,
    COUNT(DISTINCT user_id)                                      AS unique_users,
    COUNT(DISTINCT session_id)                                   AS unique_sessions,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)           AS percentage_of_total,
    AVG(duration_sec)                                            AS avg_time_to_complete,
    NULL                                                         AS median_time_to_complete
FROM all_paths
GROUP BY path, path_length
ORDER BY occurrence_count DESC
LIMIT {top_n}
""".strip()


# ---------------------------------------------------------------------------
# Module-level convenience function
# ---------------------------------------------------------------------------


def generate_path_analysis_query(
    table_name: str,
    start_event: str | None = None,
    end_event: str | None = None,
    event_filters: dict[str, dict[str, Any]] | None = None,
    max_time_between_events: int | None = None,
    time_unit: str = "seconds",
    min_path_length: int = 2,
    max_path_length: int | None = None,
    top_n: int = 10,
    group_by: str = "user_id",
    date_range: tuple[str, str] | None = None,
    sql_dialect: str = "duckdb",
    return_type: str = "string",
    extra_where_conditions: list[str] | None = None,
    session_timeout_minutes: int = 30,
    counting_mode: str = "exact",
) -> str | exp.Expression:
    """Convenience wrapper around :class:`PathAnalyzer`."""
    return PathAnalyzer(dialect=sql_dialect).generate_path_analysis_query(
        table_name=table_name,
        start_event=start_event,
        end_event=end_event,
        event_filters=event_filters,
        max_time_between_events=max_time_between_events,
        time_unit=time_unit,
        min_path_length=min_path_length,
        max_path_length=max_path_length,
        top_n=top_n,
        group_by=group_by,
        date_range=date_range,
        sql_dialect=sql_dialect,
        return_type=return_type,
        extra_where_conditions=extra_where_conditions,
        session_timeout_minutes=session_timeout_minutes,
        counting_mode=counting_mode,
    )
