import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
const PivotPage = lazy(() =>
  import('@/features/analytics').then((m) => ({ default: m.NewPivotPage }))
)
const EventsPage = lazy(() => import('@/features/events').then((m) => ({ default: m.EventsPage })))
const ConnectionsPage = lazy(() =>
  import('@/features/connections').then((m) => ({ default: m.ConnectionsPage }))
)
const ConnectionDetailPage = lazy(() =>
  import('@/features/connections').then((m) => ({ default: m.ConnectionDetailPage }))
)

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/features/design-system/DesignSystemPage').then((m) => ({
        default: m.DesignSystemPage,
      }))
    )
  : null

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
      >
        Skip to content
      </a>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/retention" element={<RetentionPage />} />
          <Route path="/paths" element={<PathsPage />} />
          <Route path="/funnel" element={<FunnelDetailPage />} />
          <Route path="/pivot" element={<PivotPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/connections/:id" element={<ConnectionDetailPage />} />
          {import.meta.env.DEV && DesignSystemPage && (
            <Route path="/design-system" element={<DesignSystemPage />} />
          )}
          <Route path="/settings" element={<Navigate to="/connections" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
