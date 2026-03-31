import { QUERY_STALE_TIME } from '@/lib/constants'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPivot, fetchEvents } from '@/lib/api'
import { formatDateParam } from '@/lib/utils'
import { useAppStore } from '@/stores'
import type { DateRange, Granularity } from '@/types'

export interface TrendDataItem {
  date: string
  fullDate: string
  count: number
}

export interface UseTrendDataOptions {
  dateRange: DateRange
  selectedEvent: string
  granularity: Granularity
  breakdownDimension?: string | null
  measure?: string
  localFilters?: Record<string, string[]>
}

/** Maps UI granularity value to the pivot row_dimension key. */
export function granularityToDim(granularity: Granularity): string {
  const map: Record<Granularity, string> = {
    hour: 'hour_bucket',
    day: 'date',
    week: 'week',
    month: 'month',
    quarter: 'quarter',
    year: 'year',
  }
  return map[granularity]
}

/** Format a raw date/timestamp string from pivot response for chart display. */
export function formatTrendDate(rawDate: string, granularity: Granularity): string {
  const d = new Date(rawDate)
  if (isNaN(d.getTime())) return rawDate

  if (granularity === 'hour') {
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const hour = String(d.getHours()).padStart(2, '0')
    return `${datePart}, ${hour}:00`
  }
  if (granularity === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (granularity === 'quarter') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${d.getFullYear()}`
  }
  if (granularity === 'year') {
    return String(d.getFullYear())
  }
  // day, week
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  sql: string | string[] | undefined
}

/** Top-N cap for stacked series. Values beyond this are merged into "(other)". */
const MAX_SERIES = 8

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
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : ''
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : ''
  const { activeFilters, activeConnectionId } = useAppStore()

  const serializedLocal: Record<string, string | null> = {}
  if (localFilters) {
    for (const [field, values] of Object.entries(localFilters)) {
      if (values.length > 0) serializedLocal[field] = values.join('|')
    }
  }
  const mergedFilters = localFilters ? { ...activeFilters, ...serializedLocal } : activeFilters

  const dateDim = granularityToDim(granularity)
  const pivotRowDims = breakdownDimension ? [dateDim, breakdownDimension] : [dateDim]

  // ── Events list ───────────────────────────────────────────────────────────
  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
    staleTime: QUERY_STALE_TIME.default,
  })

  // ── Pivot query (always) ──────────────────────────────────────────────────
  const {
    data: pivotResponse,
    isLoading: pivotLoading,
    isError: pivotIsError,
    error: pivotError,
  } = useQuery({
    queryKey: [
      'trend-pivot',
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
    staleTime: QUERY_STALE_TIME.default,
  })

  // ── Transform pivot rows ──────────────────────────────────────────────────
  const { trendData, seriesKeys } = useMemo(() => {
    if (!pivotResponse?.data?.length) return { trendData: [], seriesKeys: null }

    const rows = pivotResponse.data as Array<Record<string, unknown>>
    const rowKey = measureRowKey(measure)

    if (!breakdownDimension) {
      const data = rows
        .map((row) => ({
          date: formatTrendDate(String(row[dateDim] ?? ''), granularity),
          fullDate: String(row[dateDim] ?? ''),
          count: Number(row[rowKey] ?? 0),
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
      return { trendData: data, seriesKeys: null }
    }

    // Breakdown path: flat → wide
    const totals: Record<string, number> = {}
    for (const row of rows) {
      const dimVal = String(row[breakdownDimension] ?? '(unknown)')
      totals[dimVal] = (totals[dimVal] ?? 0) + Number(row[rowKey] ?? 0)
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
        byDate.set(rawDate, {
          date: formatTrendDate(rawDate, granularity),
          fullDate: rawDate,
        })
      }
      const record = byDate.get(rawDate)!
      record[key] = Number(record[key] ?? 0) + cnt
    }

    const finalKeys = hasOther ? [...topKeys, '(other)'] : topKeys
    const data = Array.from(byDate.values()).sort((a, b) =>
      String(a.fullDate).localeCompare(String(b.fullDate))
    )
    return { trendData: data, seriesKeys: finalKeys }
  }, [pivotResponse, measure, granularity, breakdownDimension, dateDim])

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalEvents = useMemo(() => {
    if (breakdownDimension && seriesKeys) {
      return trendData.reduce(
        (acc, row) => acc + seriesKeys.reduce((s, k) => s + Number(row[k] ?? 0), 0),
        0
      )
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
    isLoading: pivotLoading,
    isError: pivotIsError,
    error: pivotError as Error | null,
    eventsLoading,
    totalEvents,
    averageValue,
    maxValue,
    seriesKeys: breakdownDimension ? seriesKeys : null,
    measureKey: 'count',
    sql: pivotResponse?.sql,
  }
}
