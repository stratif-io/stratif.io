import { useQueries } from '@tanstack/react-query'
import { subDays, differenceInDays } from 'date-fns'
import { fetchMissionControlTrend } from '@/lib/api'
import { useAppStore } from '@/stores'
import { formatDateParam } from '@/lib/utils'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { DateRange } from '@/types'

const METRICS = [
  'total_events',
  'unique_users',
  'total_sessions',
  'avg_session_duration_sec',
  'avg_events_per_session',
  'new_users',
  'returning_users',
  'resurrected_users',
  'churned_users',
  'retention_rate',
  'wau',
  'avg_active_days',
  'power_users',
  'dau_mau_ratio',
] as const

export type TrendMetric = (typeof METRICS)[number]

export interface MetricTrend {
  values: number[]
  dates: string[]
  previousValues: number[]
  previousDates: string[]
  loading: boolean
  sql?: string | string[]
}

export interface UseMissionControlTrendsReturn {
  trends: Record<TrendMetric, MetricTrend>
}

export function useMissionControlTrends({
  dateRange,
  visibleMetrics,
}: {
  dateRange: DateRange
  visibleMetrics?: string[]
}): UseMissionControlTrendsReturn {
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : undefined
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : undefined
  const { activeFilters, activeConnectionId, granularity } = useAppStore()

  // Calculate the previous period (same length, immediately before)
  const periodDays =
    dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0
  const prevEndDate = dateRange.from ? formatDateParam(subDays(dateRange.from, 1)) : undefined
  const prevStartDate =
    dateRange.from && periodDays > 0
      ? formatDateParam(subDays(dateRange.from, periodDays))
      : undefined

  // Queries are enabled whenever a connection is selected, with or without dates.
  // When no date range is set (all-time), start_date/end_date are omitted and
  // the backend returns data over all time.
  const enabled = !!activeConnectionId

  // Current period queries (indices 0..N-1)
  // Previous period queries (indices N..2N-1)
  const results = useQueries({
    queries: [
      ...METRICS.map((metric) => ({
        queryKey: [
          'missionControlTrend',
          metric,
          granularity,
          startDate,
          endDate,
          activeFilters,
          activeConnectionId,
        ],
        queryFn: () =>
          fetchMissionControlTrend({
            metric,
            granularity,
            start_date: startDate,
            end_date: endDate,
            filters: activeFilters,
            connection_id: activeConnectionId ?? undefined,
          }),
        enabled: enabled && (visibleMetrics == null || visibleMetrics.includes(metric)),
        staleTime: QUERY_STALE_TIME.default,
      })),
      ...METRICS.map((metric) => ({
        queryKey: [
          'missionControlTrend',
          metric,
          granularity,
          prevStartDate,
          prevEndDate,
          activeFilters,
          activeConnectionId,
        ],
        queryFn: () =>
          fetchMissionControlTrend({
            metric,
            granularity,
            start_date: prevStartDate!,
            end_date: prevEndDate!,
            filters: activeFilters,
            connection_id: activeConnectionId ?? undefined,
          }),
        enabled:
          enabled &&
          !!prevStartDate &&
          !!prevEndDate &&
          (visibleMetrics == null || visibleMetrics.includes(metric)),
        staleTime: QUERY_STALE_TIME.default,
      })),
    ],
  })

  const n = METRICS.length
  const trends = Object.fromEntries(
    METRICS.map((metric, i) => [
      metric,
      {
        values: results[i].data?.data.map((d) => d.value) ?? [],
        dates: results[i].data?.data.map((d) => d.date) ?? [],
        previousValues: results[n + i].data?.data.map((d) => d.value) ?? [],
        previousDates: results[n + i].data?.data.map((d) => d.date) ?? [],
        loading: results[i].isLoading,
        sql: [results[i].data?.sql, results[n + i].data?.sql]
          .flatMap((s) => (Array.isArray(s) ? s : s ? [s] : []))
          .filter(Boolean) as string[],
      },
    ])
  ) as Record<TrendMetric, MetricTrend>

  return { trends }
}
