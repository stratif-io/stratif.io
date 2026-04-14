import { Suspense, useState, useEffect } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { SPACING } from '@/lib/constants'
import { useAnalytics } from '@/lib/analytics'

function PageTracker() {
  const { page } = useAnalytics()
  const location = useLocation()
  useEffect(() => {
    page(location.pathname)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function PageSkeleton() {
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

// Root layout: wraps every route with skip-link, page tracker, preload, and suspense.
export function RootLayout() {
  usePreloadRoutes()
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageTracker />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
      >
        Skip to content
      </a>
      <Outlet />
    </Suspense>
  )
}
