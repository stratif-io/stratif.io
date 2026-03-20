import { QUERY_STALE_TIME } from '@/lib/constants'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchPathAnalysis, fetchEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import type { DateRange, PathAnalysisData } from '@/types'

export interface UsePathExplorerOptions {
  dateRange: DateRange
  startEvent: string | null
  endEvent: string | null
  minPathLength: number
  maxPathLength: number
  maxTimeBetweenEvents: number | null
  timeUnit: 'seconds' | 'minutes' | 'hours' | 'days'
  groupBy: 'user_id' | 'session_id'
  topN: number
}

export interface UsePathExplorerReturn {
  pathData: PathAnalysisData[]
  events: string[]
  isLoading: boolean
  eventsLoading: boolean
  totalPaths: number
}

export function usePathExplorer({
  dateRange,
  startEvent,
  endEvent,
  minPathLength,
  maxPathLength,
  maxTimeBetweenEvents,
  timeUnit,
  groupBy,
  topN,
}: UsePathExplorerOptions): UsePathExplorerReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
    staleTime: QUERY_STALE_TIME.default,
  })

  const { data: pathResponse, isLoading } = useQuery({
    queryKey: [
      'path-analysis',
      startEvent,
      endEvent,
      minPathLength,
      maxPathLength,
      maxTimeBetweenEvents,
      timeUnit,
      groupBy,
      topN,
      startDate,
      endDate,
      activeFilters,
      activeConnectionId,
    ],
    queryFn: () =>
      fetchPathAnalysis({
        start_event: startEvent || undefined,
        end_event: endEvent || undefined,
        min_path_length: minPathLength,
        max_path_length: maxPathLength,
        max_time_between_events: maxTimeBetweenEvents || undefined,
        time_unit: timeUnit,
        group_by: groupBy,
        top_n: topN,
        start_date: startDate,
        end_date: endDate,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!startDate && !!endDate,
    staleTime: QUERY_STALE_TIME.default,
  })

  const pathData = useMemo(() => pathResponse?.data || [], [pathResponse])

  return {
    pathData,
    events: eventsResponse?.events || [],
    isLoading,
    eventsLoading,
    totalPaths: pathResponse?.total_paths || 0,
  }
}
