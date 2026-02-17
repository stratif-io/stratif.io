import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout'
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
const FunnelsPage = lazy(() =>
  import('@/pages/PlaceholderPages').then((m) => ({ default: m.FunnelsPage }))
)
const CohortsPage = lazy(() =>
  import('@/pages/PlaceholderPages').then((m) => ({ default: m.CohortsPage }))
)
const JourneysPage = lazy(() =>
  import('@/pages/PlaceholderPages').then((m) => ({ default: m.JourneysPage }))
)
const EventStreamPage = lazy(() =>
  import('@/pages/PlaceholderPages').then((m) => ({ default: m.EventStreamPage }))
)
const SessionsPage = lazy(() =>
  import('@/pages/PlaceholderPages').then((m) => ({ default: m.SessionsPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/PlaceholderPages').then((m) => ({ default: m.SettingsPage }))
)
const HelpPage = lazy(() =>
  import('@/pages/PlaceholderPages').then((m) => ({ default: m.HelpPage }))
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
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/retention" element={<RetentionPage />} />
          <Route path="/paths" element={<PathsPage />} />
          <Route path="/funnel" element={<FunnelDetailPage />} />
          <Route path="/pivot" element={<PivotPage />} />
          <Route path="/funnels" element={<FunnelsPage />} />
          <Route path="/cohorts" element={<CohortsPage />} />
          <Route path="/journeys" element={<JourneysPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
