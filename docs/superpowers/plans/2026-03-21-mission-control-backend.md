# Mission Control Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/mission-control` and `GET /api/mission-control/trend` endpoints, wire up frontend types/schemas/hooks, rename Dashboard → Mission Control in the UI.

**Architecture:** New FastAPI router `backend/api/mission_control.py` implements both endpoints with all SQL in one place. Frontend gets new Zod schemas, TypeScript types, a `useMissionControl` hook, and a renamed page component. The existing dashboard queries (`useDashboardMetrics`) are replaced entirely.

**Tech Stack:** FastAPI, DuckDB, Python, React 18, TypeScript, TanStack Query v5, Zod

**Spec:** `docs/superpowers/specs/2026-03-21-mission-control-backend-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/api/mission_control.py` | Create | Both endpoints + all SQL logic |
| `backend/api/__init__.py` | Modify | Export `mission_control_router` |
| `backend/main.py` | Modify | Register router in app + create_analytics_app |
| `backend/tests/test_api_mission_control.py` | Create | Integration tests |
| `apps/web/frontend/lib/schemas/api-schemas.ts` | Modify | Add Zod schemas |
| `apps/web/frontend/types/index.ts` | Modify | Add TypeScript types |
| `apps/web/frontend/lib/api/queries.ts` | Modify | Add fetch functions |
| `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts` | Create | TanStack Query hook |
| `apps/web/frontend/features/dashboard/hooks/useDashboardMetrics.ts` | Delete | Replaced by useMissionControl |
| `apps/web/frontend/features/dashboard/DashboardPage.tsx` | Modify | Wire useMissionControl, rename display |
| `apps/web/frontend/components/layout/Sidebar.tsx` | Modify | "Dashboard" → "Mission Control" |
| `apps/web/frontend/App.tsx` | Modify | Label update |

---

## Task 1: Backend router — events aggregate + sessions metrics

**Files:**
- Create: `backend/api/mission_control.py`
- Create: `backend/tests/test_api_mission_control.py`

- [ ] **Step 1: Write failing tests for `/api/mission-control`**

Create `backend/tests/test_api_mission_control.py`:

```python
"""Integration tests for /api/mission-control endpoint."""
import pytest


class TestMissionControlEndpoint:
    def test_happy_path_returns_200(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        assert response.status_code == 200
        body = response.json()
        assert "period" in body
        assert "previous_period" in body
        assert "current" in body
        assert "previous" in body

    def test_current_metrics_shape(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        current = body["current"]
        assert "total_events" in current
        assert "unique_users" in current
        assert "total_sessions" in current
        assert "avg_session_duration_sec" in current
        assert "avg_events_per_session" in current
        assert "new_users" in current
        assert "returning_users" in current
        assert "dau_mau_ratio" in current

    def test_previous_period_computed_correctly(self, client):
        # 2-day period: 2024-01-15 to 2024-01-16
        # previous: 2024-01-13 to 2024-01-14
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        assert body["previous_period"]["start_date"] == "2024-01-13"
        assert body["previous_period"]["end_date"] == "2024-01-14"

    def test_start_date_after_end_date_returns_400(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-31", "end_date": "2024-01-01"},
        )
        assert response.status_code == 400

    def test_total_events_counts_events_in_range(self, client):
        # Seed data: user-1 and user-2 each have events on 2024-01-15
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-15"},
        )
        body = response.json()
        # 2 events on 2024-01-15 (user-1 has 2 events, but one is at 10:05 — both on 15th)
        assert body["current"]["total_events"] >= 1

    def test_new_users_uses_global_min_timestamp(self, client):
        # user-1's first event ever is 2024-01-15. Querying that date → new_users >= 1
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-15"},
        )
        body = response.json()
        assert body["current"]["new_users"] >= 1

    def test_returning_users_non_negative(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        assert body["current"]["returning_users"] >= 0
        assert body["previous"]["returning_users"] >= 0

    def test_dau_mau_ratio_between_0_and_1(self, client):
        response = client.get(
            "/api/mission-control",
            params={"start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        assert 0.0 <= body["current"]["dau_mau_ratio"] <= 1.0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss
uv run pytest backend/tests/test_api_mission_control.py -v 2>&1 | head -30
```

Expected: errors like `404 Not Found` or import errors.

- [ ] **Step 3: Create `backend/api/mission_control.py` with the aggregate endpoint**

```python
"""Mission Control API endpoints."""

import json
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.services import get_analytics_db
from backend.services.connection_executor import AnalyticsDatabase
from backend.services.views import session_ctes
from backend.services.validators import parse_date

router = APIRouter(prefix="/api", tags=["mission-control"])


def _compute_previous_period(start: date, end: date) -> tuple[date, date]:
    duration = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = start - timedelta(days=duration)
    return prev_start, prev_end


def _fetch_period_metrics(
    db: AnalyticsDatabase,
    period_start: date,
    period_end: date,
    filter_clauses: list[str],
    filter_params: list,
) -> dict:
    ps = f"{period_start} 00:00:00"
    pe = f"{period_end} 23:59:59"

    # --- 1. Events aggregate ---
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    ev_rows = db.execute(
        f"SELECT COUNT(*), COUNT(DISTINCT user_id) FROM events {ev_where_sql}",
        ev_params,
    )
    total_events = ev_rows[0][0] if ev_rows else 0
    unique_users = ev_rows[0][1] if ev_rows else 0

    # --- 2. Sessions summary ---
    sess_where: list[str] = ["ds.start_time >= ?", "ds.start_time <= ?"]
    sess_params: list = [ps, pe]
    if filter_clauses:
        sess_where.append(
            f"ds.user_id IN (SELECT DISTINCT user_id FROM events {ev_where_sql})"
        )
        sess_params.extend(ev_params)

    sess_where_sql = "WHERE " + " AND ".join(sess_where)
    timeout = db.get_session_timeout_minutes()
    dialect = db.get_dialect()

    sess_rows = db.execute(
        f"""
        WITH {session_ctes(timeout, dialect)}
        SELECT COUNT(*), AVG(ds.duration_sec), AVG(ds.event_count)
        FROM derived_sessions ds
        {sess_where_sql}
        """,
        sess_params,
    )
    sess_row = sess_rows[0] if sess_rows else (0, 0.0, 0.0)
    total_sessions = sess_row[0] or 0
    avg_session_duration_sec = round(sess_row[1] or 0.0, 2)
    avg_events_per_session = round(sess_row[2] or 0.0, 2)

    # --- 3. New vs returning users ---
    # new_users: users whose DATE(MIN(timestamp over all history)) is in period
    new_rows = db.execute(
        """
        SELECT COUNT(*)
        FROM (
            SELECT user_id
            FROM events
            GROUP BY user_id
            HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
        ) t
        """,
        [str(period_start), str(period_end)],
    )
    new_users = new_rows[0][0] if new_rows else 0
    returning_users = max(0, unique_users - new_users)

    # --- 4. DAU/MAU ratio ---
    mau_start = period_end - timedelta(days=27)
    mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    mau_params: list = [f"{mau_start} 00:00:00", pe]
    mau_where.extend(filter_clauses)
    mau_params.extend(filter_params)
    mau_where_sql = "WHERE " + " AND ".join(mau_where)

    mau_rows = db.execute(
        f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}",
        mau_params,
    )
    mau = mau_rows[0][0] if mau_rows else 0

    dau_rows = db.execute(
        f"""
        SELECT AVG(daily_count)
        FROM (
            SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) AS daily_count
            FROM events
            {ev_where_sql}
            GROUP BY DATE(timestamp)
        ) t
        """,
        ev_params,
    )
    dau = dau_rows[0][0] if dau_rows else 0.0
    dau_mau_ratio = round(dau / mau, 4) if mau else 0.0

    return {
        "total_events": total_events,
        "unique_users": unique_users,
        "total_sessions": total_sessions,
        "avg_session_duration_sec": avg_session_duration_sec,
        "avg_events_per_session": avg_events_per_session,
        "new_users": new_users,
        "returning_users": returning_users,
        "dau_mau_ratio": dau_mau_ratio,
    }


@router.get("/mission-control")
def get_mission_control(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return current and previous period KPI metrics."""
    # parse_date validates format and raises HTTP 400; then convert to date for arithmetic
    parse_date(start_date)
    parse_date(end_date)
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date.")

    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))

    prev_start, prev_end = _compute_previous_period(start, end)

    current = _fetch_period_metrics(db, start, end, filter_clauses, filter_params)
    previous = _fetch_period_metrics(db, prev_start, prev_end, filter_clauses, filter_params)

    return {
        "period": {"start_date": str(start), "end_date": str(end)},
        "previous_period": {"start_date": str(prev_start), "end_date": str(prev_end)},
        "current": current,
        "previous": previous,
    }
```

- [ ] **Step 4: Register the router**

In `backend/api/__init__.py`, add:
```python
from .mission_control import router as mission_control_router
```
And add `"mission_control_router"` to `__all__`.

In `backend/main.py`:
1. Add `mission_control_router` to the import from `backend.api`
2. Add `app.include_router(mission_control_router)` after the existing routers
3. Add `router_app.include_router(mission_control_router)` inside `create_analytics_app()`

- [ ] **Step 5: Run tests to verify they pass**

```bash
uv run pytest backend/tests/test_api_mission_control.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/api/mission_control.py backend/api/__init__.py backend/main.py backend/tests/test_api_mission_control.py
git commit -m "feat(mission-control): add /api/mission-control aggregate endpoint"
```

---

## Task 2: Backend router — trend endpoint

**Files:**
- Modify: `backend/api/mission_control.py`
- Modify: `backend/tests/test_api_mission_control.py`

- [ ] **Step 1: Write failing tests for `/api/mission-control/trend`**

Append to `TestMissionControlEndpoint` in `backend/tests/test_api_mission_control.py`:

```python
class TestMissionControlTrendEndpoint:
    def test_trend_happy_path(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "total_events",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["metric"] == "total_events"
        assert isinstance(body["data"], list)
        assert all("date" in d and "value" in d for d in body["data"])

    def test_trend_unknown_metric_returns_400(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "bogus_metric",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 400

    def test_trend_unique_users_returns_daily_counts(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "unique_users",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        body = response.json()
        # Each entry has a non-negative value
        assert all(d["value"] >= 0 for d in body["data"])

    def test_trend_new_users_non_negative(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "new_users",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert all(d["value"] >= 0 for d in body["data"])

    def test_trend_dau_mau_ratio_between_0_and_1(self, client):
        response = client.get(
            "/api/mission-control/trend",
            params={
                "metric": "dau_mau_ratio",
                "start_date": "2024-01-15",
                "end_date": "2024-01-16",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert all(0.0 <= d["value"] <= 1.0 for d in body["data"])
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
uv run pytest backend/tests/test_api_mission_control.py::TestMissionControlTrendEndpoint -v
```

Expected: 404 or errors.

- [ ] **Step 3: Implement the trend endpoint**

Add `SUPPORTED_METRICS` and the trend endpoint to `backend/api/mission_control.py`:

```python
SUPPORTED_METRICS = {
    "total_events",
    "unique_users",
    "total_sessions",
    "avg_session_duration_sec",
    "avg_events_per_session",
    "new_users",
    "returning_users",
    "dau_mau_ratio",
}


@router.get("/mission-control/trend")
def get_mission_control_trend(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    metric: str = Query(..., description="Metric name"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return daily time-series for a single metric."""
    if metric not in SUPPORTED_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric '{metric}'. Supported: {sorted(SUPPORTED_METRICS)}",
        )

    parse_date(start_date)   # validates format, raises HTTP 400 on bad input
    parse_date(end_date)
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date.")

    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))

    ps = f"{start} 00:00:00"
    pe = f"{end} 23:59:59"
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    timeout = db.get_session_timeout_minutes()
    dialect = db.get_dialect()

    if metric == "total_events":
        rows = db.execute(
            f"SELECT DATE(timestamp), COUNT(*) FROM events {ev_where_sql} GROUP BY DATE(timestamp) ORDER BY 1",
            ev_params,
        )
        data = [{"date": str(r[0]), "value": r[1] or 0} for r in rows]

    elif metric == "unique_users":
        rows = db.execute(
            f"SELECT DATE(timestamp), COUNT(DISTINCT user_id) FROM events {ev_where_sql} GROUP BY DATE(timestamp) ORDER BY 1",
            ev_params,
        )
        data = [{"date": str(r[0]), "value": r[1] or 0} for r in rows]

    elif metric in ("total_sessions", "avg_session_duration_sec", "avg_events_per_session"):
        sess_where: list[str] = ["ds.start_time >= ?", "ds.start_time <= ?"]
        sess_params: list = [ps, pe]
        if filter_clauses:
            sess_where.append(
                f"ds.user_id IN (SELECT DISTINCT user_id FROM events {ev_where_sql})"
            )
            sess_params.extend(ev_params)
        sess_where_sql = "WHERE " + " AND ".join(sess_where)

        if metric == "total_sessions":
            agg = "COUNT(*)"
        elif metric == "avg_session_duration_sec":
            agg = "AVG(ds.duration_sec)"
        else:
            agg = "AVG(ds.event_count)"

        rows = db.execute(
            f"""
            WITH {session_ctes(timeout, dialect)}
            SELECT DATE(ds.start_time), {agg}
            FROM derived_sessions ds
            {sess_where_sql}
            GROUP BY DATE(ds.start_time)
            ORDER BY 1
            """,
            sess_params,
        )
        data = [{"date": str(r[0]), "value": round(r[1] or 0.0, 2)} for r in rows]

    elif metric == "new_users":
        rows = db.execute(
            f"""
            SELECT DATE(MIN(timestamp)) AS first_day, COUNT(*) AS cnt
            FROM events
            GROUP BY user_id
            HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
            """,  # noqa: S608
            [str(start), str(end)],
        )
        # Build a dict keyed by date, then convert to list sorted by date
        by_day: dict[str, int] = {}
        for r in rows:
            by_day[str(r[0])] = r[1] or 0
        # Iterate every day in range so days with 0 new users still appear
        current_day = start
        data = []
        while current_day <= end:
            data.append({"date": str(current_day), "value": by_day.get(str(current_day), 0)})
            current_day += timedelta(days=1)

    elif metric == "returning_users":
        # daily unique users (with filters)
        uniq_rows = db.execute(
            f"SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) FROM events {ev_where_sql} GROUP BY d ORDER BY d",
            ev_params,
        )
        daily_uniq: dict[str, int] = {str(r[0]): r[1] or 0 for r in uniq_rows}

        # new users per day (global min, no date filter)
        new_rows = db.execute(
            f"""
            SELECT DATE(MIN(timestamp)) AS first_day, COUNT(*) AS cnt
            FROM events
            GROUP BY user_id
            HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
            """,
            [str(start), str(end)],
        )
        new_by_day: dict[str, int] = {str(r[0]): r[1] or 0 for r in new_rows}

        current_day = start
        data = []
        while current_day <= end:
            d = str(current_day)
            returning = max(0, daily_uniq.get(d, 0) - new_by_day.get(d, 0))
            data.append({"date": d, "value": returning})
            current_day += timedelta(days=1)

    else:  # dau_mau_ratio
        current_day = start
        data = []
        while current_day <= end:
            day_ps = f"{current_day} 00:00:00"
            day_pe = f"{current_day} 23:59:59"
            dau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            dau_params: list = [day_ps, day_pe]
            dau_where.extend(filter_clauses)
            dau_params.extend(filter_params)
            dau_where_sql = "WHERE " + " AND ".join(dau_where)

            mau_start = current_day - timedelta(days=27)
            mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
            mau_params: list = [f"{mau_start} 00:00:00", day_pe]
            mau_where.extend(filter_clauses)
            mau_params.extend(filter_params)
            mau_where_sql = "WHERE " + " AND ".join(mau_where)

            dau_r = db.execute(f"SELECT COUNT(DISTINCT user_id) FROM events {dau_where_sql}", dau_params)
            mau_r = db.execute(f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}", mau_params)
            dau_val = dau_r[0][0] if dau_r else 0
            mau_val = mau_r[0][0] if mau_r else 0
            ratio = round(dau_val / mau_val, 4) if mau_val else 0.0
            data.append({"date": str(current_day), "value": ratio})
            current_day += timedelta(days=1)

    return {"metric": metric, "data": data}
```

- [ ] **Step 4: Run all mission control tests**

```bash
uv run pytest backend/tests/test_api_mission_control.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/api/mission_control.py backend/tests/test_api_mission_control.py
git commit -m "feat(mission-control): add /api/mission-control/trend endpoint"
```

---

## Task 3: Frontend types, Zod schemas, fetch functions

**Files:**
- Modify: `apps/web/frontend/types/index.ts`
- Modify: `apps/web/frontend/lib/schemas/api-schemas.ts`
- Modify: `apps/web/frontend/lib/api/queries.ts`

- [ ] **Step 1: Add TypeScript types**

In `apps/web/frontend/types/index.ts`, append:

```typescript
export interface MissionControlMetrics {
  total_events: number
  unique_users: number
  total_sessions: number
  avg_session_duration_sec: number
  avg_events_per_session: number
  new_users: number
  returning_users: number
  dau_mau_ratio: number
}

export interface MissionControlPeriod {
  start_date: string
  end_date: string
}

export interface MissionControlResponse {
  period: MissionControlPeriod
  previous_period: MissionControlPeriod
  current: MissionControlMetrics
  previous: MissionControlMetrics
}

export interface MissionControlTrendPoint {
  date: string
  value: number
}

export interface MissionControlTrendResponse {
  metric: string
  data: MissionControlTrendPoint[]
}
```

- [ ] **Step 2: Add Zod schemas**

In `apps/web/frontend/lib/schemas/api-schemas.ts`, add (after the existing schemas):

```typescript
export const MissionControlMetricsSchema = z.object({
  total_events: z.number().int().nonnegative(),
  unique_users: z.number().int().nonnegative(),
  total_sessions: z.number().int().nonnegative(),
  avg_session_duration_sec: z.number().nonnegative(),
  avg_events_per_session: z.number().nonnegative(),
  new_users: z.number().int().nonnegative(),
  returning_users: z.number().int().nonnegative(),
  dau_mau_ratio: z.number().min(0).max(1),
})

export const MissionControlPeriodSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
})

export const MissionControlResponseSchema = z.object({
  period: MissionControlPeriodSchema,
  previous_period: MissionControlPeriodSchema,
  current: MissionControlMetricsSchema,
  previous: MissionControlMetricsSchema,
})

export const MissionControlTrendPointSchema = z.object({
  date: z.string(),
  value: z.number(),
})

export const MissionControlTrendResponseSchema = z.object({
  metric: z.string(),
  data: z.array(MissionControlTrendPointSchema),
})

export type MissionControlMetricsType = z.infer<typeof MissionControlMetricsSchema>
export type MissionControlResponseType = z.infer<typeof MissionControlResponseSchema>
export type MissionControlTrendResponseType = z.infer<typeof MissionControlTrendResponseSchema>
```

- [ ] **Step 3: Add fetch functions**

In `apps/web/frontend/lib/api/queries.ts`, append:

```typescript
export const fetchMissionControl = (params: {
  start_date: string
  end_date: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('start_date', params.start_date)
  searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<MissionControlResponse>(`/api/mission-control?${searchParams}`)
}

export const fetchMissionControlTrend = (params: {
  metric: string
  start_date: string
  end_date: string
  filters?: Record<string, string | null>
  connection_id?: string
}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('metric', params.metric)
  searchParams.set('start_date', params.start_date)
  searchParams.set('end_date', params.end_date)
  const f = serializeFilters(params.filters)
  if (f) searchParams.set('filters', f)
  if (params.connection_id) searchParams.set('connection_id', params.connection_id)

  return fetchApi<MissionControlTrendResponse>(`/api/mission-control/trend?${searchParams}`)
}
```

Also add `MissionControlResponse` and `MissionControlTrendResponse` to the imports from `@/types` at the top of `queries.ts`.

- [ ] **Step 4: Type-check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/types/index.ts apps/web/frontend/lib/schemas/api-schemas.ts apps/web/frontend/lib/api/queries.ts
git commit -m "feat(mission-control): add frontend types, Zod schemas, and fetch functions"
```

---

## Task 4: `useMissionControl` hook + wire DashboardPage

**Files:**
- Create: `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts`
- Modify: `apps/web/frontend/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Verify store field names and constants**

Before writing the hook, confirm these identifiers exist:

```bash
grep -n "activeFilters\|activeConnectionId" apps/web/frontend/stores/app-store.ts | head -10
grep -n "QUERY_STALE_TIME" apps/web/frontend/lib/constants.ts | head -5
```

Expected: `activeFilters` and `activeConnectionId` defined in the store, `QUERY_STALE_TIME.default` exported from constants. If names differ, use the actual names in the hook below.

- [ ] **Step 2: Create `useMissionControl.ts`**

Create `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchMissionControl, fetchMissionControlTrend } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { DateRange, MissionControlResponse, MissionControlTrendResponse } from '@/types'

export interface UseMissionControlOptions {
  dateRange: DateRange
  trendMetric?: string | null
}

export interface UseMissionControlReturn {
  data: MissionControlResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  trendData: MissionControlTrendResponse | undefined
  trendLoading: boolean
}

export function useMissionControl({
  dateRange,
  trendMetric,
}: UseMissionControlOptions): UseMissionControlReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['missionControl', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchMissionControl({
        start_date: startDate!,
        end_date: endDate!,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!activeConnectionId && !!startDate && !!endDate,
    staleTime: QUERY_STALE_TIME.default,
  })

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['missionControlTrend', trendMetric, startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchMissionControlTrend({
        metric: trendMetric!,
        start_date: startDate!,
        end_date: endDate!,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!activeConnectionId && !!startDate && !!endDate && !!trendMetric,
    staleTime: QUERY_STALE_TIME.default,
  })

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    trendData,
    trendLoading,
  }
}
```

- [ ] **Step 3: Update DashboardPage to use useMissionControl**

Read `apps/web/frontend/features/dashboard/DashboardPage.tsx` first, then replace the `useDashboardMetrics` import and usage with `useMissionControl`. Keep all existing JSX structure — this task is **wiring only**, not redesign. The frontend visual redesign is a separate spec.

Minimum changes:
1. Replace `import { useDashboardMetrics }` with `import { useMissionControl } from './hooks/useMissionControl'`
2. Replace the hook call: `const { data, isLoading, isError, error } = useMissionControl({ dateRange })`
3. Update metric references to use `data?.current.total_events`, `data?.current.unique_users`, etc.
4. Remove imports of `fetchTrend`, `fetchTopEvents`, `fetchConversion`, `fetchSessionsSummary` that were previously used only via `useDashboardMetrics`.

- [ ] **Step 4: Delete the old hook**

```bash
rm apps/web/frontend/features/dashboard/hooks/useDashboardMetrics.ts
```

- [ ] **Step 5: Type-check and lint**

```bash
npm run build 2>&1 | tail -20
npm run lint 2>&1 | tail -20
```

Expected: no errors or warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/features/dashboard/hooks/useMissionControl.ts apps/web/frontend/features/dashboard/DashboardPage.tsx
git rm apps/web/frontend/features/dashboard/hooks/useDashboardMetrics.ts
git commit -m "feat(mission-control): replace useDashboardMetrics with useMissionControl hook"
```

---

## Task 5: Rename Dashboard → Mission Control in UI + final checks

**Files:**
- Modify: `apps/web/frontend/components/layout/Sidebar.tsx`
- Modify: `apps/web/frontend/App.tsx`
- Modify: `apps/web/frontend/features/dashboard/DashboardPage.tsx` (rename page title text if any)

- [ ] **Step 1: Update Sidebar**

In `apps/web/frontend/components/layout/Sidebar.tsx`:
- Change `{ title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }` → `{ title: 'Mission Control', href: '/dashboard', icon: LayoutDashboard }`
- Keep the route `/dashboard` unchanged (URL changes are a separate decision).

- [ ] **Step 2: Update App.tsx**

In `apps/web/frontend/App.tsx`, update any label string "Dashboard" to "Mission Control" in the route definition (if present — check with `grep -n "Dashboard" apps/web/frontend/App.tsx`). Keep the `/dashboard` path the same.

- [ ] **Step 3: Run lint + build + unit tests**

```bash
npm run lint 2>&1 | tail -10
npm run build 2>&1 | tail -10
npm run test:run 2>&1 | tail -20
uv run pytest backend/tests/test_api_mission_control.py -v
```

Expected: all pass, zero lint warnings.

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/components/layout/Sidebar.tsx apps/web/frontend/App.tsx
git commit -m "feat(mission-control): rename Dashboard → Mission Control in sidebar and app"
```

---

## Task 6: Final integration smoke test

- [ ] **Step 1: Start dev servers**

In two terminals:
```bash
uv run serve          # backend on :8000
npm run dev           # frontend on :5173
```

- [ ] **Step 2: Verify endpoints manually**

```bash
curl -s "http://localhost:8000/api/mission-control?start_date=2024-01-01&end_date=2024-01-31" | python3 -m json.tool | head -30
curl -s "http://localhost:8000/api/mission-control/trend?metric=unique_users&start_date=2024-01-01&end_date=2024-01-31" | python3 -m json.tool | head -20
```

Expected: valid JSON responses with `period`, `current`, `previous` and `metric`, `data` respectively.

- [ ] **Step 3: Check sidebar shows "Mission Control"**

Open `http://localhost:5173` in a browser and confirm the sidebar entry reads "Mission Control".

- [ ] **Step 4: Run full backend test suite**

```bash
uv run pytest backend/tests/ -v --tb=short 2>&1 | tail -30
```

Expected: all tests pass.
