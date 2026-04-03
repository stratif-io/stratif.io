import { useQuery } from '@tanstack/react-query'
import { fetchCurrentUser } from '@/lib/api/queries'
import { QUERY_STALE_TIME } from '@/lib/constants'

/**
 * Returns the current user's identity from /api/auth/me.
 *
 * In OSS mode (API-key auth) the server returns { username: 'admin' }.
 * The SaaS overlay can override the backend dependency to return real user info.
 *
 * Falls back to undefined while loading or on error — callers should fall back
 * to a placeholder like 'you' when data is not available.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: QUERY_STALE_TIME.never,
    retry: false,
  })
}
