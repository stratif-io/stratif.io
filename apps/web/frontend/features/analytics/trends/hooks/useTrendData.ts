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
        measures: ['count_events'],
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
      const cnt = Number(row['count_events'] ?? 0)
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
      const cnt = Number(row['count_events'] ?? 0)
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
