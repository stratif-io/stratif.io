import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { LoadingState } from '@/components/ui/loading-state'

export function ProtectedRoute() {
  const { user, isLoading } = useAuthContext()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Loading…" size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
