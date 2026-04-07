import { useEffect, useRef } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores'

/** Pages where conn + date range + filters should be reflected in the URL. */
const DATA_PATH_PREFIXES = [
  '/dashboard',
  '/trends',
  '/retention',
  '/paths',
  '/funnel',
  '/pivot',
  '/events',
]

function isDataPage(pathname: string) {
  return DATA_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

/**
 * Two-way sync between Zustand store and URL search params on data pages.
 * - On mount / path change: URL params are applied to the store (URL wins → shareable links).
 * - On store change: URL is updated via `replace` (no extra history entries).
 */
export function useUrlSync() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const dateRange = useAppStore((s) => s.dateRange)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)
  const setDateRange = useAppStore((s) => s.setDateRange)
  const setActiveFilter = useAppStore((s) => s.setActiveFilter)

  const isData = isDataPage(location.pathname)

  // On mount and path change: read URL → store (only when params are present)
  const didReadUrl = useRef(false)
  useEffect(() => {
    if (!isData) return
    didReadUrl.current = false

    const conn = searchParams.get('conn')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (conn) setActiveConnectionId(conn)

    if (from && to) {
      const fromDate = new Date(from)
      const toDate = new Date(to)
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        setDateRange({ from: fromDate, to: toDate })
      }
    }

    // Read f_<field> filter params
    searchParams.forEach((value, key) => {
      if (key.startsWith('f_')) {
        setActiveFilter(key.slice(2), value || null)
      }
    })

    didReadUrl.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Serialize dates to strings — Date objects change identity on every setDateRange call,
  // which would cause an infinite loop (read URL → setDateRange → new Date ref → effect fires → setSearchParams → …).
  const dateFromKey = dateRange.from?.toISOString().slice(0, 10)
  const dateToKey = dateRange.to?.toISOString().slice(0, 10)

  // Store → URL: whenever store values change, push to URL (replace)
  useEffect(() => {
    if (!isData) return

    const params = new URLSearchParams()

    if (activeConnectionId) params.set('conn', activeConnectionId)

    if (dateFromKey && dateToKey) {
      params.set('from', dateFromKey)
      params.set('to', dateToKey)
    }

    Object.entries(activeFilters).forEach(([field, value]) => {
      if (value) params.set(`f_${field}`, value)
    })

    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isData, activeConnectionId, dateFromKey, dateToKey, activeFilters])
}
