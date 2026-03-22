import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchMissionControl, fetchMissionControlTrend, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { DateRange, MissionControlResponse, MissionControlTrendResponse } from '@/types'

export interface UseMissionControlOptions {
  dateRange: DateRange
  trendMetric?: string | null
}

export interface UseMissionControlReturn {
  data: MissionControlResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  trendData: MissionControlTrendResponse | undefined
  trendLoading: boolean
  topEvents: Array<{ name: string; count: number }>
  eventsLoading: boolean
}

export function useMissionControl({
  dateRange,
  trendMetric,
}: UseMissionControlOptions): UseMissionControlReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['missionControl', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchMissionControl({
        start_date: startDate!,
        end_date: endDate!,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!activeConnectionId && !!startDate && !!endDate,
    staleTime: QUERY_STALE_TIME.default,
  })

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: [
      'missionControlTrend',
      trendMetric,
      startDate,
      endDate,
      activeFilters,
      activeConnectionId,
    ],
    queryFn: () =>
      fetchMissionControlTrend({
        metric: trendMetric!,
        start_date: startDate!,
        end_date: endDate!,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!activeConnectionId && !!startDate && !!endDate && !!trendMetric,
    staleTime: QUERY_STALE_TIME.default,
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
    enabled: !!activeConnectionId && !!startDate && !!endDate,
    staleTime: QUERY_STALE_TIME.default,
  })

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    trendData,
    trendLoading,
    topEvents: topEventsData?.data ?? [],
    eventsLoading,
  }
}
