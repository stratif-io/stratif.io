import { useQuery } from '@tanstack/react-query'
import { subDays, differenceInDays } from 'date-fns'
import { fetchMissionControl, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { formatDateParam } from '@/lib/utils'
import { QUERY_STALE_TIME } from '@/lib/constants'
import { useSchemaConfig } from '@/features/connections/hooks/useConnectionsData'
import type { DateRange, MissionControlResponse } from '@/types'

type MetricKey =
  | 'total_events'
  | 'unique_users'
  | 'total_sessions'
  | 'avg_session_duration_sec'
  | 'avg_events_per_session'
  | 'new_users'
  | 'returning_users'
  | 'resurrected_users'
  | 'churned_users'
  | 'retention_rate'
  | 'wau'
  | 'avg_active_days'
  | 'power_users'
  | 'dau_mau_ratio'

const ALL_METRICS: MetricKey[] = [
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
]

export interface UseMissionControlOptions {
  dateRange: DateRange
}

export interface UseMissionControlReturn {
  data: MissionControlResponse | undefined
  isLoading: boolean
  metricLoading: Record<MetricKey, boolean>
  metricSql: Record<MetricKey, string | string[] | null>
  isError: boolean
  error: Error | null
  topEvents: Array<{ name: string; count: number }>
  eventsLoading: boolean
  topEventsSql: string | string[] | undefined
  timeoutSeconds: number
  refetch: () => void
}

export function useMissionControl({
  dateRange,
}: UseMissionControlOptions): UseMissionControlReturn {
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : undefined
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : undefined
  const { activeFilters, activeConnectionId } = useAppStore()
  const { data: schemaConfig } = useSchemaConfig(activeConnectionId ?? '')
  const timeoutMs = (schemaConfig?.query_timeout_seconds ?? 10) * 1000

  const enabled = !!activeConnectionId

  // Previous period (used to populate MissionControlResponse shape when all-time)
  const periodDays =
    dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0
  const prevEndDate = dateRange.from ? formatDateParam(subDays(dateRange.from, 1)) : undefined
  const prevStartDate =
    dateRange.from && periodDays > 0
      ? formatDateParam(subDays(dateRange.from, periodDays))
      : undefined

  // Single aggregate call — replaces 14 per-metric calls
  const {
    data: aggregateData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['missionControlAggregate', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchMissionControl(
        {
          start_date: startDate ?? '',
          end_date: endDate ?? '',
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        },
        {
          groupKey: 'mc:aggregate',
          timeoutMs,
          meta: { cardName: 'Mission Control', querySnippet: 'mission-control aggregate' },
        }
      ),
    enabled,
    staleTime: QUERY_STALE_TIME.default,
  })

  const { data: topEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['topEvents', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchTopEvents(
        {
          limit: 5,
          start_date: startDate,
          end_date: endDate,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        },
        { meta: { cardName: 'Top Events', querySnippet: 'top events by volume' } }
      ),
    enabled,
    staleTime: QUERY_STALE_TIME.default,
  })

  // All metric cards share the same loading state (single request)
  const metricLoading = Object.fromEntries(ALL_METRICS.map((m) => [m, isLoading])) as Record<
    MetricKey,
    boolean
  >

  // Aggregate endpoint does not return per-metric SQL — trend SQL still appears via useMissionControlTrends
  const metricSql = Object.fromEntries(ALL_METRICS.map((m) => [m, null])) as Record<
    MetricKey,
    string | string[] | null
  >

  // Shape the aggregate response into MissionControlResponse, filling zeros while loading
  const data: MissionControlResponse | undefined = enabled
    ? (aggregateData ?? {
        period: { start_date: startDate, end_date: endDate },
        previous_period: { start_date: prevStartDate, end_date: prevEndDate },
        current: Object.fromEntries(ALL_METRICS.map((m) => [m, 0])) as Record<MetricKey, number>,
        previous: Object.fromEntries(ALL_METRICS.map((m) => [m, null])) as Record<
          MetricKey,
          number | null
        >,
      })
    : undefined

  return {
    data,
    isLoading,
    metricLoading,
    metricSql,
    isError,
    error: (error as Error | null) ?? null,
    topEvents: topEventsData?.data ?? [],
    eventsLoading,
    topEventsSql: topEventsData?.sql,
    timeoutSeconds: Math.round(timeoutMs / 1000),
    refetch: () => {
      if (isError) void refetch()
    },
  }
}
