"""Database view definitions for analytics."""

from openflow.db.connection import Database


# Sessionization view - creates sessions from events
SESSION_VIEW_SQL = """
CREATE OR REPLACE VIEW derived_sessions AS
WITH events_with_lag AS (
    SELECT 
        user_id,
        event_name,
        timestamp,
        LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) as prev_timestamp
    FROM events
),
session_markers AS (
    SELECT 
        user_id,
        event_name,
        timestamp,
        CASE 
            WHEN prev_timestamp IS NULL 
                OR timestamp - prev_timestamp > INTERVAL '30 minutes' 
            THEN 1 
            ELSE 0 
        END as is_new_session
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
        ) as session_number
    FROM session_markers
)
SELECT 
    user_id || '_' || CAST(session_number AS VARCHAR) as session_id,
    user_id,
    MIN(timestamp) as start_time,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as duration_sec,
    COUNT(*) as event_count
FROM session_ids
GROUP BY user_id, session_number
"""

# Path analysis view - tracks user event sequences
PATH_ANALYSIS_VIEW_SQL = """
CREATE OR REPLACE VIEW derived_path_analysis AS
WITH events_with_lag AS (
    SELECT 
        user_id,
        event_name,
        timestamp,
        properties->>'device_type' as device_type,
        LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) as prev_timestamp,
        LAG(event_name, 1) OVER (PARTITION BY user_id ORDER BY timestamp) as step_minus_1,
        LAG(event_name, 2) OVER (PARTITION BY user_id ORDER BY timestamp) as step_minus_2,
        LAG(event_name, 3) OVER (PARTITION BY user_id ORDER BY timestamp) as step_minus_3
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
                OR timestamp - prev_timestamp > INTERVAL '30 minutes' 
            THEN 1 
            ELSE 0 
        END as is_new_session
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
        user_id || '_' || CAST(
            SUM(is_new_session) OVER (
                PARTITION BY user_id 
                ORDER BY timestamp 
                ROWS UNBOUNDED PRECEDING
            ) AS VARCHAR
        ) as session_id
    FROM events_with_session
)
SELECT 
    user_id || '_' || CAST(row_number() OVER (ORDER BY timestamp) AS VARCHAR) as event_id,
    user_id,
    session_id,
    event_name as target_event,
    step_minus_1,
    step_minus_2,
    step_minus_3,
    device_type
FROM events_with_session_id
WHERE step_minus_1 IS NOT NULL
"""


def create_views(db: Database) -> None:
    """Create all analytics views in the database."""
    db.execute_write(SESSION_VIEW_SQL)
    db.execute_write(PATH_ANALYSIS_VIEW_SQL)


def refresh_views(db: Database) -> None:
    """Refresh all analytics views."""
    create_views(db)
