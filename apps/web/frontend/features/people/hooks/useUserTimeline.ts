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

export function useUserTimeline(userId: string | null): UseUserTimelineReturn {
  const { activeConnectionId } = useAppStore()

  const query = useInfiniteQuery({
    queryKey: ['user-timeline', userId, activeConnectionId],
    queryFn: ({ pageParam }) =>
      fetchUserEvents({
        user_id: userId!,
        limit: 100,
        offset: pageParam,
        connection_id: activeConnectionId ?? undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.data.length === 100 ? allPages.length * 100 : undefined,
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
