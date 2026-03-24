import { useQuery, useQueries } from '@tanstack/react-query'
import { subDays, differenceInDays } from 'date-fns'
import { fetchMissionControlMetric, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { formatDateParam } from '@/lib/utils'
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
  metricLoading: Record<MetricKey, boolean>
  isError: boolean
  error: Error | null
  topEvents: Array<{ name: string; count: number }>
  eventsLoading: boolean
}

export function useMissionControl({
  dateRange,
}: UseMissionControlOptions): UseMissionControlReturn {
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : undefined
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const enabled = !!activeConnectionId && !!startDate && !!endDate

  // Previous period calculation (same as useMissionControlTrends)
  const periodDays =
    dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0
  const prevEndDate = dateRange.from
    ? formatDateParam(subDays(dateRange.from, 1))
    : undefined
  const prevStartDate =
    dateRange.from && periodDays > 0
      ? formatDateParam(subDays(dateRange.from, periodDays))
      : undefined

  // 8 per-metric queries run in parallel
  const metricResults = useQueries({
    queries: METRICS.map((metric) => ({
      queryKey: [
        'missionControlMetric',
        metric,
        startDate,
        endDate,
        activeFilters,
        activeConnectionId,
      ],
      queryFn: () =>
        fetchMissionControlMetric({
          metric,
          start_date: startDate,
          end_date: endDate,
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

  // Per-metric loading map — each card uses its own flag
  const metricLoading = Object.fromEntries(
    METRICS.map((metric, i) => [metric, metricResults[i].isLoading])
  ) as Record<MetricKey, boolean>

  // Build data progressively: populate resolved metrics immediately, use 0 for still-loading ones.
  // data is undefined only when queries are disabled (no connection / no dates).
  const data: MissionControlResponse | undefined = enabled
    ? {
        period: { start_date: startDate, end_date: endDate },
        previous_period: {
          start_date: prevStartDate,
          end_date: prevEndDate,
        },
        current: Object.fromEntries(
          METRICS.map((metric, i) => [metric, metricResults[i].data?.current ?? 0])
        ) as Record<MetricKey, number>,
        previous: Object.fromEntries(
          METRICS.map((metric, i) => [metric, metricResults[i].data?.previous ?? null])
        ) as Record<MetricKey, number | null>,
      }
    : undefined

  return {
    data,
    isLoading,
    metricLoading,
    isError,
    error,
    topEvents: topEventsData?.data ?? [],
    eventsLoading,
  }
}
