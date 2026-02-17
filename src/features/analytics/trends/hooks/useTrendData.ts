import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchTrend, fetchEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import type { DateRange } from '@/types'

export interface TrendDataItem {
  date: string
  fullDate: string
  count: number
}

export interface UseTrendDataOptions {
  dateRange: DateRange
  selectedEvent: string
  granularity: 'day' | 'week'
}

export interface UseTrendDataReturn {
  trendData: TrendDataItem[]
  events: string[]
  isLoading: boolean
  eventsLoading: boolean
  totalEvents: number
  averageValue: number
  maxValue: number
}

export function useTrendData({
  dateRange,
  selectedEvent,
  granularity,
}: UseTrendDataOptions): UseTrendDataReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
  })

  const { data: trendResponse, isLoading } = useQuery({
    queryKey: [
      'trend',
      selectedEvent,
      granularity,
      startDate,
      endDate,
      activeFilters,
      activeConnectionId,
    ],
    queryFn: () =>
      fetchTrend({
        event_name: selectedEvent || undefined,
        granularity,
        start_date: startDate,
        end_date: endDate,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!startDate && !!endDate,
  })

  const trendData = useMemo(() => {
    if (!trendResponse?.data) return []
    return trendResponse.data.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: d.date,
      count: d.count,
    }))
  }, [trendResponse])

  const totalEvents = useMemo(() => trendData.reduce((acc, d) => acc + d.count, 0), [trendData])

  const averageValue = useMemo(
    () => (trendData.length > 0 ? Math.round(totalEvents / trendData.length) : 0),
    [trendData, totalEvents]
  )

  const maxValue = useMemo(
    () => (trendData.length > 0 ? Math.max(...trendData.map((d) => d.count)) : 0),
    [trendData]
  )

  return {
    trendData,
    events: eventsResponse?.events || [],
    isLoading,
    eventsLoading,
    totalEvents,
    averageValue,
    maxValue,
  }
}
