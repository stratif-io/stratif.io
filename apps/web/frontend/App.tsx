import { Suspense, lazy, useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout'
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
const PeoplePage = lazy(() => import('@/features/people').then((m) => ({ default: m.PeoplePage })))
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

const QueryStudioPage = lazy(() =>
  import('@/features/query-studio/QueryStudioPage').then((m) => ({
    default: m.QueryStudioPage,
  }))
)

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/features/design-system/DesignSystemPage').then((m) => ({
        default: m.DesignSystemPage,
      }))
    )
  : null

function PageSkeleton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])
  if (!visible) return null
  return (
    <div className={`${SPACING.page} space-y-6 animate-pulse`}>
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-3 w-2/5 rounded bg-muted" />
            <div className="h-7 w-1/3 rounded bg-muted" />
            <div className="h-3 w-3/5 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    </div>
  )
}

function usePreloadRoutes() {
  useEffect(() => {
    const preload = () => {
      import('@/features/dashboard')
      import('@/features/analytics')
      import('@/features/events')
      import('@/features/connections')
      import('@/features/query-studio/QueryStudioPage')
    }
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload)
    } else {
      setTimeout(preload, 1000)
    }
  }, [])
}

function App() {
  usePreloadRoutes()
  return (
    <Suspense fallback={<PageSkeleton />}>
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
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/funnel" element={<FunnelDetailPage />} />
          <Route path="/pivot" element={<PivotPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/connections/:id/:tab?" element={<ConnectionDetailPage />} />
          <Route path="/query-studio" element={<QueryStudioPage />} />
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
