import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchTrend, fetchTopEvents, fetchSessionsSummary, fetchConversion } from '@/lib/api'
import type { DateRange } from '@/types'

export interface DashboardMetrics {
  totalEvents: number
  uniqueUsers: number
  avgDuration: number
  conversionRate: number
  chartData: Array<{ day: string; events: number; users: number }>
  topEvents: Array<{ name: string; count: number }>
}

export interface UseDashboardMetricsOptions {
  dateRange: DateRange
}

export interface UseDashboardMetricsReturn {
  metrics: DashboardMetrics
  isLoading: boolean
  eventsLoading: boolean
}

export function useDashboardMetrics({
  dateRange,
}: UseDashboardMetricsOptions): UseDashboardMetricsReturn {
  const startDate = format(dateRange.from, 'yyyy-MM-dd')
  const endDate = format(dateRange.to, 'yyyy-MM-dd')

  const { data: currentTrend, isLoading: currentLoading } = useQuery({
    queryKey: ['trend', startDate, endDate],
    queryFn: () => fetchTrend({ start_date: startDate, end_date: endDate, granularity: 'day' }),
  })

  const { data: topEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['topEvents', startDate, endDate],
    queryFn: () => fetchTopEvents({ limit: 5, start_date: startDate, end_date: endDate }),
  })

  const { data: sessionsSummary } = useQuery({
    queryKey: ['sessionsSummary', startDate, endDate],
    queryFn: () => fetchSessionsSummary({ start_date: startDate, end_date: endDate }),
  })

  const { data: conversion } = useQuery({
    queryKey: ['conversion', startDate, endDate],
    queryFn: () => fetchConversion({ start_date: startDate, end_date: endDate }),
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
    avgDuration: sessionsSummary?.data?.[0]?.avg_duration_sec || 0,
    conversionRate: conversion?.data?.[0]?.conversion_rate_percent || 0,
    chartData,
    topEvents: topEventsData?.data || [],
  }

  return {
    metrics,
    isLoading: currentLoading,
    eventsLoading,
  }
}
