import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchTrend, fetchTopEvents, fetchConversion, fetchSessionsSummary } from '@/lib/api'
import { useAppStore } from '@/stores'
import type { DateRange } from '@/types'

export interface DashboardMetrics {
  totalEvents: number
  uniqueUsers: number
  totalSessions: number
  chartData: Array<{ day: string; events: number; users: number }>
  topEvents: Array<{ name: string; count: number }>
}

export interface UseDashboardMetricsOptions {
  dateRange: DateRange
}

export interface UseDashboardMetricsReturn {
  metrics: DashboardMetrics
  isLoading: boolean
  isError: boolean
  error: Error | null
  eventsLoading: boolean
}

export function useDashboardMetrics({
  dateRange,
}: UseDashboardMetricsOptions): UseDashboardMetricsReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data: currentTrend, isLoading: currentLoading, isError, error } = useQuery({
    queryKey: ['trend', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchTrend({
        start_date: startDate,
        end_date: endDate,
        granularity: 'day',
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
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
  })

  const { data: conversion } = useQuery({
    queryKey: ['conversion', startDate, endDate, activeConnectionId],
    queryFn: () =>
      fetchConversion({
        start_date: startDate,
        end_date: endDate,
        connection_id: activeConnectionId ?? undefined,
      }),
  })

  const { data: sessionsSummary } = useQuery({
    queryKey: ['sessionsSummary', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchSessionsSummary({
        start_date: startDate,
        end_date: endDate,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
  })

  const chartData = useMemo(() => {
    if (!currentTrend?.data) return []
    return currentTrend.data.map((d) => ({
      day: format(new Date(d.date), 'MMM d'),
      events: d.count,
      users: d.unique_users,
    }))
  }, [currentTrend])

  const metrics: DashboardMetrics = {
    totalEvents: currentTrend?.data?.reduce((acc, d) => acc + d.count, 0) || 0,
    uniqueUsers: currentTrend?.total_unique_users || 0,
    totalSessions: sessionsSummary?.data?.[0]?.total_sessions || 0,
    chartData,
    topEvents: topEventsData?.data || [],
  }

  return {
    metrics,
    isLoading: currentLoading,
    isError,
    error: error as Error | null,
    eventsLoading,
  }
}
