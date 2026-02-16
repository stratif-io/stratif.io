# Path Analysis Query Generator - Requirements Specification

**Version:** 2.0  
**Date:** February 16, 2026  
**Status:** Enhanced with Funnel Analysis

## Table of Contents
1. [Overview](#overview)
2. [Objectives](#objectives)
3. [Core Requirements](#core-requirements)
4. [Function Specification](#function-specification)
5. [Data Schema](#data-schema)
6. [Technical Requirements](#technical-requirements)
7. [Algorithm Design](#algorithm-design)
8. [Funnel Analysis](#funnel-analysis)
9. [Performance Considerations](#performance-considerations)
10. [Example Usage](#example-usage)
11. [Edge Cases](#edge-cases)
12. [Open Questions](#open-questions)
13. [Implementation Checklist](#implementation-checklist)

---

## Overview

This specification defines a Python function that uses SQLGlot to generate SQL queries for analyzing event sequences and identifying the most popular user paths through those events. The system supports flexible filtering, time-window constraints, subsequence analysis, and **comprehensive funnel analysis** with drop-off metrics.

### Use Cases
- Understanding user journey through an application
- Identifying drop-off points in conversion funnels
- Analyzing navigation patterns on websites
- Optimizing user experience based on common paths
- A/B testing path variations
- **Conversion rate optimization with step-by-step analysis**
- **Identifying bottlenecks in user flows**
- **Measuring time-to-conversion across funnel stages**

---

## Objectives

1. Generate SQL queries dynamically based on analysis parameters
2. Support flexible path filtering (start/end events, properties, time windows)
3. Identify both complete paths and valid subsequences
4. **Provide detailed funnel analysis with drop-off rates at each step**
5. **Calculate conversion metrics across funnel stages**
6. Provide actionable metrics on path popularity and performance
7. Maintain query performance on large datasets
8. Support multiple SQL dialects through SQLGlot

---

## Core Requirements

### 1. Path Definition

A **path** is defined as:
- A chronologically ordered sequence of events performed by the same user/session
- Minimum length of 2 events (configurable)
- All events must satisfy the specified filters
- Time between consecutive events must not exceed `max_time_between_events` (if specified)

**Subsequence Rule:**
- If path A→B→C exists and meets all conditions, then:
  - A→B is a valid path
  - B→C is a valid path
  - A→C is a valid path (if time between A and C ≤ `max_time_between_events`)
- All subsequences must independently satisfy time and filter constraints

### 2. Event Filtering

Support three levels of filtering:
1. **Path-level filters:** `start_event`, `end_event`
2. **Event-level filters:** Filter specific event types by their properties
3. **Time-based filters:** Maximum time window between consecutive events

### 3. Funnel Definition

A **funnel** is a predefined ordered sequence of events that represents a desired user journey:
- Each step in the funnel must be completed in order
- Users can have intermediate events between funnel steps
- Each step has entry/exit counts and conversion metrics
- Drop-off is measured between consecutive steps
- Time-to-conversion is tracked for each transition

---

## Function Specification

### Function Signature

```python
def generate_path_analysis_query(
    table_name: str,
    analysis_type: str = "path",  # NEW: "path" or "funnel"
    funnel_steps: Optional[List[str]] = None,  # NEW: Ordered list of events for funnel
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
    sql_dialect: str = "postgres",
    return_type: str = "string",
    funnel_window: Optional[int] = None,  # NEW: Max time to complete entire funnel
    allow_intermediate_events: bool = True,  # NEW: Allow events between funnel steps
    funnel_metrics: List[str] = ["conversion_rate", "drop_off", "time_to_convert"]  # NEW
) -> Union[str, SQLGlot.Expression]:
    """
    Generate SQL query to analyze event paths or funnels.
    
    Args:
        table_name: Name of the events table
        analysis_type: Type of analysis - "path" for path discovery, "funnel" for funnel analysis
        funnel_steps: Ordered list of event names defining the funnel (required for funnel analysis)
            Example: ["page_view", "add_to_cart", "checkout", "purchase"]
        start_event: Optional event name that paths must start with
        end_event: Optional event name that paths must end with
        event_filters: Dict mapping event names to property filters
            Example: {"page_view": {"category": "electronics", "device": "mobile"}}
        max_time_between_events: Maximum seconds/minutes/hours between consecutive events
        time_unit: Unit for max_time_between_events ("seconds", "minutes", "hours", "days")
        min_path_length: Minimum number of events in a path (default: 2)
        max_path_length: Maximum number of events in a path (default: unlimited)
        top_n: Number of top paths to return (default: 10, N/A for funnel analysis)
        group_by: Column to group paths by ("user_id" or "session_id")
        date_range: Optional tuple of (start_date, end_date) in ISO format
        sql_dialect: Target SQL dialect (default: "postgres")
        return_type: "string" or "ast" (SQLGlot AST object)
        funnel_window: Maximum time (in time_unit) to complete entire funnel journey
        allow_intermediate_events: If False, only exact sequential steps are counted
        funnel_metrics: List of metrics to calculate for funnel analysis
            Options: ["conversion_rate", "drop_off", "time_to_convert", "abandonment_rate"]
    
    Returns:
        SQL query as string or SQLGlot AST object
    
    Raises:
        ValueError: If parameters are invalid
        SQLGlotError: If query generation fails
    """
    pass
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `table_name` | str | Yes | - | Name of the events table |
| `analysis_type` | str | No | "path" | "path" or "funnel" analysis |
| `funnel_steps` | list | Conditional | None | Ordered events for funnel (required if analysis_type="funnel") |
| `start_event` | str | No | None | Filter paths starting with this event |
| `end_event` | str | No | None | Filter paths ending with this event |
| `event_filters` | dict | No | None | Property-based filters for events |
| `max_time_between_events` | int | No | None | Max time between consecutive events |
| `time_unit` | str | No | "seconds" | Unit for time window |
| `min_path_length` | int | No | 2 | Minimum events in path |
| `max_path_length` | int | No | None | Maximum events in path |
| `top_n` | int | No | 10 | Number of top paths to return |
| `group_by` | str | No | "user_id" | Grouping column (user_id/session_id) |
| `date_range` | tuple | No | None | Date range filter |
| `sql_dialect` | str | No | "postgres" | Target SQL dialect |
| `return_type` | str | No | "string" | Return format (string/ast) |
| `funnel_window` | int | No | None | Max time to complete entire funnel |
| `allow_intermediate_events` | bool | No | True | Allow events between funnel steps |
| `funnel_metrics` | list | No | ["conversion_rate", "drop_off", "time_to_convert"] | Metrics to calculate |

### Output Schema - Path Analysis

The generated query for **path analysis** returns:

| Column | Type | Description |
|--------|------|-------------|
| `path` | TEXT/ARRAY | Event sequence (e.g., "login → browse → checkout") |
| `path_length` | INT | Number of events in the path |
| `occurrence_count` | INT | Number of times this path occurred |
| `unique_users` | INT | Number of unique users following this path |
| `percentage_of_total` | FLOAT | Percentage of all paths |
| `avg_time_to_complete` | FLOAT | Average time from first to last event (in time_unit) |
| `median_time_to_complete` | FLOAT | Median completion time |
| `conversion_rate` | FLOAT | (Optional) If end_event specified, % reaching end |

### Output Schema - Funnel Analysis

The generated query for **funnel analysis** returns:

| Column | Type | Description |
|--------|------|-------------|
| `step_number` | INT | Position in the funnel (1-based) |
| `step_name` | TEXT | Event name for this step |
| `entered_step` | INT | Number of users who reached this step |
| `completed_step` | INT | Number of users who completed this step and moved forward |
| `dropped_off` | INT | Number of users who dropped off at this step |
| `overall_conversion_rate` | FLOAT | % of original users who reached this step |
| `step_conversion_rate` | FLOAT | % who moved from this step to next step |
| `drop_off_rate` | FLOAT | % who dropped off at this step |
| `cumulative_drop_off` | FLOAT | Total % lost from start to this step |
| `avg_time_to_step` | FLOAT | Average time from funnel start to this step |
| `median_time_to_step` | FLOAT | Median time from funnel start to this step |
| `avg_time_from_previous` | FLOAT | Average time from previous step to this step |
| `median_time_from_previous` | FLOAT | Median time from previous step to this step |

---

## Data Schema

### Expected Input Table Structure

```sql
CREATE TABLE events (
    event_id BIGINT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    event_name VARCHAR(255) NOT NULL,
    event_timestamp TIMESTAMP NOT NULL,
    event_properties JSONB,  -- or JSON, depending on dialect
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommended indexes
CREATE INDEX idx_events_user_timestamp ON events(user_id, event_timestamp);
CREATE INDEX idx_events_session_timestamp ON events(session_id, event_timestamp);
CREATE INDEX idx_events_name ON events(event_name);
CREATE INDEX idx_events_timestamp ON events(event_timestamp);
```

### Event Properties Format

Event properties should be stored as JSON:

```json
{
  "page_url": "/products/laptop",
  "category": "electronics",
  "product_id": "12345",
  "device": "mobile",
  "referrer": "google.com"
}
```

---

## Technical Requirements

### 1. SQLGlot Integration

- Use SQLGlot to build queries programmatically
- Support multiple SQL dialects:
  - PostgreSQL (primary)
  - BigQuery
  - Snowflake
  - MySQL
  - DuckDB
- Generate dialect-specific syntax (JSON operators, window functions, etc.)

### 2. Query Optimization

- Use Common Table Expressions (CTEs) for clarity
- Leverage window functions for ranking and sequencing
- Apply filters as early as possible in the query plan
- Use appropriate indexes (documented in schema)
- Consider query complexity vs. dataset size

### 3. JSON Property Filtering

Support dialect-specific JSON querying:

```python
# PostgreSQL
WHERE event_properties->>'category' = 'electronics'

# BigQuery
WHERE JSON_EXTRACT_SCALAR(event_properties, '$.category') = 'electronics'

# Snowflake
WHERE event_properties:category::string = 'electronics'
```

### 4. Subsequence Generation Strategy

**Approach Options:**

**Option A: Recursive CTE** (for shorter paths, cleaner)
```sql
WITH RECURSIVE path_builder AS (
  -- Base case: individual events
  SELECT ...
  UNION ALL
  -- Recursive case: extend paths
  SELECT ...
)
```

**Option B: Self-Joins** (for fixed-length paths)
```sql
SELECT e1.event_name, e2.event_name, e3.event_name
FROM events e1
JOIN events e2 ON e1.user_id = e2.user_id 
  AND e2.event_timestamp > e1.event_timestamp
  AND e2.event_timestamp <= e1.event_timestamp + INTERVAL '1 hour'
```

**Option C: Window Functions** (for flexible analysis)
```sql
SELECT 
  user_id,
  ARRAY_AGG(event_name ORDER BY event_timestamp) as path,
  ARRAY_AGG(event_timestamp ORDER BY event_timestamp) as timestamps
FROM events
GROUP BY user_id
```

**Recommendation:** Start with Option C (window functions) for flexibility, with post-processing for subsequence extraction.

### 5. Error Handling

```python
# Validate parameters
if min_path_length < 2:
    raise ValueError("min_path_length must be at least 2")

if max_path_length and max_path_length < min_path_length:
    raise ValueError("max_path_length must be >= min_path_length")

if time_unit not in ["seconds", "minutes", "hours", "days"]:
    raise ValueError(f"Invalid time_unit: {time_unit}")

if analysis_type == "funnel" and not funnel_steps:
    raise ValueError("funnel_steps required when analysis_type='funnel'")

if analysis_type == "funnel" and len(funnel_steps) < 2:
    raise ValueError("funnel_steps must contain at least 2 steps")

# Validate SQL generation
try:
    query = sqlglot.parse_one(query_string, dialect=sql_dialect)
except SQLGlotError as e:
    raise SQLGlotError(f"Failed to generate valid SQL: {e}")
```

---

## Algorithm Design

### High-Level Algorithm - Path Analysis

```
1. Apply date_range filter (if specified)
2. Apply event_filters to filter qualifying events
3. Partition events by group_by (user_id or session_id)
4. Within each partition:
   a. Order events chronologically
   b. Generate all possible paths of length [min_path_length, max_path_length]
   c. For each path:
      - Check if it starts with start_event (if specified)
      - Check if it ends with end_event (if specified)
      - Validate time windows between consecutive events
5. Generate all valid subsequences from each path
6. Aggregate paths:
   - Count occurrences
   - Count unique users
   - Calculate time metrics
7. Rank by occurrence_count
8. Return top_n results
```

### Pseudocode - Path Analysis

```sql
WITH filtered_events AS (
  SELECT *
  FROM events
  WHERE 
    -- Date range filter
    (date_range IS NULL OR event_timestamp BETWEEN start_date AND end_date)
    -- Event property filters
    AND (event_filters IS NULL OR <property_conditions>)
),
user_sequences AS (
  SELECT 
    user_id,
    ARRAY_AGG(event_name ORDER BY event_timestamp) as events,
    ARRAY_AGG(event_timestamp ORDER BY event_timestamp) as timestamps
  FROM filtered_events
  GROUP BY user_id
),
expanded_paths AS (
  -- Generate all subsequences with time validation
  SELECT 
    user_id,
    subsequence as path,
    time_diff
  FROM user_sequences,
  LATERAL generate_subsequences(events, timestamps, min_path_length, max_path_length)
  WHERE 
    (start_event IS NULL OR path[1] = start_event)
    AND (end_event IS NULL OR path[array_length(path, 1)] = end_event)
    AND (max_time_between_events IS NULL OR validate_time_windows(path, timestamps))
)
SELECT 
  array_to_string(path, ' → ') as path,
  array_length(path, 1) as path_length,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage_of_total,
  AVG(time_diff) as avg_time_to_complete,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_diff) as median_time_to_complete
FROM expanded_paths
GROUP BY path
ORDER BY occurrence_count DESC
LIMIT top_n;
```

---

## Funnel Analysis

This section defines comprehensive funnel analysis capabilities with detailed drop-off metrics.

### 8.1 Funnel Concepts

**Key Definitions:**

- **Funnel Step**: A required event in the user journey
- **Entry**: User reaches this step for the first time
- **Completion**: User successfully moves to the next step
- **Drop-off**: User doesn't complete the next step within constraints
- **Conversion Rate**: Percentage of users moving from one step to the next
- **Time-to-Convert**: Duration between consecutive steps

### 8.2 Funnel Types

**1. Strict Sequential Funnel** (`allow_intermediate_events=False`)
- Steps must occur in exact order
- No events allowed between funnel steps
- Most restrictive, lowest conversion rates
- Use case: Critical flows with no flexibility

**2. Flexible Funnel** (`allow_intermediate_events=True`)
- Steps must occur in order, but other events allowed in between
- Most common analysis type
- Higher conversion rates
- Use case: Real-world user journeys

**3. Time-Bound Funnel** (`funnel_window` specified)
- Must complete entire funnel within time limit
- Can combine with strict or flexible mode
- Use case: Limited-time campaigns, session-based flows

### 8.3 Funnel Metrics

#### Core Metrics

**1. Conversion Rate (Overall)**
```
Overall Conversion Rate = (Users at Step N / Users at Step 1) × 100
```

**2. Step Conversion Rate**
```
Step Conversion Rate = (Users at Step N+1 / Users at Step N) × 100
```

**3. Drop-off Rate**
```
Drop-off Rate = ((Users at Step N - Users at Step N+1) / Users at Step N) × 100
```

**4. Cumulative Drop-off**
```
Cumulative Drop-off = ((Users at Step 1 - Users at Step N) / Users at Step 1) × 100
```

#### Time-Based Metrics

**5. Average Time to Step**
```
Avg Time to Step = AVG(timestamp_step_n - timestamp_step_1)
```

**6. Median Time to Step**
```
Median Time to Step = PERCENTILE_CONT(0.5) of (timestamp_step_n - timestamp_step_1)
```

**7. Average Time from Previous**
```
Avg Time from Previous = AVG(timestamp_step_n - timestamp_step_n-1)
```

#### Advanced Metrics

**8. Abandonment Rate** (users who never completed funnel)
```
Abandonment Rate = (Users who started - Users who completed) / Users who started × 100
```

**9. Funnel Efficiency Score**
```
Efficiency = (Final step users / Initial step users) / (Number of steps - 1)
Higher score = better overall funnel performance
```

**10. Step Impact Score**
```
Impact = Drop-off at Step N / Total Drop-offs
Identifies which steps lose the most users
```

### 8.4 Funnel Algorithm

```
HIGH-LEVEL FUNNEL ALGORITHM:

1. IDENTIFY USERS WHO ENTERED FUNNEL
   - Find all users who performed first funnel step
   - Apply event_filters if specified
   - Apply date_range if specified
   
2. FOR EACH USER:
   a. Get their complete event sequence (ordered by timestamp)
   b. Find first occurrence of Step 1
   c. For each subsequent step (2 to N):
      - Find first occurrence AFTER previous step
      - If allow_intermediate_events=True: skip non-funnel events
      - If allow_intermediate_events=False: next event must be funnel step
      - Check time constraint: time_diff <= max_time_between_events
      - Check funnel window: total_time <= funnel_window
      - Record: step reached, timestamp, time_from_previous
   
3. AGGREGATE RESULTS PER STEP:
   - Count users who entered step
   - Count users who completed step (reached next step)
   - Count users who dropped off
   - Calculate time metrics
   - Calculate conversion rates
   
4. CALCULATE ADDITIONAL METRICS:
   - Overall conversion rate
   - Cumulative drop-offs
   - Step impact scores
   
5. FORMAT OUTPUT:
   - One row per funnel step
   - Include all requested metrics
```

### 8.5 Funnel SQL Implementation

```sql
-- FUNNEL ANALYSIS QUERY TEMPLATE

WITH 
-- Step 1: Filter events
filtered_events AS (
  SELECT 
    user_id,
    event_name,
    event_timestamp,
    event_properties
  FROM events
  WHERE 
    -- Date range filter
    (event_timestamp BETWEEN :start_date AND :end_date)
    -- Filter to only funnel step events (or all if intermediate events allowed)
    AND (
      :allow_intermediate_events = TRUE 
      OR event_name IN (:funnel_step_1, :funnel_step_2, ..., :funnel_step_n)
    )
    -- Event property filters
    AND (:event_filters)
),

-- Step 2: Find funnel step sequences for each user
user_funnel_progress AS (
  SELECT
    user_id,
    event_name,
    event_timestamp,
    -- Mark which funnel step this is (NULL if not a funnel step)
    CASE 
      WHEN event_name = :funnel_step_1 THEN 1
      WHEN event_name = :funnel_step_2 THEN 2
      WHEN event_name = :funnel_step_3 THEN 3
      -- ... continue for all steps
      ELSE NULL
    END as funnel_step_number,
    -- Get first occurrence of each step
    ROW_NUMBER() OVER (
      PARTITION BY user_id, 
        CASE 
          WHEN event_name = :funnel_step_1 THEN 1
          WHEN event_name = :funnel_step_2 THEN 2
          -- ... continue
        END
      ORDER BY event_timestamp
    ) as step_occurrence
  FROM filtered_events
  WHERE 
    -- Only funnel events
    event_name IN (:funnel_step_1, :funnel_step_2, ..., :funnel_step_n)
),

-- Step 3: Keep only first occurrence of each step
first_step_occurrences AS (
  SELECT *
  FROM user_funnel_progress
  WHERE step_occurrence = 1
),

-- Step 4: Build user journeys with step validation
user_journeys AS (
  SELECT
    user_id,
    funnel_step_number,
    event_name,
    event_timestamp,
    -- Get timestamp of step 1 for this user
    FIRST_VALUE(event_timestamp) OVER (
      PARTITION BY user_id 
      ORDER BY event_timestamp
    ) as funnel_start_time,
    -- Get timestamp of previous step
    LAG(event_timestamp) OVER (
      PARTITION BY user_id 
      ORDER BY event_timestamp
    ) as prev_step_timestamp,
    -- Validate sequence: current step must be > previous step number
    LAG(funnel_step_number) OVER (
      PARTITION BY user_id 
      ORDER BY event_timestamp
    ) as prev_step_number
  FROM first_step_occurrences
),

-- Step 5: Filter valid progressions
valid_progressions AS (
  SELECT
    user_id,
    funnel_step_number,
    event_name,
    event_timestamp,
    funnel_start_time,
    prev_step_timestamp,
    -- Calculate time from previous step
    EXTRACT(EPOCH FROM (event_timestamp - prev_step_timestamp)) as seconds_from_previous,
    -- Calculate time from funnel start
    EXTRACT(EPOCH FROM (event_timestamp - funnel_start_time)) as seconds_from_start
  FROM user_journeys
  WHERE
    -- First step OR valid progression
    (prev_step_number IS NULL OR funnel_step_number = prev_step_number + 1)
    -- Time constraint between steps
    AND (
      :max_time_between_events IS NULL 
      OR prev_step_timestamp IS NULL
      OR EXTRACT(EPOCH FROM (event_timestamp - prev_step_timestamp)) <= :max_time_between_events
    )
    -- Funnel window constraint
    AND (
      :funnel_window IS NULL
      OR EXTRACT(EPOCH FROM (event_timestamp - funnel_start_time)) <= :funnel_window
    )
),

-- Step 6: Get max step reached per user
user_max_step AS (
  SELECT
    user_id,
    MAX(funnel_step_number) as max_step_reached
  FROM valid_progressions
  GROUP BY user_id
),

-- Step 7: Aggregate metrics per step
step_metrics AS (
  SELECT
    funnel_step_number as step_number,
    event_name as step_name,
    
    -- Entry count: users who reached this step
    COUNT(DISTINCT user_id) as entered_step,
    
    -- Completion count: users who also reached the next step
    COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM valid_progressions vp2 
        WHERE vp2.user_id = vp.user_id 
        AND vp2.funnel_step_number = vp.funnel_step_number + 1
      ) THEN user_id 
    END) as completed_step,
    
    -- Time metrics
    AVG(seconds_from_start) / :time_unit_seconds as avg_time_to_step,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds_from_start) / :time_unit_seconds as median_time_to_step,
    AVG(seconds_from_previous) / :time_unit_seconds as avg_time_from_previous,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds_from_previous) / :time_unit_seconds as median_time_from_previous
    
  FROM valid_progressions vp
  GROUP BY funnel_step_number, event_name
),

-- Step 8: Calculate final metrics
final_metrics AS (
  SELECT
    step_number,
    step_name,
    entered_step,
    completed_step,
    entered_step - completed_step as dropped_off,
    
    -- Overall conversion rate
    ROUND(
      100.0 * entered_step / FIRST_VALUE(entered_step) OVER (ORDER BY step_number),
      2
    ) as overall_conversion_rate,
    
    -- Step conversion rate
    ROUND(
      100.0 * completed_step / NULLIF(entered_step, 0),
      2
    ) as step_conversion_rate,
    
    -- Drop-off rate
    ROUND(
      100.0 * (entered_step - completed_step) / NULLIF(entered_step, 0),
      2
    ) as drop_off_rate,
    
    -- Cumulative drop-off
    ROUND(
      100.0 * (FIRST_VALUE(entered_step) OVER (ORDER BY step_number) - entered_step) / 
      FIRST_VALUE(entered_step) OVER (ORDER BY step_number),
      2
    ) as cumulative_drop_off,
    
    avg_time_to_step,
    median_time_to_step,
    avg_time_from_previous,
    median_time_from_previous
    
  FROM step_metrics
)

SELECT * FROM final_metrics
ORDER BY step_number;
```

### 8.6 Funnel Visualization Data

The query output can be used to generate:

**1. Funnel Chart Data**
```json
{
  "steps": [
    {
      "name": "page_view",
      "users": 10000,
      "conversion_rate": 100.0
    },
    {
      "name": "add_to_cart",
      "users": 3500,
      "conversion_rate": 35.0,
      "drop_from_previous": 6500
    },
    {
      "name": "checkout",
      "users": 1400,
      "conversion_rate": 14.0,
      "drop_from_previous": 2100
    },
    {
      "name": "purchase",
      "users": 980,
      "conversion_rate": 9.8,
      "drop_from_previous": 420
    }
  ]
}
```

**2. Sankey Diagram Data** (flow visualization)
```json
{
  "nodes": [
    {"id": "page_view"},
    {"id": "add_to_cart"},
    {"id": "dropped_1"},
    {"id": "checkout"},
    {"id": "dropped_2"},
    {"id": "purchase"},
    {"id": "dropped_3"}
  ],
  "links": [
    {"source": "page_view", "target": "add_to_cart", "value": 3500},
    {"source": "page_view", "target": "dropped_1", "value": 6500},
    {"source": "add_to_cart", "target": "checkout", "value": 1400},
    {"source": "add_to_cart", "target": "dropped_2", "value": 2100},
    {"source": "checkout", "target": "purchase", "value": 980},
    {"source": "checkout", "target": "dropped_3", "value": 420}
  ]
}
```

### 8.7 Funnel Optimization Insights

The query can be extended to provide actionable insights:

**1. Identify Bottlenecks**
```sql
-- Add to final query:
SELECT 
  step_name,
  drop_off_rate,
  dropped_off,
  RANK() OVER (ORDER BY drop_off_rate DESC) as bottleneck_rank
FROM final_metrics
WHERE drop_off_rate > :threshold  -- e.g., 30%
ORDER BY drop_off_rate DESC;
```

**2. Time-Based Segmentation**
```sql
-- Segment by time taken:
SELECT
  step_name,
  CASE 
    WHEN avg_time_from_previous < 60 THEN 'fast'
    WHEN avg_time_from_previous < 300 THEN 'normal'
    ELSE 'slow'
  END as speed_segment,
  step_conversion_rate
FROM final_metrics;
```

**3. Cohort Comparison**
```sql
-- Compare funnel performance across cohorts:
WITH cohort_funnels AS (
  -- Run funnel analysis grouped by cohort
  SELECT 
    event_properties->>'cohort' as cohort,
    step_number,
    step_name,
    step_conversion_rate
  FROM funnel_analysis
)
SELECT * FROM cohort_funnels
PIVOT (
  AVG(step_conversion_rate)
  FOR cohort IN ('A', 'B', 'C')
);
```

### 8.8 Advanced Funnel Features

**1. Multi-Path Funnel Analysis**

Allow users to take alternative paths:
```python
funnel_config = {
  "steps": [
    {
      "name": "start",
      "events": ["page_view"]
    },
    {
      "name": "engage",
      "events": ["add_to_cart", "add_to_wishlist"],  # Either one counts
      "match_type": "any"
    },
    {
      "name": "convert",
      "events": ["purchase"]
    }
  ]
}
```

**2. Conditional Funnel Steps**

Steps that are required only under certain conditions:
```python
funnel_steps = [
  "page_view",
  {
    "event": "login",
    "condition": "event_properties->>'user_type' = 'guest'"
  },
  "add_to_cart",
  "purchase"
]
```

**3. Funnel Segmentation**

Analyze funnel by user segments:
```python
segment_by = {
  "device_type": "event_properties->>'device'",
  "user_tier": "event_properties->>'subscription_tier'"
}
```

Output includes separate funnel metrics for each segment.

### 8.9 Funnel Query Optimization

**Performance Tips:**

1. **Pre-filter aggressively**: Apply event_filters early
2. **Limit date range**: Analyze recent data (last 30/60/90 days)
3. **Use materialized views**: For repeated funnel analyses
4. **Partition by date**: If table is partitioned
5. **Index strategy**: Compound index on (user_id, event_timestamp, event_name)

**Example Optimized Index:**
```sql
CREATE INDEX idx_funnel_analysis 
ON events(user_id, event_timestamp, event_name)
WHERE event_name IN ('page_view', 'add_to_cart', 'checkout', 'purchase');
```

### 8.10 Funnel Error Scenarios

**Handle edge cases:**

1. **No users complete Step 1**: Return empty result with schema
2. **100% drop-off at a step**: Show 0 users for subsequent steps
3. **Duplicate events**: Use DISTINCT or ROW_NUMBER() to deduplicate
4. **Out-of-order timestamps**: Sort by timestamp, use event_id as tiebreaker
5. **Missing intermediate steps**: If strict mode, mark as invalid progression

---

## Performance Considerations

### 1. Dataset Size Limits

- For tables > 10M rows, require date_range parameter
- Consider implementing sampling for exploratory analysis
- Add query timeout parameter
- **For funnel analysis with > 100M rows, recommend date partitioning**

### 2. Subsequence Explosion

Path A→B→C→D→E generates:
- Length 2: 10 subsequences
- Length 3: 10 subsequences
- Length 4: 5 subsequences
- Length 5: 1 subsequence
- **Total: 26 subsequences**

**Mitigation:**
- Limit `max_path_length` (default: 5)
- Limit analysis to recent data (default: last 30 days)
- Use approximate algorithms for very large datasets

### 3. Funnel Performance Considerations

**Funnel Complexity:**
- N-step funnel requires N-1 joins/lookups per user
- 10-step funnel with 1M users = ~10M row operations
- Use indexed lookups and window functions

**Optimization Strategies:**
1. **Incremental computation**: Store intermediate results
2. **Sampling**: Analyze 10% of users for exploratory analysis
3. **Caching**: Cache funnel results for common configurations
4. **Parallel processing**: Process user cohorts in parallel

### 4. Indexing Strategy

Required indexes:
```sql
-- Primary index for path analysis
CREATE INDEX idx_events_user_timestamp ON events(user_id, event_timestamp);

-- For session-based analysis
CREATE INDEX idx_events_session_timestamp ON events(session_id, event_timestamp);

-- For event filtering
CREATE INDEX idx_events_name ON events(event_name);

-- For property filtering (PostgreSQL)
CREATE INDEX idx_events_properties_gin ON events USING GIN (event_properties);

-- Composite index for funnel analysis (CRITICAL)
CREATE INDEX idx_funnel_user_time_event ON events(user_id, event_timestamp, event_name)
WHERE event_name IN ('step1', 'step2', 'step3', 'step4');  -- Your funnel steps
```

### 5. Query Optimization Tips

- Push down filters before window functions
- Materialize CTEs if reused multiple times
- Use `EXPLAIN ANALYZE` to validate query plans
- Consider pre-aggregation tables for common analyses
- **For funnels: Filter to funnel events early**

---

## Example Usage

### Example 1: Basic Path Analysis

```python
from path_analysis import generate_path_analysis_query

query = generate_path_analysis_query(
    table_name="events",
    analysis_type="path",
    min_path_length=2,
    max_path_length=4,
    top_n=20
)

# Generated SQL will find the 20 most common paths of length 2-4
```

### Example 2: Basic Funnel Analysis

```python
query = generate_path_analysis_query(
    table_name="events",
    analysis_type="funnel",
    funnel_steps=["page_view", "add_to_cart", "checkout", "purchase"],
    date_range=("2026-01-01", "2026-01-31")
)

# Output: Conversion rates and drop-offs at each step
# Step 1: page_view - 100,000 users (100%)
# Step 2: add_to_cart - 35,000 users (35%) - 65% drop-off
# Step 3: checkout - 14,000 users (14%) - 60% drop-off from cart
# Step 4: purchase - 9,800 users (9.8%) - 30% drop-off from checkout
```

### Example 3: Time-Bound Funnel

```python
query = generate_path_analysis_query(
    table_name="events",
    analysis_type="funnel",
    funnel_steps=["product_view", "add_to_cart", "purchase"],
    max_time_between_events=1800,  # 30 minutes between steps
    funnel_window=3600,  # Must complete within 1 hour total
    time_unit="seconds",
    allow_intermediate_events=True
)

# Find users who complete purchase funnel within 1 hour,
# with max 30 minutes between each step
```

### Example 4: Filtered Funnel Analysis

```python
query = generate_path_analysis_query(
    table_name="events",
    analysis_type="funnel",
    funnel_steps=["page_view", "add_to_cart", "checkout", "purchase"],
    event_filters={
        "page_view": {
            "category": "electronics",
            "device": "mobile"
        },
        "purchase": {
            "total_price_gt": 100
        }
    },
    date_range=("2026-02-01", "2026-02-14"),
    funnel_metrics=["conversion_rate", "drop_off", "time_to_convert", "abandonment_rate"]
)

# Mobile electronics funnel for purchases > $100
```

### Example 5: Strict Sequential Funnel

```python
query = generate_path_analysis_query(
    table_name="events",
    analysis_type="funnel",
    funnel_steps=["start_trial", "activate_feature", "upgrade_plan"],
    allow_intermediate_events=False,  # Strict: no events between steps
    max_time_between_events=86400,  # 24 hours
    time_unit="seconds"
)

# Only count users who go directly from one step to the next
```

### Example 6: Conversion Funnel with Path Analysis

```python
# First, identify the funnel
funnel_query = generate_path_analysis_query(
    table_name="events",
    analysis_type="funnel",
    funnel_steps=["landing_page", "signup", "first_action", "paid_conversion"]
)

# Then, explore alternative paths that don't complete
path_query = generate_path_analysis_query(
    table_name="events",
    analysis_type="path",
    start_event="landing_page",
    min_path_length=2,
    max_path_length=5,
    top_n=50,
    # Exclude successful funnel completers to see where others go
    event_filters={
        "paid_conversion": {"_exclude": True}
    }
)

# Discover what paths drop-off users take
```

### Example 7: Session-Based Funnel

```python
query = generate_path_analysis_query(
    table_name="events",
    analysis_type="funnel",
    funnel_steps=["session_start", "browse_products", "view_details", "exit"],
    group_by="session_id",  # Analyze by session, not user
    max_time_between_events=900,  # 15 minutes
    time_unit="seconds"
)

# Track within-session behavior
```

### Example 8: Multi-Device Funnel

```python
# Analyze how users move across devices
query = generate_path_analysis_query(
    table_name="events",
    analysis_type="funnel",
    funnel_steps=["discover", "research", "compare", "purchase"],
    group_by="user_id",  # Track across devices per user
    funnel_window=604800,  # 7 days to complete
    time_unit="seconds",
    # Segment results by initial device
    segment_by={"initial_device": "FIRST_VALUE(event_properties->>'device')"}
)
```

---

## Edge Cases

### 1. Single Events
- If `min_path_length=1`, should single events be considered paths?
- **Decision:** No, minimum path length is 2 (default)

### 2. Identical Consecutive Events
- Should "page_view → page_view → checkout" be considered valid?
- **Decision:** Yes, unless explicitly deduplicated by user

### 3. Circular Paths
- Should "login → browse → login → checkout" be valid?
- **Decision:** Yes, events are ordered by timestamp

### 4. NULL Values
- How to handle NULL in event_properties?
- **Decision:** NULL values fail property filters (excluded)

### 5. Concurrent Events
- Multiple events with identical timestamps
- **Decision:** Maintain insertion order (event_id as tiebreaker)

### 6. Incomplete Paths
- User starts but doesn't reach end_event
- **Decision:** Excluded from results if end_event is specified

### 7. Time Window Edge Cases
- Event A at 10:00, Event C at 11:30, max_window=1 hour
- Valid if no intermediate event, or if B occurred at 10:45
- **Decision:** Check time between consecutive events in the actual sequence

### 8. Empty Result Sets
- No paths meet the criteria
- **Decision:** Return empty result set with schema intact

### 9. Funnel-Specific Edge Cases

**9a. User Completes Step Out of Order**
- User does: checkout → add_to_cart → purchase
- **Decision:** Invalid progression, doesn't count

**9b. User Repeats Funnel Step**
- User does: page_view → add_to_cart → add_to_cart → checkout
- **Decision:** Use first occurrence only (ROW_NUMBER = 1)

**9c. Funnel Step Never Occurs**
- Funnel: [A, B, C, D] but event B never recorded for any user
- **Decision:** Return 0 for all users at Step 2 and beyond

**9d. Time Window Violation Mid-Funnel**
- User completes Step 1→2 quickly, but Step 2→3 exceeds time limit
- **Decision:** User counted for Steps 1-2, dropped at Step 3

**9e. 100% Drop-off Rate**
- All users drop off at Step 2
- **Decision:** Show 0 users for Steps 3+, maintain schema

---

## Open Questions

### Questions Requiring Clarification

1. **Scope Definition**
   - Should paths be user-scoped, session-scoped, or configurable?
   - **Answer:** Configurable via `group_by` parameter (default: user_id)

2. **Timestamp Handling**
   - How to handle events with identical timestamps?
   - **Answer:** Use event_id as secondary sort key

3. **Deduplication**
   - Should consecutive identical events be deduplicated?
   - **Answer:** No by default, add optional parameter later if needed

4. **Negative Filters**
   - Support for "NOT event_type" filters?
   - **Answer:** Phase 2 feature

5. **Conversion Metrics**
   - How to calculate conversion_rate when end_event is specified?
   - **Answer:** (users reaching end_event) / (users starting path)

6. **Property Filter Operators**
   - Support beyond equality (>, <, IN, LIKE)?
   - **Answer:** Yes, use suffix notation: `_gt`, `_lt`, `_in`, `_like`
   ```python
   {
     "page_view": {
       "price_gt": 100,
       "category_in": ["electronics", "appliances"],
       "url_like": "%/product/%"
     }
   }
   ```

7. **Performance vs. Accuracy**
   - Implement sampling for large datasets?
   - **Answer:** Add optional `sample_rate` parameter (Phase 2)

8. **Multi-Event Start/End**
   - Support multiple start_events or end_events?
   - **Answer:** Phase 2 feature, use list instead of string

9. **Funnel-Specific Questions**

   **9a. Partial Funnel Completion Credit**
   - Should users who complete 50% of funnel be tracked separately?
   - **Answer:** Yes, each step shows metrics, natural to see partial completion

   **9b. Funnel Re-entry**
   - User completes funnel, then starts again - count as 2 separate funnels?
   - **Answer:** Yes, analyze each funnel journey independently

   **9c. Funnel Branch Points**
   - Support for funnels with alternative paths (A/B testing)?
   - **Answer:** Phase 2, use multi-path funnel feature

   **9d. Return Users**
   - How to handle users who drop off then return days later?
   - **Answer:** Treat as separate funnel journey if outside funnel_window

---

## Implementation Checklist

### Phase 1: Core Functionality
- [ ] Set up SQLGlot environment and dialect configuration
- [ ] Implement basic query structure (CTEs, filtering)
- [ ] Implement user/session grouping
- [ ] Implement event property filtering with JSON operators
- [ ] Implement date range filtering
- [ ] Implement start_event and end_event filtering
- [ ] Implement time window validation between events
- [ ] Implement path length constraints
- [ ] Implement subsequence generation logic
- [ ] Implement aggregation and ranking
- [ ] Add top_n limit
- [ ] Generate output with required columns

### Phase 1.5: Funnel Analysis (NEW)
- [ ] Implement funnel step validation logic
- [ ] Implement allow_intermediate_events logic
- [ ] Implement funnel_window constraint
- [ ] Implement step-by-step user progression tracking
- [ ] Calculate entry/exit counts per step
- [ ] Calculate conversion rates (overall and per-step)
- [ ] Calculate drop-off rates and cumulative drop-off
- [ ] Calculate time-based metrics (avg/median time to step)
- [ ] Generate funnel output schema
- [ ] Handle funnel edge cases (repeat steps, out-of-order, etc.)
- [ ] Optimize funnel queries for performance

### Phase 2: Validation & Testing
- [ ] Parameter validation
- [ ] SQL syntax validation
- [ ] Unit tests for each parameter combination
- [ ] Integration tests with sample data
- [ ] Edge case tests (including funnel edge cases)
- [ ] Performance benchmarking (path and funnel analysis)
- [ ] Cross-dialect testing (PostgreSQL, BigQuery, Snowflake)
- [ ] Funnel-specific test suite

### Phase 3: Documentation
- [ ] Function docstrings
- [ ] Usage examples (path and funnel)
- [ ] API documentation
- [ ] Performance tuning guide
- [ ] Troubleshooting guide
- [ ] Funnel analysis guide with best practices

### Phase 4: Advanced Features (Optional)
- [ ] Negative event filters
- [ ] Multiple start/end events
- [ ] Custom aggregation metrics
- [ ] Sampling for large datasets
- [ ] Query plan optimization hints
- [ ] Visualization output (Mermaid, Sankey diagrams)
- [ ] Caching layer for repeated queries
- [ ] **Multi-path funnel analysis**
- [ ] **Conditional funnel steps**
- [ ] **Funnel segmentation by user attributes**
- [ ] **A/B test funnel comparison**
- [ ] **Funnel optimization recommendations**
- [ ] **Real-time funnel monitoring**

---

## Success Criteria

The implementation is considered successful when:

1. ✅ Generates valid SQL for all supported dialects
2. ✅ Correctly filters events by properties
3. ✅ Properly validates time windows between events
4. ✅ Generates all valid subsequences (path analysis)
5. ✅ **Accurately tracks funnel progressions with drop-offs**
6. ✅ **Calculates all funnel metrics correctly**
7. ✅ **Handles funnel edge cases gracefully**
8. ✅ Returns accurate counts and metrics
9. ✅ Handles edge cases gracefully
10. ✅ Performs acceptably on datasets up to 10M rows
11. ✅ **Funnel analysis performs well on datasets up to 100M rows**
12. ✅ All unit and integration tests pass
13. ✅ Documentation is complete and clear

---

## Maintenance Notes

- Review and update this spec as requirements evolve
- Document any deviations from the spec with justification
- Keep example queries in sync with implementation
- Update performance benchmarks as codebase changes
- **Track funnel analysis patterns and optimize common use cases**
- **Monitor query performance and add optimization tips**

---

**Last Updated:** February 16, 2026 (Enhanced with Funnel Analysis)  
**Next Review:** March 16, 2026