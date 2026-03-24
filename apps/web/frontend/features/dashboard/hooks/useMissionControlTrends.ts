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
  'dau_mau_ratio',
] as const

export type TrendMetric = (typeof METRICS)[number]

export interface MetricTrend {
  values: number[]
  dates: string[]
  previousValues: number[]
  previousDates: string[]
  loading: boolean
}

export interface UseMissionControlTrendsReturn {
  trends: Record<TrendMetric, MetricTrend>
}

export function useMissionControlTrends({
  dateRange,
}: {
  dateRange: DateRange
}): UseMissionControlTrendsReturn {
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : undefined
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  // Calculate the previous period (same length, immediately before)
  const periodDays =
    dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0
  const prevEndDate = dateRange.from
    ? formatDateParam(subDays(dateRange.from, 1))
    : undefined
  const prevStartDate =
    dateRange.from && periodDays > 0
      ? formatDateParam(subDays(dateRange.from, periodDays))
      : undefined

  const enabled = !!activeConnectionId && !!startDate && !!endDate

  // Current period queries (indices 0..N-1)
  // Previous period queries (indices N..2N-1)
  const results = useQueries({
    queries: [
      ...METRICS.map((metric) => ({
        queryKey: [
          'missionControlTrend',
          metric,
          startDate,
          endDate,
          activeFilters,
          activeConnectionId,
        ],
        queryFn: () =>
          fetchMissionControlTrend({
            metric,
            start_date: startDate,
            end_date: endDate,
            filters: activeFilters,
            connection_id: activeConnectionId ?? undefined,
          }),
        enabled,
        staleTime: QUERY_STALE_TIME.default,
      })),
      ...METRICS.map((metric) => ({
        queryKey: [
          'missionControlTrend',
          metric,
          prevStartDate,
          prevEndDate,
          activeFilters,
          activeConnectionId,
        ],
        queryFn: () =>
          fetchMissionControlTrend({
            metric,
            start_date: prevStartDate!,
            end_date: prevEndDate!,
            filters: activeFilters,
            connection_id: activeConnectionId ?? undefined,
          }),
        enabled: enabled && !!prevStartDate && !!prevEndDate,
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
      },
    ])
  ) as Record<TrendMetric, MetricTrend>

  return { trends }
}
