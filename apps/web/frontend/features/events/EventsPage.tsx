import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Download, Columns3 } from 'lucide-react'
import { useAppStore } from '@/stores'
import { fetchRawEvents, fetchEvents, fetchFieldOptions } from '@/lib/api'
import {
  useFilterConfig,
  useFilterOptions,
  useSchemaConfig,
} from '@/features/connections/hooks/useConnectionsData'
import { Card, CardContent } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/ui/query-error'
import { PageTransition } from '@/components/layout/PageTransition'
import { SPACING, QUERY_STALE_TIME } from '@/lib/constants'
import { EventsTable, buildDimCols, defaultVisibility } from '@/components/events-table/EventsTable'
import { FilterSelect } from '@/components/FilterSelect'
import { UserTimelineModal } from './components/UserTimelineModal'
import type { RawEvent } from '@/components/events-table/types'
import type { VisibilityState } from '@tanstack/react-table'

export function EventsPage() {
  useEffect(() => {
    document.title = 'Events — stratif.io'
  }, [])

  const { dateRange, activeFilters, activeConnectionId } = useAppStore()

  // Pagination & sort
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Column-level filters (local to this page)
  const [eventNameFilter, setEventNameFilter] = useState<string[]>([])
  const [userIdFilter, setUserIdFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  // Timeline modal
  const [timelineUserId, setTimelineUserId] = useState<string | null>(null)

  // Column visibility (controlled at page level)
  const [colVisibility, setColVisibility] = useState<VisibilityState>({})

  const limit = 50
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  // Filter config, schema config, and filter options for dynamic dimension columns
  const { data: filterConfig } = useFilterConfig(activeConnectionId ?? '')
  const { data: filterOptions } = useFilterOptions(activeConnectionId ?? '')
  const { data: schemaConfig } = useSchemaConfig(activeConnectionId ?? '')
  const filterFields = filterConfig?.filter_fields ?? []
  const customProperties = useMemo(
    () => schemaConfig?.custom_properties ?? [],
    [schemaConfig?.custom_properties]
  )

  // Fetch field options for all custom properties in a single query
  const customPropFields = useMemo(() => customProperties.map((cp) => cp.name), [customProperties])
  const { data: customPropOptions } = useQuery({
    queryKey: ['field-options-bulk', activeConnectionId, customPropFields],
    queryFn: async () => {
      if (!activeConnectionId || customPropFields.length === 0) return {}
      const results = await Promise.all(
        customPropFields.map((field) => fetchFieldOptions(activeConnectionId, field))
      )
      return Object.fromEntries(results.map((r) => [r.field, r.values]))
    },
    enabled: !!activeConnectionId && customPropFields.length > 0,
    staleTime: QUERY_STALE_TIME.default,
  })
  const mergedFilterOptions = useMemo(
    () => ({ ...(filterOptions ?? {}), ...(customPropOptions ?? {}) }),
    [filterOptions, customPropOptions]
  )

  // All event names for the event filter combobox
  const { data: eventsData } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
    staleTime: QUERY_STALE_TIME.default,
  })
  const allEventNames = eventsData?.events ?? []

  // Merge global store filters with local column filters (local takes precedence)
  const mergedFilters: Record<string, string | null> = {
    ...activeFilters,
    ...Object.fromEntries(
      Object.entries(columnFilters).map(([k, v]) => [k, v.length ? v.join('|') : null])
    ),
  }

  const {
    data: rawEventsData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: [
      'rawEvents',
      page,
      startDate,
      endDate,
      activeFilters,
      columnFilters,
      eventNameFilter,
      userIdFilter,
      sortField,
      sortOrder,
      activeConnectionId,
    ],
    queryFn: () =>
      fetchRawEvents({
        limit,
        offset: (page - 1) * limit,
        event_name: eventNameFilter.length ? eventNameFilter.join('|') : undefined,
        user_id: userIdFilter || undefined,
        sort_field: sortField,
        sort_order: sortOrder,
        start_date: startDate,
        end_date: endDate,
        filters: mergedFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    staleTime: QUERY_STALE_TIME.default,
    placeholderData: keepPreviousData,
  })

  const events: RawEvent[] = (rawEventsData?.data ?? []).map((e, i) => ({
    event_id: e.user_id + e.timestamp + i,
    user_id: e.user_id,
    event_name: e.event_name,
    timestamp: e.timestamp,
    properties: e.properties,
  }))

  const handleColumnFilterChange = useCallback((field: string, values: string[]) => {
    setColumnFilters((prev) => ({ ...prev, [field]: values }))
    setPage(1)
  }, [])

  const handleColumnFilterClear = useCallback((field: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    setPage(1)
  }, [])

  const handleEventNameFilterChange = useCallback((v: string[]) => {
    setEventNameFilter(v)
    setPage(1)
  }, [])

  const handleUserIdFilterChange = useCallback((v: string) => {
    setUserIdFilter(v)
    setPage(1)
  }, [])

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortField(field)
    setSortOrder(order)
    setPage(1)
  }, [])

  // Column definitions for visibility picker
  const dimCols = useMemo(() => buildDimCols(filterFields, customProperties), [filterFields, customProperties])
  const allColOptions = useMemo(() => [
    { value: 'user_id', label: 'User ID' },
    { value: 'event_name', label: 'Event Name' },
    ...dimCols.map((c) => ({ value: c.id, label: c.label })),
    { value: 'timestamp', label: 'Timestamp' },
  ], [dimCols])

  // Visible column IDs for the FilterSelect
  const visibleColIds = useMemo(
    () => allColOptions.map((o) => o.value).filter((id) => colVisibility[id] !== false),
    [allColOptions, colVisibility],
  )

  // Sync initial colVisibility once dimCols are loaded
  const dimColsLoadedRef = useRef(false)
  useEffect(() => {
    if (dimColsLoadedRef.current || dimCols.length === 0) return
    dimColsLoadedRef.current = true
    const storageKey = `of_events_colstate_v2_${activeConnectionId ?? 'default'}`
    try {
      const versionKey = `${storageKey}_ver`
      const COL_VISIBILITY_VERSION = 'v3'
      if (localStorage.getItem(versionKey) === COL_VISIBILITY_VERSION) {
        const saved = localStorage.getItem(storageKey)
        if (saved) { setColVisibility(JSON.parse(saved)); return }
      }
    } catch { /* ignore */ }
    setColVisibility(defaultVisibility(dimCols, filterFields))
  }, [dimCols, filterFields, activeConnectionId])

  const handleColVisibilityFromSelect = useCallback((ids: string | string[]) => {
    const selected = new Set(Array.isArray(ids) ? ids : [ids])
    const next: VisibilityState = {}
    for (const opt of allColOptions) {
      next[opt.value] = selected.has(opt.value)
    }
    setColVisibility(next)
  }, [allColOptions])

  // Export helpers
  const getExportRows = useCallback(() => {
    const visibleCols = allColOptions.filter((o) => colVisibility[o.value] !== false)
    const headers = visibleCols.map((o) => o.label)
    const rows = events.map((e) => visibleCols.map((o) => {
      if (o.value === 'user_id') return e.user_id
      if (o.value === 'event_name') return e.event_name
      if (o.value === 'timestamp') return e.timestamp
      const props = e.properties ?? {}
      const v = (props as Record<string, unknown>)[o.value]
      return v == null ? '' : String(v)
    }))
    return { headers, rows }
  }, [allColOptions, colVisibility, events])

  const handleExportCSV = useCallback(() => {
    const { headers, rows } = getExportRows()
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'events.csv'; a.click()
    URL.revokeObjectURL(url)
  }, [getExportRows])

  const handleExportXLSX = useCallback(() => {
    const { headers, rows } = getExportRows()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Events')
    XLSX.writeFile(wb, 'events.xlsx')
  }, [getExportRows])

  if (isError) return <QueryError error={error} />

  return (
    <PageTransition>
      <div className={SPACING.page}>
        {/* Page-level toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Columns3 className="h-4 w-4 text-muted-foreground" />
            <FilterSelect
              mode="multi"
              searchable
              tree={true}
              options={allColOptions}
              value={visibleColIds}
              onChange={handleColVisibilityFromSelect}
              placeholder="Columns"
              className="h-8 text-xs"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportXLSX}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              XLSX
            </Button>
          </div>
        </div>
        <Card className="relative overflow-hidden">
          <CardLoadingBar loading={isFetching} />
          <CardContent className="p-0">
            <EventsTable
                data={events}
                total={rawEventsData?.total ?? 0}
                page={page}
                pageSize={limit}
                loading={isLoading}
                isFetching={isFetching}
                sortField={sortField}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                eventNameFilter={eventNameFilter}
                onEventNameFilterChange={handleEventNameFilterChange}
                userIdFilter={userIdFilter}
                onUserIdFilterChange={handleUserIdFilterChange}
                columnFilters={columnFilters}
                onColumnFilterChange={handleColumnFilterChange}
                onColumnFilterClear={handleColumnFilterClear}
                filterFields={filterFields}
                customProperties={customProperties}
                filterOptions={mergedFilterOptions}
                allEventNames={allEventNames}
                onPageChange={setPage}
                onUserClick={setTimelineUserId}
                connectionId={activeConnectionId}
                colVisibility={colVisibility}
                onColumnVisibilityChange={setColVisibility}
              />
          </CardContent>
        </Card>
      </div>

      <UserTimelineModal
        userId={timelineUserId}
        connectionId={activeConnectionId}
        open={timelineUserId !== null}
        onClose={() => setTimelineUserId(null)}
      />
    </PageTransition>
  )
}
