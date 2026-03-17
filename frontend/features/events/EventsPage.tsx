import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores'
import { fetchRawEvents, fetchEvents } from '@/lib/api'
import {
  useFilterConfig,
  useFilterOptions,
  useSchemaConfig,
} from '@/features/connections/hooks/useConnectionsData'
import { Card, CardContent } from '@/components/ui/card'
import { QueryError } from '@/components/ui/query-error'
import { PageTransition } from '@/components/layout/PageTransition'
import { SPACING } from '@/lib/constants'
import { EventsTable } from '@/components/events-table/EventsTable'
import { UserTimelineModal } from './components/UserTimelineModal'
import type { RawEvent } from '@/components/events-table/types'

export function EventsPage() {
  useEffect(() => {
    document.title = 'Events — OpenFlow'
  }, [])

  const { dateRange, activeFilters, activeConnectionId } = useAppStore()

  // Pagination & sort
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Column-level filters (local to this page)
  const [eventNameFilter, setEventNameFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  // Timeline modal
  const [timelineUserId, setTimelineUserId] = useState<string | null>(null)

  const limit = 50
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  // Filter config, schema config, and filter options for dynamic dimension columns
  const { data: filterConfig } = useFilterConfig(activeConnectionId ?? '')
  const { data: filterOptions } = useFilterOptions(activeConnectionId ?? '')
  const { data: schemaConfig } = useSchemaConfig(activeConnectionId ?? '')
  const filterFields = filterConfig?.filter_fields ?? []
  const customProperties = schemaConfig?.custom_properties ?? []

  // All event names for the event filter combobox
  const { data: eventsData } = useQuery({
    queryKey: ['events', activeConnectionId],
    queryFn: () => fetchEvents(activeConnectionId ?? undefined),
    staleTime: 5 * 60 * 1000,
  })
  const allEventNames = eventsData?.events ?? []

  // Merge global store filters with local column filters (local takes precedence)
  const mergedFilters: Record<string, string | null> = { ...activeFilters, ...columnFilters }

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
        event_name: eventNameFilter || undefined,
        user_id: userIdFilter || undefined,
        sort_field: sortField,
        sort_order: sortOrder,
        start_date: startDate,
        end_date: endDate,
        filters: mergedFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const events: RawEvent[] = (rawEventsData?.data ?? []).map((e, i) => ({
    event_id: e.user_id + e.timestamp + i,
    user_id: e.user_id,
    event_name: e.event_name,
    timestamp: e.timestamp,
    properties: e.properties,
  }))

  const handleColumnFilterChange = useCallback((field: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }))
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

  const handleEventNameFilterChange = useCallback((v: string) => {
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

  if (isError) return <QueryError error={error} />

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <Card>
          <CardContent className="p-0">
            <EventsTable
                data={events}
                total={rawEventsData?.total ?? 0}
                page={page}
                pageSize={limit}
                loading={isLoading || isFetching}
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
                filterOptions={filterOptions ?? {}}
                allEventNames={allEventNames}
                onPageChange={setPage}
                onUserClick={setTimelineUserId}
                connectionId={activeConnectionId}
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
