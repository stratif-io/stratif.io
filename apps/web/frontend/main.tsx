import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ui/toast-provider'
import { AnalyticsProvider, loggingAdapter } from '@/lib/analytics'
import { DashboardLayout } from '@/components/layout'
import { RootLayout } from './App'
import './index.css'

const adapter = import.meta.env.VITE_ANALYTICS_DEBUG === 'true' ? loggingAdapter : undefined

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
const NewConnectionPage = lazy(() =>
  import('@/features/connections').then((m) => ({ default: m.NewConnectionPage }))
)
const QueryStudioPage = lazy(() =>
  import('@/features/query-studio/QueryStudioPage').then((m) => ({ default: m.QueryStudioPage }))
)
const QueryLogPage = lazy(() =>
  import('@/features/query-log/QueryLogPage').then((m) => ({ default: m.QueryLogPage }))
)
const NotFoundPage = lazy(() =>
  import('@/features/design-system/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)
const DesignSystemPage = import.meta.env.DEV && !import.meta.env.VITE_NO_DESIGN_SYSTEM
  ? lazy(() =>
      import('@/features/design-system/DesignSystemPage').then((m) => ({
        default: m.DesignSystemPage,
      }))
    )
  : null

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/trends', element: <TrendsPage /> },
          { path: '/retention', element: <RetentionPage /> },
          { path: '/paths', element: <PathsPage /> },
          { path: '/people', element: <PeoplePage /> },
          { path: '/funnel', element: <FunnelDetailPage /> },
          { path: '/pivot', element: <PivotPage /> },
          { path: '/events', element: <EventsPage /> },
          { path: '/connections', element: <ConnectionsPage /> },
          { path: '/connections/new', element: <NewConnectionPage /> },
          { path: '/connections/:id/:tab?', element: <ConnectionDetailPage /> },
          { path: '/query-studio', element: <QueryStudioPage /> },
          { path: '/query-log', element: <QueryLogPage /> },
          ...(import.meta.env.DEV && DesignSystemPage
            ? [{ path: '/design-system', element: <DesignSystemPage /> }]
            : []),
          { path: '/settings', element: <Navigate to="/connections" replace /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AnalyticsProvider adapter={adapter}>
          <RouterProvider router={router} />
          <ToastProvider />
        </AnalyticsProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
)
