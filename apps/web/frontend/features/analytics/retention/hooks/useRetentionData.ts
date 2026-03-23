import { QUERY_STALE_TIME } from '@/lib/constants'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchRetention } from '@/lib/api'
import { formatDateParam } from '@/lib/utils'
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
  isError: boolean
  error: Error | null
  avgMilestones: number[]
  totalAvailable: number
}

export function useRetentionData({
  dateRange,
  granularity,
}: UseRetentionDataOptions): UseRetentionDataReturn {
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : ''
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : ''
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data: retentionResponse, isLoading, isError, error } = useQuery({
    queryKey: ['retention', startDate, endDate, granularity, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchRetention({
        start_date: startDate,
        end_date: endDate,
        granularity,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: true,
    staleTime: QUERY_STALE_TIME.default,
  })

  const retentionData = useMemo(() => retentionResponse?.data ?? [], [retentionResponse])
  const milestones = useMemo(() => retentionResponse?.milestones ?? [], [retentionResponse])
  const totalAvailable = retentionResponse?.total_available_cohorts ?? 0

  const avgMilestones = useMemo(() => {
    if (retentionData.length === 0) return milestones.map(() => 0)
    return milestones.map(
      (_, i) =>
        retentionData.reduce((acc, r) => acc + (r.milestone_values[i] ?? 0), 0) /
        retentionData.length
    )
  }, [retentionData, milestones])

  return {
    retentionData,
    milestones,
    isLoading,
    isError,
    error: error as Error | null,
    avgMilestones,
    totalAvailable,
  }
}
