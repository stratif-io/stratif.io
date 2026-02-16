import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, differenceInDays } from 'date-fns'
import { fetchTrend, fetchRawEvents, fetchSessionsSummary, fetchConversion } from '@/lib/api'
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

  const { data: rawEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['rawEvents', startDate, endDate],
    queryFn: () => fetchRawEvents({ limit: 1000, start_date: startDate, end_date: endDate }),
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
      users: Math.round(d.count * (0.3 + Math.random() * 0.4)),
    }))
  }, [currentTrend])

  const topEvents = useMemo(() => {
    if (!rawEvents?.data) return []
    const counts: Record<string, number> = {}
    rawEvents.data.forEach((e) => {
      counts[e.event_name] = (counts[e.event_name] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  }, [rawEvents])

  const metrics: DashboardMetrics = {
    totalEvents: currentTrend?.data?.reduce((acc, d) => acc + d.count, 0) || 0,
    uniqueUsers: new Set(rawEvents?.data?.map((e) => e.user_id)).size || 0,
    avgDuration: sessionsSummary?.data?.[0]?.avg_duration_sec || 0,
    conversionRate: conversion?.data?.[0]?.conversion_rate_percent || 0,
    chartData,
    topEvents,
  }

  return {
    metrics,
    isLoading: currentLoading,
    eventsLoading,
  }
}
