import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { loginUser } from '@/lib/api/queries'

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user)
      const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
      navigate(from, { replace: true })
    },
  })
}
