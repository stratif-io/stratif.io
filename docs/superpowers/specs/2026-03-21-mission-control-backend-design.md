# Mission Control — Backend Spec

**Date:** 2026-03-21

## Goal

Replace the Dashboard page with "Mission Control" — a richer KPI overview backed by a dedicated backend endpoint that returns all metrics for the current period, the previous period (for ↑↓ comparison), and supports on-demand time-series drill-down per metric.

This spec covers the **backend only**. Frontend redesign (card layout, charts, rename) is a separate spec.

---

## File Layout Note

All backend files live under `backend/` (not `stratifio/` as referenced in CLAUDE.md — that reflects package naming, not directory layout). The new router goes in `backend/api/mission_control.py`, consistent with `backend/api/trend.py`, `backend/api/sessions.py`, etc.

---

## New Endpoints

### `GET /api/mission-control`

Returns aggregated metrics for the selected period and the automatically-computed previous period (same duration, immediately preceding `start_date`).

**Query params:** `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD), `filters` (JSON dict, same format as existing endpoints), `connection_id`

> `connection_id` is passed as a standard query param, forwarded to `get_analytics_db()` via the FastAPI dependency — consistent with `trend.py` and `sessions.py`.

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

> Note: `avg_session_duration_sec` uses a longer name than the existing `/api/sessions/summary` field (`avg_duration_sec`). This is intentional — the name is clearer in a multi-metric context and the frontend uses a new type definition anyway.

**Previous period computation:**

```
duration    = end_date − start_date + 1  (days)
prev_end    = start_date − 1
prev_start  = start_date − duration
```

Example: current `2024-02-20` → `2024-03-21` (30 days) → previous `2024-01-21` → `2024-02-19` (30 days).

**SQL queries (run for both current and previous periods):**

1. **Events aggregate** (from events table, filtered to `[period_start, period_end]`):
   - `total_events` = `COUNT(*)`
   - `unique_users` = `COUNT(DISTINCT user_id)`

2. **Sessions summary** (from `derived_sessions` CTE via `session_ctes` from `backend/services/views.py`, filtered to `[period_start, period_end]`):
   - `total_sessions` = `COUNT(*)`
   - `avg_session_duration_sec` = `AVG(duration_sec)`
   - `avg_events_per_session` = `AVG(event_count)`
   - **Filters interaction:** apply dimension filters the same way as `sessions.py` — restrict sessions to users who appear in `SELECT DISTINCT user_id FROM events WHERE timestamp BETWEEN period_start AND period_end AND <dimension_filters>`. The date window is included in this subquery, matching the existing `sessions.py` pattern.

3. **New vs returning users** (from events table):
   - A user is **new** if their `MIN(timestamp)` across the **entire unfiltered events table** (all time, not just the queried period) falls within `[period_start, period_end]`. The subquery that computes `MIN(timestamp)` must scan all history without a date filter. Dimension filters (e.g., country) are **not** applied to this global min subquery — new-ness is a property of the user, not the filtered slice.
   - `new_users` = count of distinct `user_id` where `DATE(MIN(timestamp)) BETWEEN period_start AND period_end`
   - `returning_users` = `unique_users − new_users` (cannot go negative since new_users ≤ unique_users by definition: a new user within the period must also appear in unique_users)

4. **DAU/MAU ratio** (from events table):
   - DAU = `AVG(daily_unique_users)` — count distinct users per calendar day within `[period_start, period_end]`, then average across days.
   - MAU = `COUNT(DISTINCT user_id)` over the **28 days ending on that period's `end_date`** — i.e., `[end_date − 27 days, end_date]`. When computing this for the previous period, `end_date` is `prev_end`. This window intentionally extends before `start_date` when the selected period is shorter than 28 days; the `start_date` filter does **not** apply to the MAU subquery.
   - `dau_mau_ratio` = DAU ÷ MAU (return `0.0` if MAU is 0).
   - Dimension filters (e.g., country) apply to both the DAU and MAU subqueries.

---

### `GET /api/mission-control/trend`

Returns a daily time-series for a single metric over the selected period. Called on-demand when the user clicks a KPI card.

**Query params:** `metric` (string, see supported values), `start_date`, `end_date`, `filters`, `connection_id`

**Supported metric values:**

| metric | Source | SQL |
|---|---|---|
| `total_events` | events | `COUNT(*)` grouped by calendar day |
| `unique_users` | events | `COUNT(DISTINCT user_id)` grouped by calendar day |
| `total_sessions` | derived_sessions | `COUNT(*)` grouped by calendar day |
| `avg_session_duration_sec` | derived_sessions | `AVG(duration_sec)` grouped by calendar day |
| `avg_events_per_session` | derived_sessions | `AVG(event_count)` grouped by calendar day |
| `new_users` | events | Per day: count distinct users where `DATE(MIN(timestamp over all history))` = that calendar day (global scan, no date filter on the MIN subquery, no dimension filters on new-ness) |
| `returning_users` | events | Per day: daily unique users (with dimension filters) minus new users that day (same global `DATE(MIN(timestamp))` definition — dimension filters not applied to new-ness check, so result cannot go negative) |
| `dau_mau_ratio` | events | Per day: unique users that day ÷ unique users over the 28-day rolling window ending on that day |

> The `dau_mau_ratio` trend uses a **rolling 28-day window** per day, so the series value for each day is computed independently. This differs from the aggregate endpoint's fixed MAU window (always anchored to `end_date`). Both are semantically correct for their context: aggregate gives one ratio for the whole period; trend shows daily stickiness evolution.

**Filters interaction for session metrics:** same as the aggregate endpoint — restrict to users matching the dimension filter.

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
Returns 400 if `start_date > end_date`.

---

## File Changes

| File | Change |
|---|---|
| `backend/api/mission_control.py` | New — both endpoints and all SQL logic |
| `backend/api/__init__.py` | Add `from .mission_control import router as mission_control_router` and export in `__all__` |
| `backend/main.py` | Register `mission_control_router` in **both** `app.include_router(...)` and `create_analytics_app()` |
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
