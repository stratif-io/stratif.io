# Mission Control Per-Metric Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/mission-control/metric` endpoint returning current+previous values for a single KPI metric, and refactor `useMissionControl` to fetch all 8 metrics in parallel via `useQueries`.

**Architecture:** New parameterized backend endpoint dispatches on metric name and runs only the required SQL (mirrors the existing `/api/mission-control/trend` pattern). Frontend hook replaces a single `useQuery` with 8 parallel queries and reconstructs the existing `MissionControlResponse` shape so no consumers change.

**Tech Stack:** FastAPI, pytest, React 18, TanStack Query v5, TypeScript, Vitest, @testing-library/react

---

## File Map

| File | Change |
|---|---|
| `backend/api/mission_control.py` | Add `_fetch_single_metric` helper + `GET /mission-control/metric` route |
| `backend/tests/test_api_mission_control.py` | Add `TestMissionControlMetricEndpoint` class |
| `apps/web/frontend/types/index.ts` | Add `MissionControlMetricResponse` interface |
| `apps/web/frontend/lib/schemas/api-schemas.ts` | Add `MissionControlMetricResponseSchema` Zod schema |
| `apps/web/frontend/lib/api/queries.ts` | Add `fetchMissionControlMetric` function |
| `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts` | Refactor to `useQueries` |
| `apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControl.test.ts` | New test file for the refactored hook |

---

## Task 1: Backend — `_fetch_single_metric` helper + route

**Files:**
- Modify: `backend/api/mission_control.py`
- Test: `backend/tests/test_api_mission_control.py`

### Step 1: Write failing tests for the new endpoint

Open `backend/tests/test_api_mission_control.py` and add this class at the bottom:

```python
class TestMissionControlMetricEndpoint:
    def test_returns_metric_current_previous(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "total_events", "start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["metric"] == "total_events"
        assert isinstance(body["current"], (int, float))
        assert isinstance(body["previous"], (int, float))

    def test_unsupported_metric_returns_400(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "bogus", "start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        assert response.status_code == 400

    def test_invalid_date_returns_400(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "total_events", "start_date": "not-a-date", "end_date": "2024-01-16"},
        )
        assert response.status_code == 400

    def test_start_after_end_returns_400(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "total_events", "start_date": "2024-01-31", "end_date": "2024-01-01"},
        )
        assert response.status_code == 400

    def test_same_day_is_valid(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "unique_users", "start_date": "2024-01-15", "end_date": "2024-01-15"},
        )
        assert response.status_code == 200
        assert response.json()["metric"] == "unique_users"

    def test_empty_range_returns_zeros(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "total_events", "start_date": "2000-01-01", "end_date": "2000-01-02"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["current"] == 0
        assert body["previous"] == 0

    def test_total_events_nonzero_for_seeded_data(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "total_events", "start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        assert response.json()["current"] >= 1

    def test_returning_users_non_negative(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "returning_users", "start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        assert response.json()["current"] >= 0

    def test_dau_mau_ratio_between_0_and_1(self, client):
        response = client.get(
            "/api/mission-control/metric",
            params={"metric": "dau_mau_ratio", "start_date": "2024-01-15", "end_date": "2024-01-16"},
        )
        body = response.json()
        assert 0.0 <= body["current"] <= 1.0

    def test_all_8_metrics_return_200(self, client):
        metrics = [
            "total_events", "unique_users", "total_sessions",
            "avg_session_duration_sec", "avg_events_per_session",
            "new_users", "returning_users", "dau_mau_ratio",
        ]
        for m in metrics:
            r = client.get(
                "/api/mission-control/metric",
                params={"metric": m, "start_date": "2024-01-15", "end_date": "2024-01-16"},
            )
            assert r.status_code == 200, f"metric {m} returned {r.status_code}"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /path/to/repo
uv run pytest backend/tests/test_api_mission_control.py::TestMissionControlMetricEndpoint -v
```

Expected: All tests FAIL with 404 (route not yet defined).

- [ ] **Step 3: Implement `_fetch_single_metric` and the route**

Open `backend/api/mission_control.py`. After the `SUPPORTED_METRICS` set (around line 143), add:

```python
def _fetch_single_metric(
    db: AnalyticsDatabase,
    metric: str,
    period_start: date,
    period_end: date,
    filter_clauses: list[str],
    filter_params: list,
) -> float:
    """Run only the SQL needed for the requested metric; return a single scalar."""
    ps = f"{period_start} 00:00:00"
    pe = f"{period_end} 23:59:59"
    ev_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    ev_params: list = [ps, pe]
    ev_where.extend(filter_clauses)
    ev_params.extend(filter_params)
    ev_where_sql = "WHERE " + " AND ".join(ev_where)

    if metric == "total_events":
        rows = db.execute(f"SELECT COUNT(*) FROM events {ev_where_sql}", ev_params)
        return rows[0][0] if rows else 0

    if metric == "unique_users":
        rows = db.execute(
            f"SELECT COUNT(DISTINCT user_id) FROM events {ev_where_sql}", ev_params
        )
        return rows[0][0] if rows else 0

    if metric in ("total_sessions", "avg_session_duration_sec", "avg_events_per_session"):
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

        if metric == "total_sessions":
            agg = "COUNT(*)"
        elif metric == "avg_session_duration_sec":
            agg = "AVG(ds.duration_sec)"
        else:
            agg = "AVG(ds.event_count)"

        rows = db.execute(
            f"""
            WITH {session_ctes(timeout, dialect)}
            SELECT {agg} FROM derived_sessions ds {sess_where_sql}
            """,
            sess_params,
        )
        return round(rows[0][0] or 0.0, 2) if rows else 0.0

    if metric == "new_users":
        rows = db.execute(
            """
            SELECT COUNT(*)
            FROM (
                SELECT user_id FROM events
                GROUP BY user_id
                HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
            ) t
            """,
            [str(period_start), str(period_end)],
        )
        return rows[0][0] if rows else 0

    if metric == "returning_users":
        uniq_rows = db.execute(
            f"SELECT COUNT(DISTINCT user_id) FROM events {ev_where_sql}", ev_params
        )
        unique_users = uniq_rows[0][0] if uniq_rows else 0
        new_rows = db.execute(
            """
            SELECT COUNT(*)
            FROM (
                SELECT user_id FROM events
                GROUP BY user_id
                HAVING DATE(MIN(timestamp)) >= ? AND DATE(MIN(timestamp)) <= ?
            ) t
            """,
            [str(period_start), str(period_end)],
        )
        new_users = new_rows[0][0] if new_rows else 0
        return max(0, unique_users - new_users)

    # dau_mau_ratio
    dau_rows = db.execute(
        f"""
        SELECT AVG(daily_count)
        FROM (
            SELECT DATE(timestamp) AS d, COUNT(DISTINCT user_id) AS daily_count
            FROM events {ev_where_sql}
            GROUP BY DATE(timestamp)
        ) t
        """,
        ev_params,
    )
    dau = dau_rows[0][0] if dau_rows else 0.0

    mau_start = period_end - timedelta(days=27)
    mau_where: list[str] = ["timestamp >= ?", "timestamp <= ?"]
    mau_params: list = [f"{mau_start} 00:00:00", pe]
    mau_where.extend(filter_clauses)
    mau_params.extend(filter_params)
    mau_where_sql = "WHERE " + " AND ".join(mau_where)
    mau_rows = db.execute(
        f"SELECT COUNT(DISTINCT user_id) FROM events {mau_where_sql}", mau_params
    )
    mau = mau_rows[0][0] if mau_rows else 0
    return round(dau / mau, 4) if mau else 0.0
```

Then add the route after the `_fetch_single_metric` function (before the existing `get_mission_control_trend` route):

```python
@router.get("/mission-control/metric")
def get_mission_control_metric(
    db: Annotated[AnalyticsDatabase, Depends(get_analytics_db)],
    metric: str = Query(..., description="Metric name"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    filters: str | None = Query(None, description="JSON dict of dimension filters"),
) -> dict:
    """Return current and previous period scalar for a single metric."""
    if metric not in SUPPORTED_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric '{metric}'. Supported: {sorted(SUPPORTED_METRICS)}",
        )

    parse_date(start_date)
    parse_date(end_date)
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date.")

    filter_clauses: list[str] = []
    filter_params: list = []
    if filters:
        try:
            filter_clauses, filter_params = db.build_filter_clauses(json.loads(filters))
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid filters JSON.")

    prev_start, prev_end = _compute_previous_period(start, end)

    current_value = _fetch_single_metric(db, metric, start, end, filter_clauses, filter_params)
    previous_value = _fetch_single_metric(db, metric, prev_start, prev_end, filter_clauses, filter_params)

    return {"metric": metric, "current": current_value, "previous": previous_value}
```

> **Note:** FastAPI matches routes top-to-bottom. The `/mission-control/metric` route must be registered **before** `/mission-control/trend` and `/mission-control` to avoid path conflicts. Check the order in the file after adding.

- [ ] **Step 4: Run tests — expect all pass**

```bash
uv run pytest backend/tests/test_api_mission_control.py::TestMissionControlMetricEndpoint -v
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Run full backend test suite to confirm no regressions**

```bash
uv run pytest backend/tests/test_api_mission_control.py -v
```

Expected: All existing tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/api/mission_control.py backend/tests/test_api_mission_control.py
git commit -m "feat(backend): add /api/mission-control/metric per-metric endpoint"
```

---

## Task 2: Frontend — type, schema, fetch function

**Files:**
- Modify: `apps/web/frontend/types/index.ts`
- Modify: `apps/web/frontend/lib/schemas/api-schemas.ts`
- Modify: `apps/web/frontend/lib/api/queries.ts`

No separate tests needed for these — they are exercised by the hook tests in Task 3.

- [ ] **Step 1: Add type to `types/index.ts`**

Find the `MissionControlTrendPoint` interface (around line 376). Add the new interface **above** it:

```typescript
export interface MissionControlMetricResponse {
  metric: string
  current: number
  previous: number
}
```

- [ ] **Step 2: Add Zod schema to `api-schemas.ts`**

Find `MissionControlTrendPointSchema` (around line 260). Add **above** it:

```typescript
export const MissionControlMetricResponseSchema = z.object({
  metric: z.string(),
  current: z.number(),
  previous: z.number(),
})

export type MissionControlMetricResponseType = z.infer<typeof MissionControlMetricResponseSchema>
```

- [ ] **Step 3: Add fetch function to `queries.ts`**

Find `fetchMissionControlTrend` (around line 458). Add directly after it:

```typescript
export const fetchMissionControlMetric = (params: {
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

  return fetchApi<MissionControlMetricResponse>(`/api/mission-control/metric?${searchParams}`)
}
```

Also add `MissionControlMetricResponse` to the import list at the top of `queries.ts` (it already imports from `@/types`).

- [ ] **Step 4: TypeScript check**

```bash
npm run build 2>&1 | head -30
```

Expected: No new type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/types/index.ts apps/web/frontend/lib/schemas/api-schemas.ts apps/web/frontend/lib/api/queries.ts
git commit -m "feat(frontend): add MissionControlMetricResponse type, schema, and fetch function"
```

---

## Task 3: Frontend — refactor `useMissionControl` hook

**Files:**
- Modify: `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts`
- Create: `apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControl.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControl.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMissionControl } from '../useMissionControl'

vi.mock('@/lib/api', () => ({
  fetchMissionControlMetric: vi.fn(),
  fetchTopEvents: vi.fn(),
}))

vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({
    activeFilters: {},
    activeConnectionId: 'conn-1',
  })),
}))

import { fetchMissionControlMetric, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const dateRange = { from: new Date('2024-01-15'), to: new Date('2024-01-16') }

const METRICS = [
  'total_events', 'unique_users', 'total_sessions',
  'avg_session_duration_sec', 'avg_events_per_session',
  'new_users', 'returning_users', 'dau_mau_ratio',
] as const

describe('useMissionControl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchMissionControlMetric).mockImplementation(({ metric }) =>
      Promise.resolve({ metric, current: 42, previous: 30 })
    )
    vi.mocked(fetchTopEvents).mockResolvedValue({ data: [] })
  })

  it('returns undefined data while queries are loading', () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('reconstructs MissionControlResponse from 8 individual results', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const data = result.current.data
    expect(data).toBeDefined()
    // All 8 metrics present in current and previous
    for (const m of METRICS) {
      expect(data!.current[m]).toBe(42)
      expect(data!.previous[m]).toBe(30)
    }
  })

  it('reconstructs period and previous_period date ranges', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data!.period.start_date).toBe('2024-01-15')
    expect(result.current.data!.period.end_date).toBe('2024-01-16')
    // Previous period: 2-day window before 2024-01-15 → 2024-01-13 to 2024-01-14
    expect(result.current.data!.previous_period.start_date).toBe('2024-01-13')
    expect(result.current.data!.previous_period.end_date).toBe('2024-01-14')
  })

  it('sets isError and error when any query fails', async () => {
    vi.mocked(fetchMissionControlMetric).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBeUndefined()
  })

  it('does not fire queries when activeConnectionId is missing', () => {
    vi.mocked(useAppStore).mockReturnValue({
      activeFilters: {},
      activeConnectionId: null,
    } as ReturnType<typeof useAppStore>)

    renderHook(() => useMissionControl({ dateRange }), { wrapper: makeWrapper() })
    expect(fetchMissionControlMetric).not.toHaveBeenCalled()
  })

  it('calls fetchMissionControlMetric once per metric (8 times)', async () => {
    const { result } = renderHook(() => useMissionControl({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(fetchMissionControlMetric).toHaveBeenCalledTimes(8)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControl.test.ts
```

Expected: Tests FAIL — `fetchMissionControlMetric` is not called / hook not updated yet.

- [ ] **Step 3: Rewrite `useMissionControl.ts`**

Replace the entire file content:

```typescript
import { useQuery, useQueries } from '@tanstack/react-query'
import { format, subDays, differenceInDays } from 'date-fns'
import { fetchMissionControlMetric, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { DateRange, MissionControlResponse } from '@/types'

const METRICS = [
  'total_events',
  'unique_users',
  'total_sessions',
  'avg_session_duration_sec',
  'avg_events_per_session',
  'new_users',
  'returning_users',
  'dau_mau_ratio',
] as const

type MetricKey = (typeof METRICS)[number]

export interface UseMissionControlOptions {
  dateRange: DateRange
}

export interface UseMissionControlReturn {
  data: MissionControlResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  topEvents: Array<{ name: string; count: number }>
  eventsLoading: boolean
}

export function useMissionControl({
  dateRange,
}: UseMissionControlOptions): UseMissionControlReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const enabled = !!activeConnectionId && !!startDate && !!endDate

  // Previous period calculation (same as useMissionControlTrends)
  const periodDays =
    dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0
  const prevEndDate = dateRange.from
    ? format(subDays(dateRange.from, 1), 'yyyy-MM-dd')
    : undefined
  const prevStartDate =
    dateRange.from && periodDays > 0
      ? format(subDays(dateRange.from, periodDays), 'yyyy-MM-dd')
      : undefined

  // 8 per-metric queries run in parallel
  const metricResults = useQueries({
    queries: METRICS.map((metric) => ({
      queryKey: ['missionControlMetric', metric, startDate, endDate, activeFilters, activeConnectionId],
      queryFn: () =>
        fetchMissionControlMetric({
          metric,
          start_date: startDate!,
          end_date: endDate!,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        }),
      enabled,
      staleTime: QUERY_STALE_TIME.default,
    })),
  })

  const { data: topEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['topEvents', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchTopEvents({
        limit: 5,
        start_date: startDate,
        end_date: endDate,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled,
    staleTime: QUERY_STALE_TIME.default,
  })

  const isLoading = metricResults.some((r) => r.isLoading)
  const isError = metricResults.some((r) => r.isError)
  const error = (metricResults.find((r) => r.error)?.error as Error | null) ?? null

  // Reconstruct MissionControlResponse only when all 8 queries have data
  const allResolved = metricResults.every((r) => r.data !== undefined)
  const data: MissionControlResponse | undefined = allResolved
    ? {
        period: { start_date: startDate!, end_date: endDate! },
        previous_period: {
          start_date: prevStartDate ?? startDate!,
          end_date: prevEndDate ?? endDate!,
        },
        current: Object.fromEntries(
          METRICS.map((metric, i) => [metric, metricResults[i].data!.current])
        ) as Record<MetricKey, number>,
        previous: Object.fromEntries(
          METRICS.map((metric, i) => [metric, metricResults[i].data!.previous])
        ) as Record<MetricKey, number>,
      }
    : undefined

  return {
    data,
    isLoading,
    isError,
    error,
    topEvents: topEventsData?.data ?? [],
    eventsLoading,
  }
}
```

- [ ] **Step 4: Run the new hook tests**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControl.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Run full frontend test suite**

```bash
npm run test:run
```

Expected: All tests PASS (no regressions in `MissionControlGrid` tests or elsewhere).

- [ ] **Step 6: TypeScript + lint check**

```bash
npm run build && npm run lint
```

Expected: No errors or warnings.

- [ ] **Step 7: Commit**

```bash
git add apps/web/frontend/features/dashboard/hooks/useMissionControl.ts \
        apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControl.test.ts
git commit -m "feat(frontend): refactor useMissionControl to use useQueries per metric"
```

---

## Done

All tasks complete. The `/api/mission-control` batch endpoint is unchanged. The new `/api/mission-control/metric` endpoint handles per-metric requests with targeted SQL. The frontend fetches all 8 metrics in parallel with independent TanStack Query cache entries per metric.
