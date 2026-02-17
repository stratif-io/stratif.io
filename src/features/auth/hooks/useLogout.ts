import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '@/lib/api/queries'

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.clear()
      navigate('/', { replace: true })
    },
  })
}
