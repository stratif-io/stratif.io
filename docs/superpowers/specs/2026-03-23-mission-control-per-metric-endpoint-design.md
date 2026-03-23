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
  [&connection_id=<id>]
```

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

Returns HTTP 400 if metric is unsupported or dates are invalid.

### Existing endpoint (unchanged)

`GET /api/mission-control` — still works, not deprecated yet.

## Backend

**File:** `backend/api/mission_control.py`

- Add route `GET /mission-control/metric`
- Reuse `_compute_previous_period` and `_fetch_period_metrics` already in the file
- Validate `metric` against `SUPPORTED_METRICS`
- Extract single metric value from the dict returned by `_fetch_period_metrics`

No new helpers needed — the existing logic covers everything.

## Frontend

### New type

`MissionControlMetricResponse = { metric: string; current: number; previous: number }`

Add to `apps/web/frontend/types/index.ts` and a matching Zod schema in `apps/web/frontend/lib/schemas/api-schemas.ts`.

### New fetch function

`fetchMissionControlMetric` in `apps/web/frontend/lib/api/queries.ts` — mirrors `fetchMissionControlTrend`.

### Refactored hook

`useMissionControl` (`apps/web/frontend/features/dashboard/hooks/useMissionControl.ts`):

- Replace the single `useQuery` for `fetchMissionControl` with `useQueries` (8 queries, one per metric)
- Reconstruct the existing `MissionControlResponse` shape from the 8 results so `MissionControlGrid` needs no changes
- `isLoading` becomes true if any metric query is loading
- `isError` becomes true if any metric query errored

### No changes needed

- `MissionControlGrid` and all other consumers — the hook's return type stays the same.

## Testing

- Backend: add unit tests for the new endpoint in `backend/tests/test_api_mission_control.py`
- Frontend: update `useMissionControl` hook tests to mock `useQueries` instead of `useQuery`
