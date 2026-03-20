import { QUERY_STALE_TIME } from '@/lib/constants'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchPaths, fetchEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import type { DateRange, PathData } from '@/types'

export interface UsePathsDataOptions {
  dateRange: DateRange
  targetEvent: string
  deviceType: string
}

export interface UsePathsDataReturn {
  pathData: PathData[]
  events: string[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  eventsLoading: boolean
  totalOccurrences: number
}

export function usePathsData({
  dateRange,
  targetEvent,
  deviceType,
}: UsePathsDataOptions): UsePathsDataReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
  const { activeConnectionId } = useAppStore()

  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
    staleTime: QUERY_STALE_TIME.default,
  })

  const { data: pathsResponse, isLoading, isError, error } = useQuery({
    queryKey: ['paths', targetEvent, deviceType, startDate, endDate, activeConnectionId],
    queryFn: () =>
      fetchPaths({
        target_event: targetEvent,
        device_type: deviceType || undefined,
        limit: 5,
        start_date: startDate,
        end_date: endDate,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!targetEvent && !!startDate && !!endDate,
    staleTime: QUERY_STALE_TIME.default,
  })

  const pathData = useMemo(() => pathsResponse?.data || [], [pathsResponse])

  return {
    pathData,
    events: eventsResponse?.events || [],
    isLoading,
    isError,
    error: error as Error | null,
    eventsLoading,
    totalOccurrences: pathsResponse?.total_occurrences || 0,
  }
}
