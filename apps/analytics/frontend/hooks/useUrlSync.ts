import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
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
      // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by the spec.
      // Appending T00:00:00 (no timezone) forces local midnight, which is what
      // formatDateParam expects when checking getHours() === 0.
      const fromDate = new Date(/^\d{4}-\d{2}-\d{2}$/.test(from) ? `${from}T00:00:00` : from)
      const toDate = new Date(/^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T00:00:00` : to)
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

  // Serialize dates to strings using LOCAL date (not UTC) to avoid timezone-induced day shifts.
  // toISOString() returns UTC which is wrong for users in UTC+ zones.
  const dateFromKey = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const dateToKey = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

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
