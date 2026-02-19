import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchRetention } from '@/lib/api'
import { useAppStore } from '@/stores'
import type { DateRange, RetentionCohort } from '@/types'

export type RetentionGranularity = 'day' | 'week' | 'month'

export interface UseRetentionDataOptions {
  dateRange: DateRange
  granularity: RetentionGranularity
}

export interface UseRetentionDataReturn {
  retentionData: RetentionCohort[]
  milestones: number[]
  isLoading: boolean
  avgMilestones: number[]
  totalAvailable: number
}

export function useRetentionData({
  dateRange,
  granularity,
}: UseRetentionDataOptions): UseRetentionDataReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data: retentionResponse, isLoading } = useQuery({
    queryKey: ['retention', startDate, endDate, granularity, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchRetention({
        start_date: startDate,
        end_date: endDate,
        granularity,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!startDate && !!endDate,
  })

  const retentionData = useMemo(() => retentionResponse?.data ?? [], [retentionResponse])
  const milestones = useMemo(() => retentionResponse?.milestones ?? [], [retentionResponse])
  const totalAvailable = retentionResponse?.total_available_cohorts ?? 0

  const avgMilestones = useMemo(() => {
    if (retentionData.length === 0) return milestones.map(() => 0)
    return milestones.map((_, i) =>
      retentionData.reduce((acc, r) => acc + (r.milestone_values[i] ?? 0), 0) / retentionData.length
    )
  }, [retentionData, milestones])

  return {
    retentionData,
    milestones,
    isLoading,
    avgMilestones,
    totalAvailable,
  }
}
