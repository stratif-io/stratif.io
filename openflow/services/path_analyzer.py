"""Path analysis query generator using SQLGlot."""

from typing import Any, Dict, List, Optional, Tuple, Union

import sqlglot
from sqlglot import exp


class PathAnalyzerError(Exception):
    """Exception raised for path analyzer errors."""

    pass


class PathAnalyzer:
    """Generate SQL queries for path analysis using SQLGlot."""

    VALID_TIME_UNITS = {"seconds", "minutes", "hours", "days"}
    VALID_GROUP_BY = {"user_id", "session_id"}
    VALID_RETURN_TYPES = {"string", "ast"}

    def __init__(self, dialect: str = "duckdb"):
        self.dialect = dialect

    def generate_path_analysis_query(
        self,
        table_name: str,
        start_event: Optional[str] = None,
        end_event: Optional[str] = None,
        event_filters: Optional[Dict[str, Dict[str, Any]]] = None,
        max_time_between_events: Optional[int] = None,
        time_unit: str = "seconds",
        min_path_length: int = 2,
        max_path_length: Optional[int] = None,
        top_n: int = 10,
        group_by: str = "user_id",
        date_range: Optional[Tuple[str, str]] = None,
        sql_dialect: str = "duckdb",
        return_type: str = "string",
        extra_where_conditions: Optional[List[str]] = None,
    ) -> Union[str, exp.Expression]:
        """
        Generate SQL query to analyze event paths and identify popular sequences.

        Args:
            table_name: Name of the events table
            start_event: Optional event name that paths must start with
            end_event: Optional event name that paths must end with
            event_filters: Dict mapping event names to property filters
            max_time_between_events: Maximum time between consecutive events
            time_unit: Unit for max_time_between_events
            min_path_length: Minimum number of events in a path
            max_path_length: Maximum number of events in a path
            top_n: Number of top paths to return
            group_by: Column to group paths by ("user_id" or "session_id")
            date_range: Optional tuple of (start_date, end_date)
            sql_dialect: Target SQL dialect
            return_type: "string" or "ast"
            extra_where_conditions: Additional pre-built SQL WHERE conditions (e.g. from filter config)

        Returns:
            SQL query as string or SQLGlot AST object
        """
        self._validate_params(
            min_path_length, max_path_length, time_unit, group_by, return_type
        )

        effective_max_length: int = max_path_length or min(10, min_path_length + 5)

        query = self._build_query_sql(
            table_name=table_name,
            start_event=start_event,
            end_event=end_event,
            event_filters=event_filters,
            max_time_between_events=max_time_between_events,
            time_unit=time_unit,
            min_path_length=min_path_length,
            max_path_length=effective_max_length,
            top_n=top_n,
            date_range=date_range,
            extra_where_conditions=extra_where_conditions,
        )

        if return_type == "ast":
            parsed = sqlglot.parse_one(query, dialect=sql_dialect)
            return parsed

        return query

    def _validate_params(
        self,
        min_path_length: int,
        max_path_length: Optional[int],
        time_unit: str,
        group_by: str,
        return_type: str,
    ) -> None:
        """Validate input parameters."""
        if min_path_length < 2:
            raise PathAnalyzerError("min_path_length must be at least 2")

        if max_path_length is not None and max_path_length < min_path_length:
            raise PathAnalyzerError("max_path_length must be >= min_path_length")

        if time_unit not in self.VALID_TIME_UNITS:
            raise PathAnalyzerError(
                f"Invalid time_unit: {time_unit}. Must be one of {self.VALID_TIME_UNITS}"
            )

        if group_by not in self.VALID_GROUP_BY:
            raise PathAnalyzerError(
                f"Invalid group_by: {group_by}. Must be one of {self.VALID_GROUP_BY}"
            )

        if return_type not in self.VALID_RETURN_TYPES:
            raise PathAnalyzerError(
                f"Invalid return_type: {return_type}. Must be one of {self.VALID_RETURN_TYPES}"
            )

    def _build_query_sql(
        self,
        table_name: str,
        start_event: Optional[str],
        end_event: Optional[str],
        event_filters: Optional[Dict[str, Dict[str, Any]]],
        max_time_between_events: Optional[int],
        time_unit: str,
        min_path_length: int,
        max_path_length: int,
        top_n: int,
        date_range: Optional[Tuple[str, str]],
        extra_where_conditions: Optional[List[str]] = None,
    ) -> str:
        """Build the complete path analysis query as SQL string."""

        where_conditions = self._build_where_conditions(
            date_range, event_filters, table_name, extra_where_conditions
        )

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        time_validation = self._build_time_validation(
            max_time_between_events, time_unit
        )
        start_end_conditions = self._build_start_end_conditions(start_event, end_event)
        subsequence_cte = self._build_subsequence_cte(min_path_length, max_path_length)

        query = f"""
WITH filtered_events AS (
    SELECT 
        user_id,
        event_name,
        timestamp,
        properties
    FROM {table_name}
    {where_clause}
),
user_sequences AS (
    SELECT 
        user_id,
        LIST(event_name ORDER BY timestamp, event_name) as events,
        LIST(timestamp ORDER BY timestamp, event_name) as timestamps
    FROM filtered_events
    GROUP BY user_id
),
{subsequence_cte},
valid_paths AS (
    SELECT 
        user_id,
        path,
        path_timestamps,
        start_ts,
        end_ts
    FROM all_subsequences
    WHERE ARRAY_LENGTH(path) >= {min_path_length}
    AND ARRAY_LENGTH(path) <= {max_path_length}
    {start_end_conditions}
    {time_validation}
)
SELECT 
    ARRAY_TO_STRING(path, ' -> ') as path,
    ARRAY_LENGTH(path) as path_length,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage_of_total,
    AVG(EPOCH(end_ts - start_ts)) as avg_time_to_complete,
    MEDIAN(EPOCH(end_ts - start_ts)) as median_time_to_complete
FROM valid_paths
GROUP BY path, ARRAY_LENGTH(path)
ORDER BY occurrence_count DESC
LIMIT {top_n}
"""
        return query.strip()

    def _build_subsequence_cte(self, min_length: int, max_length: int) -> str:
        """Build CTE for generating all subsequences."""
        return f"""all_subsequences AS (
    SELECT 
        user_id,
        events[i:j] as path,
        timestamps[i:j] as path_timestamps,
        timestamps[i] as start_ts,
        timestamps[j] as end_ts
    FROM user_sequences,
    LATERAL (SELECT UNNEST(range(1, ARRAY_LENGTH(events) + 1)) as i),
    LATERAL (SELECT UNNEST(range(i + 1, LEAST(ARRAY_LENGTH(events) + 1, i + {max_length}) + 1)) as j)
    WHERE j - i >= {min_length}
    AND j - i <= {max_length}
)"""

    def _build_start_end_conditions(
        self, start_event: Optional[str], end_event: Optional[str]
    ) -> str:
        """Build conditions for paths starting/ending with specific events."""
        conditions = []
        if start_event:
            conditions.append(f"path[1] = '{start_event}'")
        if end_event:
            conditions.append(f"path[ARRAY_LENGTH(path)] = '{end_event}'")

        if conditions:
            return "AND " + " AND ".join(conditions)
        return ""

    def _build_where_conditions(
        self,
        date_range: Optional[Tuple[str, str]],
        event_filters: Optional[Dict[str, Dict[str, Any]]],
        table_name: str,
        extra_where_conditions: Optional[List[str]] = None,
    ) -> List[str]:
        """Build WHERE clause conditions."""
        conditions = []

        if date_range:
            start_date, end_date = date_range
            conditions.append(
                f"timestamp BETWEEN '{start_date} 00:00:00' AND '{end_date} 23:59:59'"
            )

        if extra_where_conditions:
            conditions.extend(extra_where_conditions)

        if event_filters:
            filter_conditions = self._build_event_filter_sql(event_filters)
            if filter_conditions:
                conditions.append(f"({filter_conditions})")

        return conditions

    def _build_event_filter_sql(self, event_filters: Dict[str, Dict[str, Any]]) -> str:
        """Build SQL conditions for event property filters."""
        or_conditions = []

        for event_name, filters in event_filters.items():
            and_conditions = [f"event_name = '{event_name}'"]

            for prop_key, prop_value in filters.items():
                prop_condition = self._build_property_filter_sql(prop_key, prop_value)
                if prop_condition:
                    and_conditions.append(prop_condition)

            or_conditions.append("(" + " AND ".join(and_conditions) + ")")

        return " OR ".join(or_conditions) if or_conditions else ""

    def _build_property_filter_sql(self, prop_key: str, prop_value: Any) -> str:
        """Build SQL condition for a single property filter."""
        if prop_key.endswith("_gt"):
            actual_key = prop_key[:-3]
            return f"properties->>'{actual_key}' > '{prop_value}'"
        elif prop_key.endswith("_lt"):
            actual_key = prop_key[:-3]
            return f"properties->>'{actual_key}' < '{prop_value}'"
        elif prop_key.endswith("_gte"):
            actual_key = prop_key[:-4]
            return f"properties->>'{actual_key}' >= '{prop_value}'"
        elif prop_key.endswith("_lte"):
            actual_key = prop_key[:-4]
            return f"properties->>'{actual_key}' <= '{prop_value}'"
        elif prop_key.endswith("_in"):
            actual_key = prop_key[:-3]
            if isinstance(prop_value, list):
                values = ", ".join(f"'{v}'" for v in prop_value)
                return f"properties->>'{actual_key}' IN ({values})"
        elif prop_key.endswith("_like"):
            actual_key = prop_key[:-5]
            return f"properties->>'{actual_key}' LIKE '{prop_value}'"

        if isinstance(prop_value, list):
            values = ", ".join(f"'{v}'" for v in prop_value)
            return f"properties->>'{prop_key}' IN ({values})"
        elif isinstance(prop_value, str):
            return f"properties->>'{prop_key}' = '{prop_value}'"
        elif isinstance(prop_value, (int, float)):
            return f"CAST(properties->>'{prop_key}' AS DOUBLE) = {prop_value}"
        elif isinstance(prop_value, bool):
            return f"properties->>'{prop_key}' = '{str(prop_value).lower()}'"

        return ""

    def _build_time_validation(self, max_time: Optional[int], time_unit: str) -> str:
        """Build time validation condition for consecutive events."""
        if max_time is None:
            return ""

        unit_multiplier = {
            "seconds": 1,
            "minutes": 60,
            "hours": 3600,
            "days": 86400,
        }

        max_seconds = max_time * unit_multiplier.get(time_unit, 1)

        return f"""AND (
    ARRAY_LENGTH(path_timestamps) < 2
    OR list_max(
        list_transform(
            range(0, ARRAY_LENGTH(path_timestamps) - 1),
            i -> EPOCH(path_timestamps[i + 2] - path_timestamps[i + 1])
        )
    ) <= {max_seconds}
)"""


def generate_path_analysis_query(
    table_name: str,
    start_event: Optional[str] = None,
    end_event: Optional[str] = None,
    event_filters: Optional[Dict[str, Dict[str, Any]]] = None,
    max_time_between_events: Optional[int] = None,
    time_unit: str = "seconds",
    min_path_length: int = 2,
    max_path_length: Optional[int] = None,
    top_n: int = 10,
    group_by: str = "user_id",
    date_range: Optional[Tuple[str, str]] = None,
    sql_dialect: str = "duckdb",
    return_type: str = "string",
    extra_where_conditions: Optional[List[str]] = None,
) -> Union[str, exp.Expression]:
    """
    Generate SQL query to analyze event paths and identify popular sequences.

    This is a convenience function that creates a PathAnalyzer instance
    and generates the query.

    Args:
        table_name: Name of the events table
        start_event: Optional event name that paths must start with
        end_event: Optional event name that paths must end with
        event_filters: Dict mapping event names to property filters
        max_time_between_events: Maximum time between consecutive events
        time_unit: Unit for max_time_between_events
        min_path_length: Minimum number of events in a path
        max_path_length: Maximum number of events in a path
        top_n: Number of top paths to return
        group_by: Column to group paths by
        date_range: Optional tuple of (start_date, end_date)
        sql_dialect: Target SQL dialect
        return_type: "string" or "ast"
        extra_where_conditions: Additional pre-built SQL WHERE conditions from filter config

    Returns:
        SQL query as string or SQLGlot AST object
    """
    analyzer = PathAnalyzer(dialect=sql_dialect)
    return analyzer.generate_path_analysis_query(
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
    )
