import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchPaths, fetchEvents } from '@/lib/api'
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
  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => fetchEvents(),
  })

  const { data: pathsResponse, isLoading } = useQuery({
    queryKey: ['paths', targetEvent, deviceType, startDate, endDate],
    queryFn: () =>
      fetchPaths({
        target_event: targetEvent,
        device_type: deviceType || undefined,
        limit: 5,
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: !!targetEvent && !!startDate && !!endDate,
  })

  const pathData = useMemo(() => pathsResponse?.data || [], [pathsResponse])

  return {
    pathData,
    events: eventsResponse?.events || [],
    isLoading,
    eventsLoading,
    totalOccurrences: pathsResponse?.total_occurrences || 0,
  }
}
