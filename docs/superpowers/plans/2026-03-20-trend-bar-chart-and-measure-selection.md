# Trend Bar Chart + Measure Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Bar chart type and a Measure selector (Event Count / Unique Users / numeric field aggregations) to the Trends page chart.

**Architecture:** Backend extends `/api/pivot` to accept `agg:field` measure expressions and exposes `numeric_dimensions` in `/api/pivot/options`. The frontend hook gains a `measure` param that switches between `fetchTrend` (default) and `fetchPivot` (non-default measures). `TrendChart` gains a `'bar'` type and a `measureKey` prop.

**Tech Stack:** Python/FastAPI (backend), React 18, TypeScript, TanStack Query v5, Recharts, Vitest

---

## File Map

| File | Change |
|------|--------|
| `backend/api/pivot.py` | Add `numeric_dimensions` to options; accept `agg:field` in `/api/pivot` |
| `apps/web/frontend/types/index.ts` | Add optional `numeric_dimensions` to `PivotOptionsResponse` |
| `apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts` | Add `measure` param, pivot trigger, measure row key, `measureKey` return, updated query keys |
| `apps/web/frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts` | New tests for measure selection |
| `apps/web/frontend/features/analytics/trends/components/TrendChart.tsx` | Add `'bar'` type, `measureKey` prop, bar chart rendering |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx` | `measure` state, Measure selector with groups, three-button toggle, reset on connection change |

---

## Task 1: Backend — `numeric_dimensions` in pivot options

**Files:**
- Modify: `backend/api/pivot.py` (function `get_pivot_options`, ~line 272)

- [ ] **Step 1: Add `numeric_dimensions` to the options response**

  In `get_pivot_options`, after building `custom_dimensions`, collect properties where `type == 'number'`:

  ```python
  numeric_dimensions = [
      {"value": p["name"], "label": p["name"].replace("_", " ").title()}
      for p in custom_props
      if p.get("type") == "number"
  ]
  ```

  Add it to the return dict:

  ```python
  return {
      "dimensions": [{"value": k, "label": v} for k, v in dimensions.items()],
      "measures": [
          {"value": "count_events", "label": "Event Count"},
          {"value": "unique_users", "label": "Unique Users"},
      ],
      "numeric_dimensions": numeric_dimensions,
      "event_names": [row[0] for row in events],
      **filter_options,
  }
  ```

- [ ] **Step 2: Verify manually**

  ```bash
  curl "http://localhost:8000/api/pivot/options?connection_id=<YOUR_ID>" | python3 -m json.tool | grep -A 10 numeric
  ```
  Expected: `"numeric_dimensions"` array with numeric custom properties.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/api/pivot.py
  git commit -m "feat: add numeric_dimensions to pivot options response"
  ```

---

## Task 2: Backend — `agg:field` measure expressions in `/api/pivot`

**Files:**
- Modify: `backend/api/pivot.py` (function `get_pivot`, ~line 295)

- [ ] **Step 1: Extend measure validation and SQL generation**

  Replace the existing measure validation block (lines ~336-339) and `get_measure_expr` inner function (lines ~363-369) with the following:

  ```python
  # Build set of valid numeric property names for this connection
  numeric_prop_names = {p["name"] for p in custom_props if p.get("type") == "number"}
  NUMERIC_AGGS = {"sum", "avg", "min", "max"}

  def parse_measure(m: str) -> tuple[str, str] | None:
      """Return (agg, field) for 'agg:field' expressions, else None."""
      if ":" in m:
          parts = m.split(":", 1)
          if len(parts) == 2:
              return parts[0].lower(), parts[1]
      return None

  valid_measures = {"count_events", "unique_users"}
  invalid_measures = []
  for m in measure_list:
      parsed = parse_measure(m)
      if m in valid_measures:
          continue
      elif parsed and parsed[0] in NUMERIC_AGGS and parsed[1] in numeric_prop_names:
          continue
      else:
          invalid_measures.append(m)

  if invalid_measures:
      return {"error": f"Invalid measures: {invalid_measures}", "data": []}
  ```

  Replace the `get_measure_expr` inner function:

  ```python
  def get_measure_expr(measure: str) -> str:
      if measure == "count_events":
          return "COUNT(*)"
      if measure == "unique_users":
          return "COUNT(DISTINCT user_id)"
      parsed = parse_measure(measure)
      if parsed:
          agg, field = parsed
          alias = f"{agg}_{field}"
          return f"{agg.upper()}({field}) AS {alias}"
      return "COUNT(*)"
  ```

  **Important:** The `SELECT` clause builds aliases like `{dim} AS {dim}` and `{measure_expr} AS {measure}`. For `agg:field` measures the expression already contains the alias (`SUM(field) AS sum_field`), so the outer `AS {measure}` in the select would double-alias. Fix the select parts for measures:

  ```python
  def get_measure_select(measure: str) -> str:
      expr = get_measure_expr(measure)
      parsed = parse_measure(measure)
      if parsed:
          # expr already contains the alias
          return expr
      return f"{expr} AS {measure}"

  select_parts = [f"{get_dimension_expr(dim)} AS {dim}" for dim in all_dims]
  select_parts += [get_measure_select(m) for m in measure_list]
  ```

  Also update the data reading loop — for `agg:field` measures the row key is `{agg}_{field}`, not the original measure string:

  ```python
  def measure_alias(measure: str) -> str:
      parsed = parse_measure(measure)
      return f"{parsed[0]}_{parsed[1]}" if parsed else measure

  for row in result:
      record: dict = {}
      for i, dim in enumerate(all_dims):
          val = row[i]
          record[dim] = val.isoformat() if isinstance(val, datetime) else val
      for i, measure in enumerate(measure_list):
          record[measure_alias(measure)] = row[len(all_dims) + i]
      data.append(record)
  ```

- [ ] **Step 2: Verify manually**

  ```bash
  curl "http://localhost:8000/api/pivot?row_dimensions=date&measures=sum:total_amount&start_date=2025-12-31&end_date=2026-03-19&connection_id=<YOUR_ID>" | python3 -m json.tool | head -30
  ```
  Expected: `data` array with rows containing `sum_total_amount` key.

  ```bash
  curl "http://localhost:8000/api/pivot?row_dimensions=date&measures=invalid_measure&start_date=2025-12-31&end_date=2026-03-19&connection_id=<YOUR_ID>"
  ```
  Expected: `{"error": "Invalid measures: ['invalid_measure']", "data": []}`.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/api/pivot.py
  git commit -m "feat: support agg:field measure expressions in /api/pivot"
  ```

---

## Task 3: Frontend types

**Files:**
- Modify: `apps/web/frontend/types/index.ts`

- [ ] **Step 1: Add `numeric_dimensions` to `PivotOptionsResponse`**

  Find `PivotOptionsResponse` (~line 178) and add the optional field:

  ```ts
  export interface PivotOptionsResponse {
    dimensions: Array<{ value: string; label: string }>
    measures: Array<{ value: string; label: string }>
    numeric_dimensions?: Array<{ value: string; label: string }>
    event_names: string[]
    /** Dynamic filter options keyed by field name, e.g. { country: [...], browser: [...] } */
    [key: string]: string[] | Array<{ value: string; label: string }> | undefined
  }
  ```

  Note: add `| undefined` to the index signature so the optional named property is compatible.

- [ ] **Step 2: Verify build**

  ```bash
  npm run build 2>&1 | grep "error TS"
  ```
  Expected: no output.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/frontend/types/index.ts
  git commit -m "feat: add numeric_dimensions to PivotOptionsResponse type"
  ```

---

## Task 4: Extend `useTrendData` with `measure` param

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts`
- Modify: `apps/web/frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts`

### Step 4a — write failing tests first

- [ ] **Step 1: Add new tests to the existing test file**

  Append these test cases to `useTrendData.test.ts` (inside a new `describe` block at the bottom):

  ```ts
  describe('useTrendData — measure selection', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('uses fetchTrend for unique_users and normalises to count key', async () => {
      vi.mocked(fetchTrend).mockResolvedValue({
        total_unique_users: 3,
        data: [{ date: '2026-01-01', count: 10, unique_users: 3 }],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', measure: 'unique_users' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.trendData.length).toBe(1))
      // data normalised under 'count' key, unique_users value used
      expect(result.current.trendData[0]).toMatchObject({ count: 3 })
      expect(result.current.measureKey).toBe('count')
      expect(fetchPivot).not.toHaveBeenCalled()
    })

    it('uses fetchPivot for non-standard measure (sum:total_amount)', async () => {
      vi.mocked(fetchPivot).mockResolvedValue({
        dimensions: ['date'],
        measures: ['sum:total_amount'],
        data: [{ date: '2026-01-01', sum_total_amount: 500 }],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () =>
          useTrendData({
            dateRange,
            selectedEvent: '',
            granularity: 'day',
            measure: 'sum:total_amount',
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.trendData.length).toBe(1))
      expect(fetchPivot).toHaveBeenCalledWith(
        expect.objectContaining({ measures: ['sum:total_amount'] })
      )
      expect(result.current.trendData[0]).toMatchObject({ count: 500 })
      expect(result.current.measureKey).toBe('count')
    })

    it('includes measure in the pivot query key', async () => {
      vi.mocked(fetchPivot).mockResolvedValue({ dimensions: ['date'], measures: ['sum:quantity'], data: [] })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      renderHook(
        () =>
          useTrendData({
            dateRange,
            selectedEvent: '',
            granularity: 'day',
            measure: 'sum:quantity',
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(fetchPivot).toHaveBeenCalled())
      // Verify the hook passes measure to fetchPivot correctly
      expect(fetchPivot).toHaveBeenCalledWith(
        expect.objectContaining({ measures: ['sum:quantity'], row_dimensions: ['date'] })
      )
    })

    it('breakdown + non-standard measure: reads correct row key', async () => {
      vi.mocked(fetchPivot).mockResolvedValue({
        dimensions: ['date', 'device_type'],
        measures: ['sum:total_amount'],
        data: [
          { date: '2026-01-01', device_type: 'mobile', sum_total_amount: 200 },
          { date: '2026-01-01', device_type: 'desktop', sum_total_amount: 300 },
        ],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () =>
          useTrendData({
            dateRange,
            selectedEvent: '',
            granularity: 'day',
            breakdownDimension: 'device_type',
            measure: 'sum:total_amount',
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.trendData.length).toBe(1))
      expect(result.current.trendData[0]).toMatchObject({ mobile: 200, desktop: 300 })
    })
  })
  ```

- [ ] **Step 2: Run to confirm failures**

  ```bash
  npm run test:run -- frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts 2>&1 | tail -12
  ```
  Expected: new tests fail — `measure` param and `measureKey` don't exist yet.

### Step 4b — implement

- [ ] **Step 3: Update interfaces and hook body**

  Replace `useTrendData.ts` with the following (full file):

  ```ts
  import { useMemo } from 'react'
  import { useQuery } from '@tanstack/react-query'
  import { format } from 'date-fns'
  import { fetchTrend, fetchEvents, fetchPivot } from '@/lib/api'
  import { useAppStore } from '@/stores'
  import type { DateRange } from '@/types'

  export interface TrendDataItem {
    date: string
    fullDate: string
    count: number
  }

  export interface UseTrendDataOptions {
    dateRange: DateRange
    selectedEvent: string
    granularity: 'day' | 'week'
    breakdownDimension?: string | null
    measure?: string
  }

  export interface UseTrendDataReturn {
    trendData: Array<Record<string, unknown>>
    events: string[]
    isLoading: boolean
    isError: boolean
    error: Error | null
    eventsLoading: boolean
    totalEvents: number
    averageValue: number
    maxValue: number
    seriesKeys: string[] | null
    measureKey: string
  }

  /** Top-N cap for stacked series. Values beyond this are merged into "(other)". */
  const MAX_SERIES = 8

  /** Derive the row key used in pivot response rows for a given measure string. */
  function measureRowKey(measure: string): string {
    return measure.includes(':') ? measure.replace(':', '_') : measure
  }

  export function useTrendData({
    dateRange,
    selectedEvent,
    granularity,
    breakdownDimension = null,
    measure = 'count_events',
  }: UseTrendDataOptions): UseTrendDataReturn {
    const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
    const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
    const { activeFilters, activeConnectionId } = useAppStore()

    const usePivot = !!breakdownDimension || measure !== 'count_events'

    // ── Events list (always needed for the event selector) ───────────────────
    const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
      queryKey: ['events', activeConnectionId],
      queryFn: () => fetchEvents(activeConnectionId ?? undefined),
      staleTime: 5 * 60 * 1000,
    })

    // ── Trend query (count_events, no breakdown) ──────────────────────────────
    const {
      data: trendResponse,
      isLoading: trendLoading,
      isError: trendIsError,
      error: trendError,
    } = useQuery({
      queryKey: [
        'trend',
        selectedEvent,
        granularity,
        startDate,
        endDate,
        activeFilters,
        activeConnectionId,
        measure,
      ],
      queryFn: () =>
        fetchTrend({
          event_name: selectedEvent || undefined,
          granularity,
          start_date: startDate,
          end_date: endDate,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        }),
      enabled: !usePivot && !!startDate && !!endDate,
      staleTime: 5 * 60 * 1000,
    })

    // ── Pivot query (breakdown OR non-default measure) ────────────────────────
    const pivotRowDims = breakdownDimension ? ['date', breakdownDimension] : ['date']

    const {
      data: pivotResponse,
      isLoading: pivotLoading,
      isError: pivotIsError,
      error: pivotError,
    } = useQuery({
      queryKey: [
        'trend-breakdown',
        breakdownDimension,
        measure,
        selectedEvent,
        startDate,
        endDate,
        activeFilters,
        activeConnectionId,
      ],
      queryFn: () =>
        fetchPivot({
          row_dimensions: pivotRowDims,
          measures: [measure],
          start_date: startDate,
          end_date: endDate,
          event_filter: selectedEvent || undefined,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        }),
      enabled: usePivot && !!startDate && !!endDate,
      staleTime: 5 * 60 * 1000,
    })

    // ── Transform: flat pivot rows → wide-format (breakdown) or single (no breakdown) ──
    const { stackedData, seriesKeys } = useMemo(() => {
      if (!usePivot || !pivotResponse?.data?.length) {
        return { stackedData: [], seriesKeys: null }
      }

      const rows = pivotResponse.data as Array<Record<string, unknown>>
      const rowKey = measureRowKey(measure)

      // No-breakdown pivot path: just normalise to { date, fullDate, count }
      if (!breakdownDimension) {
        const data = rows.map((row) => ({
          date: new Date(String(row['date'] ?? '')).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          fullDate: String(row['date'] ?? ''),
          count: Number(row[rowKey] ?? 0),
        }))
        return { stackedData: data, seriesKeys: null }
      }

      // Breakdown pivot path: flat → wide
      const totals: Record<string, number> = {}
      for (const row of rows) {
        const dimVal = String(row[breakdownDimension] ?? '(unknown)')
        const cnt = Number(row[rowKey] ?? 0)
        totals[dimVal] = (totals[dimVal] ?? 0) + cnt
      }

      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
      const topKeys = sorted.slice(0, MAX_SERIES).map(([k]) => k)
      const hasOther = sorted.length > MAX_SERIES

      const byDate = new Map<string, Record<string, unknown>>()
      for (const row of rows) {
        const rawDate = String(row['date'] ?? '')
        const dimVal = String(row[breakdownDimension] ?? '(unknown)')
        const cnt = Number(row[rowKey] ?? 0)
        const key = topKeys.includes(dimVal) ? dimVal : '(other)'

        if (!byDate.has(rawDate)) {
          const label = new Date(rawDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
          byDate.set(rawDate, { date: label, fullDate: rawDate })
        }

        const record = byDate.get(rawDate)!
        record[key] = Number(record[key] ?? 0) + cnt
      }

      const finalKeys = hasOther ? [...topKeys, '(other)'] : topKeys
      const data = Array.from(byDate.values()).sort((a, b) =>
        String(a.fullDate).localeCompare(String(b.fullDate))
      )
      return { stackedData: data, seriesKeys: finalKeys }
    }, [usePivot, breakdownDimension, measure, pivotResponse])

    // ── Non-pivot trend data ───────────────────────────────────────────────────
    const trendData = useMemo(() => {
      if (usePivot) return stackedData
      if (!trendResponse?.data) return []
      const field = measure === 'unique_users' ? 'unique_users' : 'count'
      return trendResponse.data.map((d) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: d.date,
        count: (d as Record<string, number>)[field] ?? d.count,
      }))
    }, [usePivot, trendResponse, stackedData, measure])

    // ── Metrics ──────────────────────────────────────────────────────────────
    const totalEvents = useMemo(() => {
      if (breakdownDimension && seriesKeys) {
        return trendData.reduce((acc, row) => {
          return acc + seriesKeys.reduce((s, k) => s + Number(row[k] ?? 0), 0)
        }, 0)
      }
      return (trendData as TrendDataItem[]).reduce((acc, d) => acc + d.count, 0)
    }, [trendData, breakdownDimension, seriesKeys])

    const averageValue = useMemo(
      () => (trendData.length > 0 ? Math.round(totalEvents / trendData.length) : 0),
      [trendData, totalEvents]
    )

    const maxValue = useMemo(() => {
      if (!trendData.length) return 0
      if (breakdownDimension && seriesKeys) {
        return Math.max(
          ...trendData.map((row) => seriesKeys.reduce((s, k) => s + Number(row[k] ?? 0), 0))
        )
      }
      return Math.max(...(trendData as TrendDataItem[]).map((d) => d.count))
    }, [trendData, breakdownDimension, seriesKeys])

    return {
      trendData,
      events: eventsResponse?.events || [],
      isLoading: usePivot ? pivotLoading : trendLoading,
      isError: usePivot ? pivotIsError : trendIsError,
      error: (usePivot ? pivotError : trendError) as Error | null,
      eventsLoading,
      totalEvents,
      averageValue,
      maxValue,
      seriesKeys: breakdownDimension ? seriesKeys : null,
      measureKey: 'count',
    }
  }
  ```

- [ ] **Step 4: Run tests**

  ```bash
  npm run test:run -- frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts 2>&1 | tail -12
  ```
  Expected: all 11 tests pass.

- [ ] **Step 5: Run full suite**

  ```bash
  npm run test:run 2>&1 | tail -8
  ```
  Expected: all green.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/frontend/features/analytics/trends/hooks/
  git commit -m "feat: add measure param to useTrendData with pivot path for non-default measures"
  ```

---

## Task 5: Add bar chart + `measureKey` to `TrendChart`

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/components/TrendChart.tsx`

- [ ] **Step 1: Replace the file content**

  ```tsx
  import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Brush,
  } from 'recharts'

  const SERIES_COLORS = [
    'hsl(262, 83%, 70%)',
    'hsl(199, 89%, 60%)',
    'hsl(142, 71%, 55%)',
    'hsl(32, 95%, 65%)',
    'hsl(346, 84%, 65%)',
    'hsl(221, 83%, 65%)',
    'hsl(0, 72%, 65%)',
    'hsl(174, 72%, 50%)',
  ]

  interface TrendChartProps {
    data: Array<Record<string, unknown>>
    chartType: 'area' | 'line' | 'bar'
    averageValue: number
    eventName: string
    seriesKeys: string[] | null
    measureKey?: string
  }

  function CustomTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
  }) {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  export function TrendChart({
    data,
    chartType,
    averageValue,
    eventName,
    seriesKeys,
    measureKey = 'count',
  }: TrendChartProps) {
    if (!data.length) {
      return (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      )
    }

    const chartProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    // ── Bar chart ─────────────────────────────────────────────────────────────
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              tickFormatter={(val) => val.toLocaleString()}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {seriesKeys ? (
              seriesKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="stack"
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                  name={key}
                />
              ))
            ) : (
              <Bar dataKey={measureKey} fill="hsl(var(--primary))" name={eventName || 'All Events'} />
            )}
          </BarChart>
        </ResponsiveContainer>
      )
    }

    // ── Stacked / multi-series mode (area or line) ────────────────────────────
    if (seriesKeys) {
      if (chartType === 'line') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tickFormatter={(val) => val.toLocaleString()}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {seriesKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )
      }

      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...chartProps}>
            <defs>
              {seriesKeys.map((key, i) => (
                <linearGradient key={key} id={`colorKey-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              tickFormatter={(val) => val.toLocaleString()}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {seriesKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="stack"
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#colorKey-${i})`}
                name={key}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    // ── Single-series mode ────────────────────────────────────────────────────
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              tickFormatter={(val) => val.toLocaleString()}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine
              y={averageValue}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />
            <Line
              type="monotone"
              dataKey={measureKey}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name={eventName || 'All Events'}
            />
            <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    // area (default single-series)
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...chartProps}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tickFormatter={(val) => val.toLocaleString()}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine
            y={averageValue}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            label={{
              value: `Avg: ${averageValue.toLocaleString()}`,
              position: 'right',
              fill: 'hsl(var(--muted-foreground))',
            }}
          />
          <Area
            type="monotone"
            dataKey={measureKey}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCount)"
            name={eventName || 'All Events'}
          />
          <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  ```

- [ ] **Step 2: Verify build**

  ```bash
  npm run build 2>&1 | grep "error TS"
  ```
  Expected: no output.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/frontend/features/analytics/trends/components/TrendChart.tsx
  git commit -m "feat: add bar chart type and measureKey prop to TrendChart"
  ```

---

## Task 6: Wire everything up in `TrendsPage`

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

- [ ] **Step 1: Replace the file content**

  Key changes from the current file:
  - Import `SelectGroup`, `SelectLabel` (for grouped Measure select)
  - Add `BarChart3` icon import rename to avoid collision (already imported as `BarChart3`)
  - Add `measure` state, reset it alongside `breakdownDimension` on connection change
  - Three-button chart type toggle (Area / Line / Bar)
  - Measure selector with two groups
  - Pass `measure` to `useTrendData`, pass `measureKey` to `TrendChart`

  ```tsx
  import { useState, useEffect } from 'react'
  import { useQuery } from '@tanstack/react-query'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { CardLoadingBar } from '@/components/ui/card-loading-bar'
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'
  import { PageTransition } from '@/components/layout/PageTransition'
  import { ChartSkeleton } from '@/components/ui/loading-state'
  import { QueryError } from '@/components/ui/query-error'
  import { EmptyState } from '@/components/ui/empty-state'
  import { TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
  import { useAppStore } from '@/stores'
  import { fetchPivotOptions } from '@/lib/api'
  import { useTrendData } from './hooks/useTrendData'
  import { TrendChart } from './components/TrendChart'
  import { SPACING, TYPOGRAPHY, ICON_SIZES } from '@/lib/constants'

  export function TrendsPage() {
    useEffect(() => {
      document.title = 'Trends — stratif.io'
    }, [])

    const { dateRange, activeConnectionId } = useAppStore()
    const [selectedEvent, setSelectedEvent] = useState<string>('')
    const [granularity, setGranularity] = useState<'day' | 'week'>('day')
    const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')
    const [breakdownDimension, setBreakdownDimension] = useState<string | null>(null)
    const [measure, setMeasure] = useState<string>('count_events')

    useEffect(() => {
      setBreakdownDimension(null)
      setMeasure('count_events')
    }, [activeConnectionId])

    const { data: pivotOptions } = useQuery({
      queryKey: ['pivot-options', activeConnectionId],
      queryFn: () => fetchPivotOptions(activeConnectionId ?? undefined),
      staleTime: 5 * 60 * 1000,
    })
    const dimensions = pivotOptions?.dimensions ?? []
    const standardMeasures = pivotOptions?.measures ?? []
    const numericDimensions = pivotOptions?.numeric_dimensions ?? []

    const {
      trendData,
      events,
      isLoading,
      isError,
      error,
      totalEvents,
      averageValue,
      maxValue,
      seriesKeys,
      measureKey,
    } = useTrendData({
      dateRange,
      selectedEvent,
      granularity,
      breakdownDimension,
      measure,
    })

    if (isError) return <QueryError error={error} />

    const measureIsNonDefault = measure !== 'count_events'

    return (
      <PageTransition>
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            <h1 className="sr-only">Trends</h1>
            <span className={TYPOGRAPHY.pageLabel}>Trend Analysis</span>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card hover="lift" className="col-span-2 lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={TYPOGRAPHY.label}>Total Events</CardTitle>
                  <TrendingUp className={`${ICON_SIZES.sm} text-muted-foreground`} />
                </CardHeader>
                <CardContent>
                  <div className={TYPOGRAPHY.metric}>{totalEvents.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card hover="lift" className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={TYPOGRAPHY.label}>Daily Average</CardTitle>
                  <BarChart3 className={`${ICON_SIZES.sm} text-muted-foreground`} />
                </CardHeader>
                <CardContent>
                  <div className={TYPOGRAPHY.metric}>{averageValue.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card hover="lift" className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={TYPOGRAPHY.label}>Daily Peak</CardTitle>
                  <LineChartIcon className={`${ICON_SIZES.sm} text-muted-foreground`} />
                </CardHeader>
                <CardContent>
                  <div className={TYPOGRAPHY.metric}>{maxValue.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="relative overflow-hidden">
              <CardLoadingBar loading={isLoading} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-end">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {/* Chart type toggle */}
                    <div className="flex items-center border rounded-md p-1">
                      <Button
                        variant={chartType === 'area' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('area')}
                        className="h-8"
                      >
                        Area
                      </Button>
                      <Button
                        variant={chartType === 'line' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('line')}
                        className="h-8"
                      >
                        Line
                      </Button>
                      <Button
                        variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('bar')}
                        className="h-8"
                      >
                        Bar
                      </Button>
                    </div>

                    {/* Event selector */}
                    <Select
                      value={selectedEvent || 'all'}
                      onValueChange={(val) => setSelectedEvent(val === 'all' ? '' : val)}
                    >
                      <SelectTrigger className="w-[min(180px,45vw)]">
                        <SelectValue placeholder="All Events" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        {events.map((event) => (
                          <SelectItem key={event} value={event}>
                            {event}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Granularity selector */}
                    <Select
                      value={granularity}
                      onValueChange={(val) => setGranularity(val as 'day' | 'week')}
                      disabled={!!breakdownDimension}
                    >
                      <SelectTrigger
                        className="w-[min(120px,35vw)]"
                        title={
                          breakdownDimension
                            ? 'Granularity is not available in breakdown mode'
                            : undefined
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Daily</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Measure selector */}
                    <Select value={measure} onValueChange={setMeasure}>
                      <SelectTrigger
                        className={`w-[min(200px,50vw)] ${measureIsNonDefault ? 'border-primary text-primary' : ''}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Standard</SelectLabel>
                          {standardMeasures.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {numericDimensions.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Numeric fields</SelectLabel>
                            {numericDimensions.flatMap((d) =>
                              (['sum', 'avg', 'min', 'max'] as const).map((agg) => (
                                <SelectItem key={`${agg}:${d.value}`} value={`${agg}:${d.value}`}>
                                  {agg.charAt(0).toUpperCase() + agg.slice(1)} of {d.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>

                    {/* Breakdown selector */}
                    {dimensions.length > 0 && (
                      <Select
                        value={breakdownDimension ?? 'none'}
                        onValueChange={(val) => setBreakdownDimension(val === 'none' ? null : val)}
                      >
                        <SelectTrigger
                          className={`w-[min(180px,45vw)] ${breakdownDimension ? 'border-primary text-primary' : ''}`}
                        >
                          <SelectValue placeholder="Break down by…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No breakdown</SelectItem>
                          {dimensions.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton height="h-[300px] sm:h-[380px] lg:h-[450px]" />
                ) : trendData.length === 0 ? (
                  <EmptyState
                    icon={TrendingUp}
                    title="No trend data available"
                    description="No events were recorded in this date range. Try widening the range or selecting a different event."
                    className="h-[300px] sm:h-[380px] lg:h-[450px]"
                  />
                ) : (
                  <div className="h-[300px] sm:h-[380px] lg:h-[450px]">
                    <TrendChart
                      data={trendData}
                      chartType={chartType}
                      averageValue={averageValue}
                      eventName={selectedEvent || 'All Events'}
                      seriesKeys={seriesKeys}
                      measureKey={measureKey}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    )
  }
  ```

- [ ] **Step 2: Verify build and tests**

  ```bash
  npm run build 2>&1 | grep "error TS"
  npm run test:run 2>&1 | tail -8
  npm run lint 2>&1 | tail -4
  ```
  Expected: no TS errors, all tests green, zero lint warnings.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/frontend/features/analytics/trends/TrendsPage.tsx
  git commit -m "feat: add Bar chart type, Measure selector, and three-button toggle to TrendsPage"
  ```

---

## Done

The feature is complete when:
- `npm run test:run` is all green
- `npm run lint` is clean
- `npm run build` succeeds
- Manually:
  - Area / Line / Bar toggle works; Bar renders stacked bars with breakdown, single bar without
  - Measure selector shows Event Count / Unique Users + numeric field aggregations (if configured)
  - Selecting `sum:total_amount` fires a pivot query and plots the aggregated values
  - Selecting a non-default measure highlights the selector trigger
  - Connection change resets both breakdown and measure to defaults
