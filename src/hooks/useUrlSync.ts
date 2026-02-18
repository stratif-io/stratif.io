import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/stores'

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

function parseDate(s: string): Date | null {
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

const RESERVED = new Set(['conn', 'from', 'to'])

/**
 * Syncs activeConnectionId, dateRange, and activeFilters between the Zustand
 * store and URL search params.
 *
 * On mount: if the URL contains relevant params (e.g. from a shared link),
 * those values take precedence and seed the store. Otherwise the store's
 * persisted (localStorage) values are used and written to the URL.
 *
 * After mount: every store change is reflected in the URL (replace, no history
 * entry) so the address bar always represents the current view.
 */
export function useUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialized = useRef(false)

  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)
  const dateRange = useAppStore((s) => s.dateRange)
  const setDateRange = useAppStore((s) => s.setDateRange)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setActiveFilter = useAppStore((s) => s.setActiveFilter)
  const clearAllFilters = useAppStore((s) => s.clearAllFilters)

  // Phase 1 — run once on mount: seed store from URL if params are present.
  useEffect(() => {
    initialized.current = true

    const conn = searchParams.get('conn')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (conn !== null) {
      setActiveConnectionId(conn || null)
    }

    if (from !== null || to !== null) {
      const fromDate = from ? parseDate(from) : dateRange.from
      const toDate = to ? parseDate(to) : dateRange.to
      if (fromDate && toDate) {
        setDateRange({ from: fromDate, to: toDate })
      }
    }

    // Dimension filters: only override store if any filter params appear in URL.
    let hasFilterParams = false
    searchParams.forEach((_, key) => {
      if (!RESERVED.has(key)) hasFilterParams = true
    })

    if (hasFilterParams) {
      clearAllFilters()
      searchParams.forEach((value, key) => {
        if (!RESERVED.has(key)) setActiveFilter(key, value || null)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 2 — mirror store → URL on every relevant store change.
  useEffect(() => {
    if (!initialized.current) return

    const params: Record<string, string> = {}

    if (activeConnectionId) params.conn = activeConnectionId
    if (dateRange?.from) params.from = formatDate(dateRange.from)
    if (dateRange?.to) params.to = formatDate(dateRange.to)

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value
      }
    })

    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnectionId, dateRange, activeFilters])
}
