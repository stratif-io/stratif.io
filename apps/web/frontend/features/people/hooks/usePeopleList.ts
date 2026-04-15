import { useInfiniteQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores'
import { fetchUserList } from '@/lib/api'
import { formatDateParam } from '@/lib/utils'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { UserSummary } from '@/types'

export interface UsePeopleListReturn {
  users: UserSummary[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
}

export function usePeopleList(): UsePeopleListReturn {
  const { dateRange, activeConnectionId, activeFilters } = useAppStore()
  const startDate = dateRange?.from ? formatDateParam(dateRange.from) : ''
  const endDate = dateRange?.to ? formatDateParam(dateRange.to) : ''

  const query = useInfiniteQuery({
    queryKey: ['people-list', startDate, endDate, activeConnectionId, activeFilters],
    queryFn: ({ pageParam }) =>
      fetchUserList(
        {
          start_date: startDate,
          end_date: endDate,
          limit: 50,
          offset: pageParam,
          connection_id: activeConnectionId ?? undefined,
          filters: activeFilters,
        },
        { meta: { cardName: 'People', querySnippet: 'user list' } }
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.data.length === 50 ? allPages.length * 50 : undefined,
    enabled: !!activeConnectionId,
    staleTime: QUERY_STALE_TIME.default,
  })

  return {
    users: query.data?.pages.flatMap((p) => p.data) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  }
}
