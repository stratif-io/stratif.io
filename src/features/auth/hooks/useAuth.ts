import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/lib/api/queries'

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  })

  return { user: user ?? null, isLoading }
}
