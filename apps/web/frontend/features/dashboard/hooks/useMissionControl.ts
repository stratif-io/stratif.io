import { useQuery, useQueries } from '@tanstack/react-query'
import { subDays, differenceInDays } from 'date-fns'
import { fetchMissionControlMetric, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { formatDateParam } from '@/lib/utils'
import { QUERY_STALE_TIME } from '@/lib/constants'
import { useSchemaConfig } from '@/features/connections/hooks/useConnectionsData'
import { METRIC_LABELS } from './missionControlMetrics'
import type { DateRange, MissionControlResponse } from '@/types'

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

type MetricKey = (typeof METRICS)[number]

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

  // Previous period calculation
  const periodDays =
    dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0
  const prevEndDate = dateRange.from ? formatDateParam(subDays(dateRange.from, 1)) : undefined
  const prevStartDate =
    dateRange.from && periodDays > 0
      ? formatDateParam(subDays(dateRange.from, periodDays))
      : undefined

  // One request per metric — allows progressive card rendering and stays within per-query timeout
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
        fetchMissionControlMetric(
          {
            metric,
            start_date: startDate,
            end_date: endDate,
            filters: activeFilters,
            connection_id: activeConnectionId ?? undefined,
          },
          {
            groupKey: `mc:${metric}`,
            timeoutMs,
            meta: {
              cardName: METRIC_LABELS[metric] ?? metric,
              querySnippet: `mission-control/metric metric=${metric}`,
            },
          }
        ),
      enabled,
      staleTime: QUERY_STALE_TIME.default,
    })),
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

  const isLoading = metricResults.some((r) => r.isLoading)
  const isError = metricResults.some((r) => r.isError)
  const error = (metricResults.find((r) => r.error)?.error as Error | null) ?? null

  // Per-metric loading map — each card uses its own flag for progressive rendering
  const metricLoading = Object.fromEntries(
    METRICS.map((metric, i) => [metric, metricResults[i].isLoading])
  ) as Record<MetricKey, boolean>

  // Per-metric SQL map
  const metricSql = Object.fromEntries(
    METRICS.map((metric, i) => [metric, metricResults[i].data?.sql ?? null])
  ) as Record<MetricKey, string | string[] | null>

  // Build data progressively: populate resolved metrics immediately, 0 for still-loading ones.
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

  const refetch = () => {
    metricResults.forEach((r) => {
      if (r.isError) r.refetch()
    })
  }

  return {
    data,
    isLoading,
    metricLoading,
    metricSql,
    isError,
    error,
    topEvents: topEventsData?.data ?? [],
    eventsLoading,
    topEventsSql: topEventsData?.sql,
    timeoutSeconds: Math.round(timeoutMs / 1000),
    refetch,
  }
}
