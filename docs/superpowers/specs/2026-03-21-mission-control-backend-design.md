# Mission Control — Backend Spec

**Date:** 2026-03-21

## Goal

Replace the Dashboard page with "Mission Control" — a richer KPI overview backed by a dedicated backend endpoint that returns all metrics for the current period, the previous period (for ↑↓ comparison), and supports on-demand time-series drill-down per metric.

This spec covers the **backend only**. Frontend redesign (card layout, charts, rename) is a separate spec.

---

## New Endpoints

### `GET /api/mission-control`

Returns aggregated metrics for the selected period and the automatically-computed previous period (same duration, immediately preceding `start_date`).

**Query params:** `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD), `filters` (JSON dict, same format as existing endpoints), `connection_id`

**Response:**

```json
{
  "period": { "start_date": "2024-02-20", "end_date": "2024-03-21" },
  "previous_period": { "start_date": "2024-01-21", "end_date": "2024-02-19" },
  "current": {
    "total_events": 1240000,
    "unique_users": 48200,
    "total_sessions": 89700,
    "avg_session_duration_sec": 142.5,
    "avg_events_per_session": 13.8,
    "new_users": 12400,
    "returning_users": 35800,
    "dau_mau_ratio": 0.34
  },
  "previous": {
    "total_events": 1100000,
    "unique_users": 44500,
    "total_sessions": 91000,
    "avg_session_duration_sec": 138.2,
    "avg_events_per_session": 12.1,
    "new_users": 11200,
    "returning_users": 33300,
    "dau_mau_ratio": 0.31
  }
}
```

**Previous period computation:** duration = `end_date − start_date + 1` days. Previous period ends on `start_date − 1` and starts `duration` days before that.

**SQL queries (run for both current and previous periods):**

1. **Events aggregate** (from events table):
   - `total_events` = `COUNT(*)`
   - `unique_users` = `COUNT(DISTINCT user_id)`

2. **Sessions summary** (from derived_sessions CTE, reuse `session_ctes` from `backend/services/views.py`):
   - `total_sessions` = `COUNT(*)`
   - `avg_session_duration_sec` = `AVG(duration_sec)`
   - `avg_events_per_session` = `AVG(event_count)`

3. **New vs returning users** (from events table):
   - A user is **new** if their `MIN(timestamp)` across all history falls within the period
   - `new_users` = count of users where `MIN(timestamp) >= period_start AND MIN(timestamp) <= period_end`
   - `returning_users` = `unique_users − new_users`

4. **DAU/MAU ratio** (from events table):
   - DAU = average daily unique users within the period: `AVG(daily_unique_users)` grouped by day
   - MAU = unique users over the 28 days ending on `end_date`
   - `dau_mau_ratio` = DAU ÷ MAU (return 0.0 if MAU is 0)

---

### `GET /api/mission-control/trend`

Returns a daily time-series for a single metric over the selected period. Called on-demand when the user clicks a KPI card.

**Query params:** `metric` (string, see supported values), `start_date`, `end_date`, `filters`, `connection_id`

**Supported metric values:**

| metric | Source | SQL |
|---|---|---|
| `total_events` | events | `COUNT(*)` grouped by day |
| `unique_users` | events | `COUNT(DISTINCT user_id)` grouped by day |
| `total_sessions` | derived_sessions | `COUNT(*)` grouped by day |
| `avg_session_duration_sec` | derived_sessions | `AVG(duration_sec)` grouped by day |
| `avg_events_per_session` | derived_sessions | `AVG(event_count)` grouped by day |
| `new_users` | events | users whose `MIN(timestamp)` = that day, counted per day |
| `returning_users` | events | daily unique users minus new users per day |
| `dau_mau_ratio` | events | daily unique users ÷ 28-day rolling unique users ending on that day |

**Response:**

```json
{
  "metric": "unique_users",
  "data": [
    { "date": "2024-02-20", "value": 1420 },
    { "date": "2024-02-21", "value": 1380 }
  ]
}
```

Returns 400 if `metric` is not in the supported list.

---

## File Changes

| File | Change |
|---|---|
| `backend/api/mission_control.py` | New — both endpoints and all SQL logic |
| `backend/main.py` | Register `mission_control.router` |
| `apps/web/frontend/lib/api/queries.ts` | Add `fetchMissionControl` and `fetchMissionControlTrend` |
| `apps/web/frontend/lib/schemas/` | Add Zod schemas for both responses |
| `apps/web/frontend/types/index.ts` | Add `MissionControlMetrics` and `MissionControlTrendData` types |
| `apps/web/frontend/features/dashboard/hooks/useDashboardMetrics.ts` | Replace with `useMissionControl.ts` |
| `apps/web/frontend/features/dashboard/DashboardPage.tsx` | Rename to `MissionControlPage.tsx`, wire `useMissionControl` |
| `apps/web/frontend/components/layout/Sidebar.tsx` | Rename "Dashboard" → "Mission Control" |
| `apps/web/frontend/App.tsx` | Update route/label |

Existing `/api/trend` and `/api/sessions/summary` endpoints are **not modified**.

---

## Out of Scope

- Frontend KPI card redesign and visual layout (separate spec)
- Chart rendering for the drill-down (separate spec)
- Caching or background pre-computation of metrics
