import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores'
import { fetchUserEvents } from '@/lib/api'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { Event } from '@/types'

export interface UseUserTimelineReturn {
  events: Event[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useUserTimeline(userId: string | null): UseUserTimelineReturn {
  const { activeConnectionId } = useAppStore()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user-timeline', userId, activeConnectionId],
    queryFn: () =>
      fetchUserEvents({
        user_id: userId!,
        limit: 300,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!userId && !!activeConnectionId,
    staleTime: QUERY_STALE_TIME.default,
  })

  return {
    events: data?.data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
  }
}
