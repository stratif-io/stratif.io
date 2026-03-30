import { useInfiniteQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores'
import { fetchUserEvents } from '@/lib/api'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { Event } from '@/types'

export interface UseUserTimelineReturn {
  events: Event[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
}

export function useUserTimeline(userId: string | null, limit = 100): UseUserTimelineReturn {
  const { activeConnectionId } = useAppStore()

  const query = useInfiniteQuery({
    queryKey: ['user-timeline', userId, limit, activeConnectionId],
    queryFn: ({ pageParam }) =>
      fetchUserEvents({
        user_id: userId!,
        limit,
        offset: pageParam,
        connection_id: activeConnectionId ?? undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.data.length === limit ? allPages.length * limit : undefined,
    enabled: !!userId && !!activeConnectionId,
    staleTime: QUERY_STALE_TIME.default,
  })

  return {
    events: query.data?.pages.flatMap((p) => p.data) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  }
}
