import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'

const DashboardPage = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardPage }))
)
const TrendsPage = lazy(() =>
  import('@/features/analytics').then((m) => ({ default: m.TrendsPage }))
)
const RetentionPage = lazy(() =>
  import('@/features/analytics').then((m) => ({ default: m.RetentionPage }))
)
const PathsPage = lazy(() => import('@/features/analytics').then((m) => ({ default: m.PathsPage })))
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
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
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
