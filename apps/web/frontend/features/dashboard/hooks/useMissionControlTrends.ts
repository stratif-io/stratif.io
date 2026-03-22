import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchMissionControlTrend } from '@/lib/api'
import { useAppStore } from '@/stores'
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
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const enabled = !!activeConnectionId && !!startDate && !!endDate

  // 8 unconditional useQuery calls — Rules of Hooks requires consistent call order.
  // All share the same enabled flag and staleTime; TanStack Query deduplicates cache.
  // Array length is fixed at compile time via `as const`, so hook call count never changes at runtime.
  const results = METRICS.map((metric) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
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
          start_date: startDate!,
          end_date: endDate!,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        }),
      enabled,
      staleTime: QUERY_STALE_TIME.default,
    })
  )

  const trends = Object.fromEntries(
    METRICS.map((metric, i) => [
      metric,
      {
        values: results[i].data?.data.map((d) => d.value) ?? [],
        loading: results[i].isLoading,
      },
    ])
  ) as Record<TrendMetric, MetricTrend>

  return { trends }
}
