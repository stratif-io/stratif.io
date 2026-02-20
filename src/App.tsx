import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoadingState } from '@/components/ui/loading-state'
import { SPACING } from '@/lib/constants'

const DashboardPage = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardPage }))
)
const TrendsPage = lazy(() =>
  import('@/features/analytics').then((m) => ({ default: m.TrendsPage }))
)
const RetentionPage = lazy(() =>
  import('@/features/analytics').then((m) => ({ default: m.RetentionPage }))
)
const PathsPage = lazy(() =>
  import('@/features/analytics').then((m) => ({ default: m.PathsExplorerPage }))
)
const FunnelDetailPage = lazy(() =>
  import('@/features/analytics').then((m) => ({ default: m.FunnelDetailPage }))
)
const PivotPage = lazy(() => import('@/features/analytics').then((m) => ({ default: m.PivotPage })))
const EventsPage = lazy(() => import('@/features/events').then((m) => ({ default: m.EventsPage })))
const ConnectionsPage = lazy(() =>
  import('@/features/connections').then((m) => ({ default: m.ConnectionsPage }))
)
const ConnectionDetailPage = lazy(() =>
  import('@/features/connections').then((m) => ({ default: m.ConnectionDetailPage }))
)
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage }))
)
const LoginPage = lazy(() => import('@/features/auth').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.RegisterPage }))
)

function PageLoader() {
  return (
    <div className={SPACING.page}>
      <LoadingState message="Loading..." size="lg" />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/retention" element={<RetentionPage />} />
            <Route path="/paths" element={<PathsPage />} />
            <Route path="/funnel" element={<FunnelDetailPage />} />
            <Route path="/pivot" element={<PivotPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/connections/:id" element={<ConnectionDetailPage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
