import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchRetention } from '@/lib/api'
import { useAppStore } from '@/stores'
import type { DateRange, RetentionCohort } from '@/types'

export interface ChartDataItem {
  cohort: string
  users: number
  day0: number
  day1: number
  day7: number
  day14: number
  day30: number
}

export interface UseRetentionDataOptions {
  dateRange: DateRange
}

export interface UseRetentionDataReturn {
  retentionData: RetentionCohort[]
  chartData: ChartDataItem[]
  isLoading: boolean
  avgDay1: number
  avgDay7: number
  avgDay30: number
  totalCohorts: number
}

export function useRetentionData({ dateRange }: UseRetentionDataOptions): UseRetentionDataReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
  const { selectedCountry, selectedBrowser } = useAppStore()

  const { data: retentionResponse, isLoading } = useQuery({
    queryKey: ['retention', startDate, endDate, selectedCountry, selectedBrowser],
    queryFn: () =>
      fetchRetention({
        start_date: startDate,
        end_date: endDate,
        country: selectedCountry || undefined,
        browser: selectedBrowser || undefined,
      }),
    enabled: !!startDate && !!endDate,
  })

  const retentionData = useMemo(() => retentionResponse?.data || [], [retentionResponse])

  const chartData = useMemo(
    () =>
      retentionData.map((row) => ({
        cohort: new Date(row.cohort_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        users: row.cohort_size,
        day0: row.day_0_percent,
        day1: row.day_1_percent,
        day7: row.day_7_percent,
        day14: row.day_14_percent,
        day30: row.day_30_percent,
      })),
    [retentionData]
  )

  const avgDay1 = useMemo(
    () =>
      retentionData.length > 0
        ? retentionData.reduce((acc, r) => acc + r.day_1_percent, 0) / retentionData.length
        : 0,
    [retentionData]
  )

  const avgDay7 = useMemo(
    () =>
      retentionData.length > 0
        ? retentionData.reduce((acc, r) => acc + r.day_7_percent, 0) / retentionData.length
        : 0,
    [retentionData]
  )

  const avgDay30 = useMemo(
    () =>
      retentionData.length > 0
        ? retentionData.reduce((acc, r) => acc + r.day_30_percent, 0) / retentionData.length
        : 0,
    [retentionData]
  )

  return {
    retentionData,
    chartData,
    isLoading,
    avgDay1,
    avgDay7,
    avgDay30,
    totalCohorts: retentionData.length,
  }
}
