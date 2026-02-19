WITH signups AS (
    SELECT user_id,
        MIN(STRFTIME('%Y-%m-01', timestamp)) AS cohort_date
    FROM events
    WHERE timestamp >= ?
        AND timestamp <= ?
    GROUP BY user_id
),
user_activity AS (
    SELECT DISTINCT user_id,
        DATE(timestamp) AS activity_date
    FROM events
),
cohort_activity AS (
    SELECT s.user_id,
        s.cohort_date,
        CAST(
            julianday(a.activity_date) - julianday(s.cohort_date) AS INTEGER
        ) AS days_since_signup
    FROM signups s
        LEFT JOIN user_activity a ON s.user_id = a.user_id
    WHERE a.activity_date >= s.cohort_date
        AND CAST(
            julianday(a.activity_date) - julianday(s.cohort_date) AS INTEGER
        ) <= 180
),
cohort_sizes AS (
    SELECT cohort_date,
        COUNT(DISTINCT user_id) AS cohort_size
    FROM signups
    GROUP BY cohort_date
),
retention_counts AS (
    SELECT ca.cohort_date,
        ca.days_since_signup / 30 AS unit_since_signup,
        COUNT(DISTINCT ca.user_id) AS returning_users
    FROM cohort_activity ca
        JOIN cohort_sizes cs ON ca.cohort_date = cs.cohort_date
    GROUP BY ca.cohort_date,
        ca.days_since_signup / 30
)
SELECT cs.cohort_date,
    cs.cohort_size,
    rc.unit_since_signup,
    rc.returning_users
FROM cohort_sizes cs
    LEFT JOIN retention_counts rc ON cs.cohort_date = rc.cohort_date
ORDER BY cs.cohort_date DESC,
    rc.unit_since_signup ASC 