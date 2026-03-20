# Trend Stacked Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Break down by" dimension selector to the Trends page so the event count chart stacks by a chosen dimension (e.g. device type), using the existing `/api/pivot` endpoint.

**Architecture:** A new optional `breakdownDimension` param is added to `useTrendData`. When set, it calls `fetchPivot` (with a minor fix to add `connection_id`) and transforms the flat pivot rows into wide-format Recharts data. `TrendChart` is extended to render one stacked series per dimension value. `TrendsPage` adds the selector and loads filter field options.

**Tech Stack:** React 18, TypeScript, TanStack Query v5, Recharts, Zustand, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `apps/web/frontend/lib/api/queries.ts` | Add `connection_id` param to `fetchPivot` |
| `apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts` | Add breakdown branch (pivot query, flat→wide transform, `seriesKeys`) |
| `apps/web/frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts` | New test file |
| `apps/web/frontend/features/analytics/trends/components/TrendChart.tsx` | Widen data type, accept `seriesKeys`, render stacked series |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx` | Filter config query, breakdown state, "Break down by" select |

---

## Task 1: Add `connection_id` to `fetchPivot`

**Files:**
- Modify: `apps/web/frontend/lib/api/queries.ts`

- [ ] **Step 1: Open `queries.ts` and locate `fetchPivot` (line ~298)**

  The function currently accepts these params:
  ```ts
  row_dimensions, column_dimensions, measures, start_date, end_date, event_filter, filters
  ```
  It does **not** accept or forward `connection_id`.

- [ ] **Step 2: Add `connection_id` to the params and URLSearchParams**

  Change the params type and body to match every other fetch function:
  ```ts
  export const fetchPivot = (params: {
    row_dimensions: string[]
    column_dimensions?: string[]
    measures: string[]
    start_date?: string
    end_date?: string
    event_filter?: string
    filters?: Record<string, string | null>
    connection_id?: string          // ← add this
  }) => {
    const searchParams = new URLSearchParams()
    searchParams.set('row_dimensions', params.row_dimensions.join(','))
    searchParams.set('column_dimensions', (params.column_dimensions || []).join(','))
    searchParams.set('measures', params.measures.join(','))
    if (params.start_date) searchParams.set('start_date', params.start_date)
    if (params.end_date) searchParams.set('end_date', params.end_date)
    if (params.event_filter) searchParams.set('event_filter', params.event_filter)
    const f = serializeFilters(params.filters)
    if (f) searchParams.set('filters', f)
    if (params.connection_id) searchParams.set('connection_id', params.connection_id)  // ← add this

    return fetchApi<PivotResponse>(`/api/pivot?${searchParams}`)
  }
  ```

- [ ] **Step 3: Verify the build is clean**

  ```bash
  npm run build --workspace=apps/web
  ```
  Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/frontend/lib/api/queries.ts
  git commit -m "fix: add connection_id param to fetchPivot"
  ```

---

## Task 2: Extend `useTrendData` with breakdown support

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts`
- Create: `apps/web/frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts`

The hook needs to:
1. Accept an optional `breakdownDimension: string | null`
2. When set, call `fetchPivot` and transform the result; otherwise use existing `fetchTrend` path unchanged
3. Return `seriesKeys: string[] | null`

### Step 2a: Write the failing tests

- [ ] **Step 1: Create the test file**

  ```ts
  // apps/web/frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { renderHook, waitFor } from '@testing-library/react'
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
  import React from 'react'
  import { useTrendData } from '../useTrendData'

  vi.mock('@/lib/api', () => ({
    fetchTrend: vi.fn(),
    fetchEvents: vi.fn(),
    fetchPivot: vi.fn(),
  }))

  import { fetchTrend, fetchEvents, fetchPivot } from '@/lib/api'

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    return Wrapper
  }

  const dateRange = { from: new Date('2026-01-01'), to: new Date('2026-01-31') }

  describe('useTrendData — no breakdown', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('calls fetchTrend when breakdownDimension is null', async () => {
      vi.mocked(fetchTrend).mockResolvedValue({ total_unique_users: 10, data: [] })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: null }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(fetchTrend).toHaveBeenCalled())
      expect(fetchPivot).not.toHaveBeenCalled()
    })

    it('returns seriesKeys as null when no breakdown', async () => {
      vi.mocked(fetchTrend).mockResolvedValue({
        total_unique_users: 5,
        data: [{ date: '2026-01-01', count: 42, unique_users: 5 }],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: null }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.trendData.length).toBe(1))
      expect(result.current.seriesKeys).toBeNull()
    })
  })

  describe('useTrendData — with breakdown', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('calls fetchPivot (not fetchTrend) when breakdownDimension is set', async () => {
      vi.mocked(fetchPivot).mockResolvedValue({
        dimensions: ['date', 'device_type'],
        measures: ['event_count'],
        data: [],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(fetchPivot).toHaveBeenCalled())
      expect(fetchTrend).not.toHaveBeenCalled()
      expect(fetchPivot).toHaveBeenCalledWith(expect.objectContaining({
        row_dimensions: ['date', 'device_type'],
        measures: ['event_count'],
      }))
    })

    it('transforms flat pivot rows into wide-format records', async () => {
      vi.mocked(fetchPivot).mockResolvedValue({
        dimensions: ['date', 'device_type'],
        measures: ['event_count'],
        data: [
          { date: '2026-01-01', device_type: 'mobile', event_count: 100 },
          { date: '2026-01-01', device_type: 'desktop', event_count: 200 },
          { date: '2026-01-02', device_type: 'mobile', event_count: 50 },
          { date: '2026-01-02', device_type: 'desktop', event_count: 150 },
        ],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.trendData.length).toBe(2))

      const jan1 = result.current.trendData[0]
      expect(jan1).toMatchObject({ mobile: 100, desktop: 200 })
      expect(jan1.fullDate).toBe('2026-01-01')
    })

    it('returns seriesKeys sorted by total count descending', async () => {
      vi.mocked(fetchPivot).mockResolvedValue({
        dimensions: ['date', 'device_type'],
        measures: ['event_count'],
        data: [
          { date: '2026-01-01', device_type: 'mobile', event_count: 300 },
          { date: '2026-01-01', device_type: 'desktop', event_count: 100 },
          { date: '2026-01-01', device_type: 'tablet', event_count: 50 },
        ],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.seriesKeys).not.toBeNull())
      expect(result.current.seriesKeys).toEqual(['mobile', 'desktop', 'tablet'])
    })

    it('caps series at 8 and merges the rest into (other)', async () => {
      const manyValues = Array.from({ length: 10 }, (_, i) => ({
        date: '2026-01-01',
        device_type: `value_${i}`,
        event_count: 100 - i,   // value_0 is highest
      }))
      vi.mocked(fetchPivot).mockResolvedValue({
        dimensions: ['date', 'device_type'],
        measures: ['event_count'],
        data: manyValues,
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.seriesKeys).not.toBeNull())
      // 8 top values + "(other)"
      expect(result.current.seriesKeys).toHaveLength(9)
      expect(result.current.seriesKeys).toContain('(other)')
    })

    it('computes maxValue as the max stacked total per date', async () => {
      vi.mocked(fetchPivot).mockResolvedValue({
        dimensions: ['date', 'device_type'],
        measures: ['event_count'],
        data: [
          { date: '2026-01-01', device_type: 'mobile', event_count: 100 },
          { date: '2026-01-01', device_type: 'desktop', event_count: 200 },  // total 300
          { date: '2026-01-02', device_type: 'mobile', event_count: 50 },
          { date: '2026-01-02', device_type: 'desktop', event_count: 50 },   // total 100
        ],
      })
      vi.mocked(fetchEvents).mockResolvedValue({ events: [] })

      const { result } = renderHook(
        () => useTrendData({ dateRange, selectedEvent: '', granularity: 'day', breakdownDimension: 'device_type' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.trendData.length).toBe(2))
      expect(result.current.maxValue).toBe(300)
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npm run test:run -- apps/web/frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts
  ```
  Expected: several failures — `breakdownDimension` param doesn't exist yet, `seriesKeys` not in return.

### Step 2b: Implement the breakdown logic

- [ ] **Step 3: Update `UseTrendDataOptions` and `UseTrendDataReturn` interfaces**

  In `useTrendData.ts`, update the interfaces:
  ```ts
  export interface UseTrendDataOptions {
    dateRange: DateRange
    selectedEvent: string
    granularity: 'day' | 'week'
    breakdownDimension?: string | null   // ← add (optional, defaults to null)
  }

  export interface UseTrendDataReturn {
    trendData: Array<Record<string, unknown>>  // ← widen from TrendDataItem[]
    events: string[]
    isLoading: boolean
    isError: boolean
    error: Error | null
    eventsLoading: boolean
    totalEvents: number
    averageValue: number
    maxValue: number
    seriesKeys: string[] | null            // ← add
  }
  ```

  Also update the exported `TrendDataItem` — it can stay for the non-breakdown path but `trendData` return type is widened.

- [ ] **Step 4: Add the pivot query branch to `useTrendData`**

  Replace the existing hook body with the version below. The `fetchTrend` path is **unchanged**; only the breakdown branch is new:

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
  }

  /** Top-N cap for stacked series. Values beyond this are merged into "(other)". */
  const MAX_SERIES = 8

  export function useTrendData({
    dateRange,
    selectedEvent,
    granularity,
    breakdownDimension = null,
  }: UseTrendDataOptions): UseTrendDataReturn {
    const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
    const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
    const { activeFilters, activeConnectionId } = useAppStore()

    // ── Events list (always needed for the event selector) ───────────────────
    const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
      queryKey: ['events', activeConnectionId],
      queryFn: () => fetchEvents(activeConnectionId ?? undefined),
      staleTime: 5 * 60 * 1000,
    })

    // ── Trend query (no breakdown) ────────────────────────────────────────────
    const {
      data: trendResponse,
      isLoading: trendLoading,
      isError: trendIsError,
      error: trendError,
    } = useQuery({
      queryKey: ['trend', selectedEvent, granularity, startDate, endDate, activeFilters, activeConnectionId],
      queryFn: () =>
        fetchTrend({
          event_name: selectedEvent || undefined,
          granularity,
          start_date: startDate,
          end_date: endDate,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        }),
      enabled: !breakdownDimension && !!startDate && !!endDate,
      staleTime: 5 * 60 * 1000,
    })

    // ── Pivot / breakdown query ───────────────────────────────────────────────
    const {
      data: pivotResponse,
      isLoading: pivotLoading,
      isError: pivotIsError,
      error: pivotError,
    } = useQuery({
      queryKey: [
        'trend-breakdown',
        breakdownDimension,
        selectedEvent,
        startDate,
        endDate,
        activeFilters,
        activeConnectionId,
      ],
      queryFn: () =>
        fetchPivot({
          row_dimensions: ['date', breakdownDimension!],
          measures: ['event_count'],
          start_date: startDate,
          end_date: endDate,
          event_filter: selectedEvent || undefined,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        }),
      enabled: !!breakdownDimension && !!startDate && !!endDate,
      staleTime: 5 * 60 * 1000,
    })

    // ── Transform: flat pivot rows → wide-format records ─────────────────────
    const { stackedData, seriesKeys } = useMemo(() => {
      if (!breakdownDimension || !pivotResponse?.data?.length) {
        return { stackedData: [], seriesKeys: null }
      }

      const rows = pivotResponse.data as Array<Record<string, unknown>>

      // Count totals per dimension value to determine top-N
      const totals: Record<string, number> = {}
      for (const row of rows) {
        const dimVal = String(row[breakdownDimension] ?? '(unknown)')
        const cnt = Number(row['event_count'] ?? 0)
        totals[dimVal] = (totals[dimVal] ?? 0) + cnt
      }

      // Sort by total desc, cap at MAX_SERIES
      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
      const topKeys = sorted.slice(0, MAX_SERIES).map(([k]) => k)
      const hasOther = sorted.length > MAX_SERIES

      // Group rows by date
      const byDate = new Map<string, Record<string, unknown>>()
      for (const row of rows) {
        const rawDate = String(row['date'] ?? '')
        const dimVal = String(row[breakdownDimension] ?? '(unknown)')
        const cnt = Number(row['event_count'] ?? 0)
        const key = topKeys.includes(dimVal) ? dimVal : '(other)'

        if (!byDate.has(rawDate)) {
          const label = new Date(rawDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
          byDate.set(rawDate, { date: label, fullDate: rawDate })
        }

        const record = byDate.get(rawDate)!
        record[key] = (Number(record[key] ?? 0)) + cnt
      }

      const finalKeys = hasOther ? [...topKeys, '(other)'] : topKeys
      const data = Array.from(byDate.values()).sort((a, b) =>
        String(a.fullDate).localeCompare(String(b.fullDate))
      )

      return { stackedData: data, seriesKeys: finalKeys }
    }, [breakdownDimension, pivotResponse])

    // ── Non-breakdown trend data (existing logic, unchanged) ─────────────────
    const trendData = useMemo(() => {
      if (breakdownDimension) return stackedData
      if (!trendResponse?.data) return []
      return trendResponse.data.map((d) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: d.date,
        count: d.count,
      }))
    }, [breakdownDimension, trendResponse, stackedData])

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
        // Max of the stacked total per date
        return Math.max(
          ...trendData.map((row) => seriesKeys.reduce((s, k) => s + Number(row[k] ?? 0), 0))
        )
      }
      return Math.max(...(trendData as TrendDataItem[]).map((d) => d.count))
    }, [trendData, breakdownDimension, seriesKeys])

    return {
      trendData,
      events: eventsResponse?.events || [],
      isLoading: breakdownDimension ? pivotLoading : trendLoading,
      isError: breakdownDimension ? pivotIsError : trendIsError,
      error: (breakdownDimension ? pivotError : trendError) as Error | null,
      eventsLoading,
      totalEvents,
      averageValue,
      maxValue,
      seriesKeys: breakdownDimension ? seriesKeys : null,
    }
  }
  ```

- [ ] **Step 5: Run tests — all should pass**

  ```bash
  npm run test:run -- apps/web/frontend/features/analytics/trends/hooks/__tests__/useTrendData.test.ts
  ```
  Expected: all green.

- [ ] **Step 6: Run full test suite to check for regressions**

  ```bash
  npm run test:run
  ```
  Expected: no new failures.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/web/frontend/features/analytics/trends/hooks/
  git commit -m "feat: add breakdown dimension support to useTrendData"
  ```

---

## Task 3: Update `TrendChart` to render stacked series

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/components/TrendChart.tsx`

- [ ] **Step 1: Add the `SERIES_COLORS` palette and update props**

  Replace the file content with the version below. Key changes:
  - Widen `data` prop type to `Array<Record<string, unknown>>`
  - Add `seriesKeys: string[] | null` prop
  - When `seriesKeys` is provided, render stacked `<Area>`/`<Line>` per key (no `ReferenceLine`, no `Brush`)
  - When `seriesKeys` is null, render exactly as before

  ```ts
  import {
    LineChart,
    Line,
    AreaChart,
    Area,
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
    chartType: 'area' | 'line'
    averageValue: number
    eventName: string
    seriesKeys: string[] | null
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

  export function TrendChart({ data, chartType, averageValue, eventName, seriesKeys }: TrendChartProps) {
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

    // ── Stacked mode ─────────────────────────────────────────────────────────
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

    // ── Single-series mode (unchanged) ───────────────────────────────────────
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
              dataKey="count"
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
            dataKey="count"
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

- [ ] **Step 2: Verify TypeScript**

  ```bash
  npm run build --workspace=apps/web
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/frontend/features/analytics/trends/components/TrendChart.tsx
  git commit -m "feat: TrendChart supports stacked multi-series rendering"
  ```

---

## Task 4: Wire up the UI in `TrendsPage`

**Files:**
- Modify: `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

- [ ] **Step 1: Add filter config query, breakdown state, and pass new props**

  Replace the file with the updated version:

  ```tsx
  import { useState, useEffect } from 'react'
  import { useQuery } from '@tanstack/react-query'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { CardLoadingBar } from '@/components/ui/card-loading-bar'
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'
  import { PageTransition } from '@/components/layout/PageTransition'
  import { ChartSkeleton } from '@/components/ui/loading-state'
  import { QueryError } from '@/components/ui/query-error'
  import { EmptyState } from '@/components/ui/empty-state'
  import { TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
  import { useAppStore } from '@/stores'
  import { fetchFilterConfig } from '@/lib/api'
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
    const [chartType, setChartType] = useState<'area' | 'line'>('area')
    const [breakdownDimension, setBreakdownDimension] = useState<string | null>(null)

    // Reset breakdown when connection changes
    useEffect(() => {
      setBreakdownDimension(null)
    }, [activeConnectionId])

    // Load filter fields for the "Break down by" selector
    const { data: filterConfig } = useQuery({
      queryKey: ['filter-config', activeConnectionId],
      queryFn: () => fetchFilterConfig(activeConnectionId!),
      enabled: !!activeConnectionId,
    })
    const filterFields = filterConfig?.filter_fields ?? []

    const { trendData, events, isLoading, isError, error, totalEvents, averageValue, maxValue, seriesKeys } =
      useTrendData({
        dateRange,
        selectedEvent,
        granularity,
        breakdownDimension,
      })

    if (isError) return <QueryError error={error} />

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
                    </div>
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
                    <Select
                      value={granularity}
                      onValueChange={(val) => setGranularity(val as 'day' | 'week')}
                      disabled={!!breakdownDimension}
                    >
                      <SelectTrigger
                        className="w-[min(120px,35vw)]"
                        title={breakdownDimension ? 'Granularity is not available in breakdown mode' : undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Daily</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    {filterFields.length > 0 && (
                      <Select
                        value={breakdownDimension ?? 'none'}
                        onValueChange={(val) => setBreakdownDimension(val === 'none' ? null : val)}
                      >
                        <SelectTrigger className={`w-[min(180px,45vw)] ${breakdownDimension ? 'border-primary text-primary' : ''}`}>
                          <SelectValue placeholder="Break down by…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No breakdown</SelectItem>
                          {filterFields.map((f) => (
                            <SelectItem key={f.field} value={f.field}>
                              {f.label}
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

- [ ] **Step 2: Verify build and types**

  ```bash
  npm run build --workspace=apps/web
  ```
  Expected: no errors.

- [ ] **Step 3: Run full test suite**

  ```bash
  npm run test:run
  ```
  Expected: all green.

- [ ] **Step 4: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero warnings.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/frontend/features/analytics/trends/TrendsPage.tsx
  git commit -m "feat: add Break down by dimension selector to Trends page"
  ```

---

## Done

The feature is complete when:
- `npm run test:run` is green
- `npm run lint` is clean
- `npm run build` succeeds
- Manually: selecting a dimension in the Trends page chart header stacks the chart by that dimension's values; selecting "No breakdown" restores the original single-series view
