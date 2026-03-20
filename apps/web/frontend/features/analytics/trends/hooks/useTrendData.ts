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
  localFilters?: Record<string, string[]>
}

const GRANULARITY_DIM = { day: 'date', week: 'week' } as const

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
  localFilters,
}: UseTrendDataOptions): UseTrendDataReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
  const { activeFilters, activeConnectionId } = useAppStore()
  // Serialize localFilters (string[]) to pipe-joined strings and merge with global filters
  const serializedLocal: Record<string, string | null> = {}
  if (localFilters) {
    for (const [field, values] of Object.entries(localFilters)) {
      if (values.length > 0) serializedLocal[field] = values.join('|')
    }
  }
  const mergedFilters = localFilters ? { ...activeFilters, ...serializedLocal } : activeFilters

  const usePivot = !!breakdownDimension || (measure !== 'count_events' && measure !== 'unique_users')

  // ── Events list (always needed for the event selector) ───────────────────
  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
    staleTime: 5 * 60 * 1000,
  })

  // ── Trend query (count_events or unique_users, no breakdown) ──────────────
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
      mergedFilters,
      activeConnectionId,
      measure,
    ],
    queryFn: () =>
      fetchTrend({
        event_name: selectedEvent || undefined,
        granularity,
        start_date: startDate,
        end_date: endDate,
        filters: mergedFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !usePivot && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  })

  // ── Pivot query (breakdown OR non-default measure) ────────────────────────
  const dateDim = GRANULARITY_DIM[granularity]
  const pivotRowDims = breakdownDimension ? [dateDim, breakdownDimension] : [dateDim]

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
      granularity,
      selectedEvent,
      startDate,
      endDate,
      mergedFilters,
      activeConnectionId,
    ],
    queryFn: () =>
      fetchPivot({
        row_dimensions: pivotRowDims,
        measures: [measure],
        start_date: startDate,
        end_date: endDate,
        event_filter: selectedEvent || undefined,
        filters: mergedFilters,
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
      const data = rows
        .map((row) => ({
          date: new Date(String(row[dateDim] ?? '')).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          fullDate: String(row[dateDim] ?? ''),
          count: Number(row[rowKey] ?? 0),
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
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
      const rawDate = String(row[dateDim] ?? '')
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
  }, [usePivot, breakdownDimension, measure, dateDim, pivotResponse])

  // ── Non-pivot trend data ───────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (usePivot) return stackedData
    if (!trendResponse?.data) return []
    const field = measure === 'unique_users' ? 'unique_users' : 'count'
    return trendResponse.data.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: d.date,
      count: (d as unknown as Record<string, number>)[field] ?? d.count,
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
