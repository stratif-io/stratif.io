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
  const allResolved = metricResults.every((r) => r.status === 'success')
  const data: MissionControlResponse | undefined = allResolved
    ? {
        period: { start_date: startDate!, end_date: endDate! },
        previous_period: {
          start_date: prevStartDate!,
          end_date: prevEndDate!,
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
