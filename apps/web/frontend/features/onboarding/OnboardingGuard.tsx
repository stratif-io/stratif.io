import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from '@/stores/app-store'

export function OnboardingGuard() {
  const { activeConnectionId } = useAppStore()

  if (!activeConnectionId) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
