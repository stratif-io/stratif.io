import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchMissionControl, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { DateRange, MissionControlResponse } from '@/types'

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
    topEvents: topEventsData?.data ?? [],
    eventsLoading,
  }
}
