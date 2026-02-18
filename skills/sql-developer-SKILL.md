---
name: sql-developer
description: "Use this skill when writing or reviewing SQL queries in the OpenFlow backend. Triggers: adding a new API endpoint that queries the events table, modifying CTEs in db/views.py, adding a new dimension or metric to pivot/trend/retention, debugging dialect compatibility errors (DuckDB vs SQLite), or any task where a SQL expression needs to work across multiple database engines."
license: MIT
---

# OpenFlow SQL Developer Skill

## Core Rule

**Never hardcode DuckDB-specific SQL.** Every SQL fragment that differs between engines must use a helper from `openflow/services/sql_builder.py`.

---

## Architecture Overview

```
API endpoint
    │  calls helpers from sql_builder.py → SQL string for target dialect
    │  calls db.execute(query, params)
    ▼
AnalyticsDatabase.execute()
    │  prepends events remapping CTE if needed
    │  runs query on underlying connection (DuckDB or SQLite)
    ▼
db/views.py (session_ctes, path_analysis_ctes)
    │  calls sql_builder helpers with the dialect parameter
    │  returns ready-to-embed CTE string
```

Queries are **built for the target dialect from the start** — no transpilation step in the hot path.

---

## The sql_builder Module

`openflow/services/sql_builder.py` is the single source of truth for dialect-sensitive SQL fragments.

### Import pattern

```python
from openflow.services.sql_builder import (
    date_trunc,
    date_diff_days,
    epoch_diff_seconds,
    interval_minutes_exceeded,
    string_concat,
    cast_to_text,
    json_extract_string,
    extract_hour,
    extract_day_of_week,
)
```

### Always get the dialect first

```python
dialect = db.get_dialect()   # "duckdb" | "sqlite" | "postgres" | …
```

---

## Helper Reference

### `date_trunc(unit, col_expr, dialect)`

Truncate a timestamp to the start of a time period.

```python
day_col = date_trunc("day",   "timestamp", dialect)
wk_col  = date_trunc("week",  "timestamp", dialect)
mo_col  = date_trunc("month", "timestamp", dialect)

# Use the result both in SELECT and GROUP BY:
query = f"""
    SELECT {day_col} AS date, COUNT(*) AS count
    FROM events
    GROUP BY {day_col}
    ORDER BY date
"""
```

| dialect | renders as |
|---------|-----------|
| duckdb / postgres / snowflake / redshift | `DATE_TRUNC('day', timestamp)` |
| sqlite | `DATE(timestamp)` |
| mysql | `DATE(timestamp)` |
| bigquery | `DATE_TRUNC(timestamp, DAY)` |

---

### `date_diff_days(start_expr, end_expr, dialect)`

Integer number of days between two timestamps (end − start).

```python
days = date_diff_days("s.cohort_date", "a.activity_date", dialect)
# → "DATE_DIFF('day', s.cohort_date, a.activity_date)"  for DuckDB
# → "CAST(julianday(a.activity_date) - julianday(s.cohort_date) AS INTEGER)"  for SQLite
```

---

### `epoch_diff_seconds(start_expr, end_expr, dialect)`

Difference between two timestamps in seconds (for durations).

```python
dur = epoch_diff_seconds("MIN(timestamp)", "MAX(timestamp)", dialect)
# → "EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))"  for DuckDB/Postgres
# → "STRFTIME('%s', MAX(timestamp)) - STRFTIME('%s', MIN(timestamp))"  for SQLite
```

---

### `interval_minutes_exceeded(col_earlier, col_later, minutes, dialect)`

Boolean condition used for session boundary detection.

```python
new_session = interval_minutes_exceeded("prev_timestamp", "timestamp", 30, dialect)
# Used in a CASE WHEN:
# CASE WHEN prev_timestamp IS NULL OR {new_session} THEN 1 ELSE 0 END
```

---

### `string_concat(*parts, dialect)`

String concatenation — `||` for most engines, `CONCAT()` for MySQL.

```python
session_id = string_concat("user_id", "'-'", cast_to_text("session_num", dialect), dialect=dialect)
```

### `cast_to_text(expr, dialect)`

Cast to string. Uses `TEXT` everywhere (safe in SQLite, DuckDB, Postgres); `CHAR` for MySQL.

---

### `json_extract_string(col, key, dialect)`

Extract a string from a JSON column. Supports dot-notation for nested keys.

```python
device = json_extract_string("properties", "device_type", dialect)
country = json_extract_string("properties", "geo.country", dialect)
# DuckDB:   json_extract_string(properties, '$.device_type')   ← returns VARCHAR
# Postgres: properties->>'device_type'
# SQLite:   json_extract(properties, '$.device_type')
# MySQL:    JSON_UNQUOTE(JSON_EXTRACT(properties, '$.device_type'))
```

> **DuckDB note**: Do NOT use `->>` for DuckDB JSON columns. The `->>` operator returns a DuckDB `JSON` type (not `VARCHAR`), which causes `ConversionException` when compared to a bound `?` parameter. Always use `json_extract_string()` for DuckDB.

---

### `extract_hour(col_expr, dialect)` / `extract_day_of_week(col_expr, dialect)`

```python
hr  = extract_hour("timestamp", dialect)        # → 0–23 integer
dow = extract_day_of_week("timestamp", dialect)  # → 0 (Sun) – 6 (Sat)
```

---

## CTE Functions in db/views.py

Always pass `dialect` when calling these:

```python
from openflow.db.views import session_ctes, path_analysis_ctes

dialect = db.get_dialect()
timeout = db.get_session_timeout_minutes()

rows = db.execute(
    f"WITH {session_ctes(timeout, dialect)} SELECT * FROM derived_sessions",
    params,
)
```

`session_ctes` exposes: `session_id`, `user_id`, `start_time`, `duration_sec`, `event_count`
`path_analysis_ctes` exposes: `event_id`, `user_id`, `session_id`, `target_event`, `step_minus_1/2/3`, `device_type`

---

## What Is Always Safe (No Helpers Needed)

These constructs are ANSI SQL and work everywhere without helpers:

```sql
SELECT DISTINCT event_name FROM events ORDER BY event_name
COUNT(*), COUNT(DISTINCT user_id)
WHERE event_name = ? AND timestamp >= ? AND timestamp <= ?
LIMIT ? OFFSET ?
GROUP BY …, ORDER BY …
COALESCE(…), CASE WHEN … THEN … ELSE … END
LEFT JOIN … ON …, EXISTS (SELECT 1 FROM …)
MIN(…), MAX(…), AVG(…), SUM(…)
LAG(col) OVER (PARTITION BY … ORDER BY …)
SUM(…) OVER (PARTITION BY … ORDER BY … ROWS UNBOUNDED PRECEDING)
```

---

## What Is DuckDB-Only (Needs Attention)

These constructs **must not appear** in general-purpose queries:

| DuckDB-only | Use instead |
|-------------|-------------|
| `DATE_TRUNC('day', col)` | `date_trunc("day", col, dialect)` |
| `DATE_DIFF('day', a, b)` | `date_diff_days(a, b, dialect)` |
| `EXTRACT(EPOCH FROM (a - b))` | `epoch_diff_seconds(a, b, dialect)` |
| `col - prev > INTERVAL 'N minutes'` | `interval_minutes_exceeded(prev, col, N, dialect)` |
| `col->>'key'` (JSON) | `json_extract_string(col, key, dialect)` |
| `EXTRACT(DAYOFWEEK FROM col)` | `extract_day_of_week(col, dialect)` |
| `col::INTEGER` (cast operator) | `CAST(col AS INTEGER)` |
| `col::VARCHAR` (cast operator) | `cast_to_text(col, dialect)` |
| `a \|\| b` concat (MySQL) | `string_concat(a, b, dialect=dialect)` |
| `LIST(…)`, `ARRAY_AGG`, `UNNEST`, `LATERAL` | DuckDB-only; guard with `if dialect != "duckdb"` |

---

## Adding a New Endpoint

```python
@router.get("/my-metric")
def get_my_metric(
    start_date: Optional[str] = Query(None),
    db=Depends(get_analytics_db),
) -> dict:
    dialect = db.get_dialect()                          # 1. get dialect
    day_col  = date_trunc("day", "timestamp", dialect)  # 2. build fragments

    where_clauses, params = [], []
    if start_date:
        where_clauses.append("timestamp >= ?")
        params.append(f"{start_date} 00:00:00")
    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    result = db.execute(                                # 3. execute directly
        f"""
        SELECT {day_col} AS date, COUNT(*) AS count
        FROM events {where_sql}
        GROUP BY {day_col}
        ORDER BY date
        """,
        params,
    )
    return {"data": [{"date": str(row[0]), "count": row[1]} for row in result]}
```

**Rules:**
1. Always get `dialect = db.get_dialect()` at the top of the function.
2. Use `sql_builder` helpers for any dialect-sensitive fragment.
3. Use `?` placeholders for all user-supplied values — never f-string them into SQL.
4. Never call `transpile_sql()` on queries you build yourself.

---

## Extending sql_builder for a New Engine

Add a new `elif dialect == "your_engine":` branch in each helper function.  Each helper has docstrings listing the expected rendering per dialect for reference.

```python
def date_trunc(unit: str, col_expr: str, dialect: str = "duckdb") -> str:
    ...
    if dialect == "your_engine":
        return f"YOUR_DATE_TRUNC({col_expr}, '{unit}')"
    ...
```

No changes to the API endpoints or views are needed — the dialect flows through automatically.

---

## path-analysis Endpoint — Two Strategies

`GET /api/path-analysis` works on **all supported engines** via `PathAnalyzer` in `openflow/services/path_analyzer.py`.

| Dialect | Strategy | Notes |
|---------|----------|-------|
| `duckdb` | Fast array-based (`LIST`, `LATERAL`, array slicing) | `median_time_to_complete` populated |
| all others | Portable self-join (one CTE per path length, `UNION ALL`) | `median_time_to_complete` = `NULL`; paths are always session-scoped |

The strategy is selected automatically by `generate_path_analysis_query(sql_dialect=db.get_dialect(), ...)`.

`GET /api/paths` (the simpler look-back path endpoint) uses `path_analysis_ctes()` and also **works on all supported engines**.
