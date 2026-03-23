# Mission Control Per-Metric Endpoint

**Date:** 2026-03-23

## Problem

`GET /api/mission-control` is a batch endpoint that fetches all 8 KPI metrics (current + previous period) in a single request. This blocks progressive rendering — the dashboard waits for the slowest query before showing anything.

The trend endpoint (`/api/mission-control/trend`) already works per-metric. The goal is to apply the same pattern to the KPI summary values.

## Solution

Add a new endpoint `GET /api/mission-control/metric` that returns current and previous period values for a single metric. The frontend fetches all 8 in parallel via `useQueries`, enabling progressive loading and independent caching per metric.

The existing `/api/mission-control` batch endpoint is left untouched (non-breaking).

## API

### New endpoint

```
GET /api/mission-control/metric
  ?metric=<name>
  &start_date=YYYY-MM-DD
  &end_date=YYYY-MM-DD
  [&filters=<json>]
```

Note: `connection_id` is not a route parameter — it is consumed automatically by the `get_analytics_db` dependency (same pattern as all other endpoints).

**Response:**
```json
{ "metric": "total_events", "current": 1234, "previous": 987 }
```

**Supported metrics** (same as `/api/mission-control/trend`):
- `total_events`
- `unique_users`
- `total_sessions`
- `avg_session_duration_sec`
- `avg_events_per_session`
- `new_users`
- `returning_users`
- `dau_mau_ratio`

Returns HTTP 400 if metric is unsupported, dates are invalid, or `start_date > end_date`.

### Existing endpoint (unchanged)

`GET /api/mission-control` — still works, not deprecated yet.

## Backend

**File:** `backend/api/mission_control.py`

Add route `GET /mission-control/metric`. **Do not reuse `_fetch_period_metrics`** — it runs all 8 metric SQL blocks regardless of which metric is requested. Calling it 8 times in parallel would produce `8 × 2 = 16` full-batch executions per dashboard load, compared to the current `2`.

Instead, dispatch on metric and run only the SQL needed for that metric (mirroring how `get_mission_control_trend` dispatches). For each metric:

1. Compute `prev_start, prev_end` using `_compute_previous_period`
2. Run the metric-specific SQL for the current period → `current_value`
3. Run the same SQL for the previous period → `previous_value`
4. Return `{ metric, current: current_value, previous: previous_value }`

**Per-metric SQL:**

| Metric | SQL |
|---|---|
| `total_events` | `SELECT COUNT(*) FROM events WHERE timestamp BETWEEN ? AND ?` |
| `unique_users` | `SELECT COUNT(DISTINCT user_id) FROM events WHERE timestamp BETWEEN ? AND ?` |
| `total_sessions` | Session CTE → `SELECT COUNT(*) FROM derived_sessions WHERE start_time BETWEEN ? AND ?` |
| `avg_session_duration_sec` | Session CTE → `SELECT AVG(duration_sec) FROM derived_sessions WHERE start_time BETWEEN ? AND ?` |
| `avg_events_per_session` | Session CTE → `SELECT AVG(event_count) FROM derived_sessions WHERE start_time BETWEEN ? AND ?` |
| `new_users` | `SELECT COUNT(*) FROM (SELECT user_id FROM events GROUP BY user_id HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?)` |
| `returning_users` | `max(0, unique_users_in_period − new_users_in_period)` — use `max(0, ...)` guard to prevent negatives (two queries, same as trend endpoint) |
| `dau_mau_ratio` | avg daily unique users / 28-day unique users (two queries, same as trend endpoint) |

A helper `_fetch_single_metric(db, metric, start, end, filter_clauses, filter_params) -> number` should encapsulate this dispatch, returning a single scalar. The route calls it twice (current period + previous period).

## Frontend

### New type

```typescript
MissionControlMetricResponse = { metric: string; current: number; previous: number }
```

Add to `apps/web/frontend/types/index.ts` and a matching Zod schema in `apps/web/frontend/lib/schemas/api-schemas.ts`.

### New fetch function

`fetchMissionControlMetric` in `apps/web/frontend/lib/api/queries.ts` — mirrors `fetchMissionControlTrend` (same params minus `end_date` for previous period, which the backend computes).

### Refactored hook

`useMissionControl` (`apps/web/frontend/features/dashboard/hooks/useMissionControl.ts`):

- Replace the single `useQuery` for `fetchMissionControl` with `useQueries` (8 queries, one per metric)
- Query key: `['missionControlMetric', metric, startDate, endDate, activeFilters, activeConnectionId]`
- `staleTime`: `QUERY_STALE_TIME.default` (same as trends hook)
- Reconstruct `MissionControlResponse` shape from the 8 results — each query provides `current.<metric>` and `previous.<metric>`
- `isLoading`: `true` if **any** query is still loading. `MissionControlGrid` takes a single `isLoading: boolean` prop and gates skeleton rendering with it — so this is intentionally all-or-nothing. All 8 queries run in parallel; the skeleton shows until all resolve. The benefit is independent caching per metric (a stale metric re-fetches alone) not per-card progressive rendering.
- `isError`: `true` if any query errored
- `error`: first non-null error across all queries (preserves the existing `Error | null` type)
- `data`: keep as `MissionControlResponse | undefined`. Set to `undefined` until all 8 queries have data; once all resolve, reconstruct the full shape. This avoids partial `data` objects reaching the grid. The `period` and `previous_period` date range fields must be reconstructed client-side from `startDate`/`endDate` inputs using the same previous-period calculation as `useMissionControlTrends` (`subDays` + `differenceInDays`).

### No changes needed

`MissionControlGrid` and all other consumers — the hook's return type stays the same.

## Testing

### Backend (`backend/tests/test_api_mission_control.py`)

- Valid request → returns `{ metric, current, previous }` with numeric values
- Unsupported metric → HTTP 400
- Invalid date format → HTTP 400
- `start_date > end_date` → HTTP 400
- `start_date == end_date` → valid, returns single-day values
- Empty dataset → returns zeros (not null)
- All 8 metrics return correct scalar values (spot-check with seeded data)

### Frontend

- Update `useMissionControl` hook tests to mock `useQueries` instead of `useQuery`
- Verify `data` shape is correctly reconstructed from 8 individual query results
- Verify `isError` and `error` when one or more queries fail
