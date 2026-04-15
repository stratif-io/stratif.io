import { QUERY_STALE_TIME } from '@/lib/constants'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchRetention } from '@/lib/api'
import { formatDateParam } from '@/lib/utils'
import { useAppStore } from '@/stores'
import type { DateRange, RetentionCohort } from '@/types'

export type RetentionGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

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
  refetch: () => void
  totalAvailable: number
  sql: string | string[] | undefined
}

export function useRetentionData({
  dateRange,
  granularity,
}: UseRetentionDataOptions): UseRetentionDataReturn {
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : ''
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : ''
  const { activeFilters, activeConnectionId } = useAppStore()

  const {
    data: retentionResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['retention', startDate, endDate, granularity, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchRetention(
        {
          start_date: startDate,
          end_date: endDate,
          granularity,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        },
        { meta: { cardName: 'Retention', querySnippet: `${granularity} retention` } }
      ),
    enabled: true,
    staleTime: QUERY_STALE_TIME.default,
  })

  const retentionData = useMemo(() => retentionResponse?.data ?? [], [retentionResponse])
  const milestones = useMemo(() => retentionResponse?.milestones ?? [], [retentionResponse])
  const totalAvailable = retentionResponse?.total_available_cohorts ?? 0

  return {
    retentionData,
    milestones,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    totalAvailable,
    sql: retentionResponse?.sql,
  }
}
