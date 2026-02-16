import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAppStore } from '@/stores'
import { fetchRawEvents, fetchEvents } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MousePointerClick } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { ColumnDef } from '@tanstack/react-table'

interface RawEvent {
  event_id: string
  user_id: string
  event_name: string
  timestamp: string
  session_id?: string
  device_type?: string
  properties?: Record<string, unknown>
}

const columns: ColumnDef<RawEvent>[] = [
  {
    accessorKey: 'event_name',
    header: 'Event Name',
    cell: ({ row }) => <span className="font-medium">{row.getValue('event_name')}</span>,
  },
  {
    accessorKey: 'user_id',
    header: 'User ID',
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('user_id')}</span>,
  },
  {
    accessorKey: 'session_id',
    header: 'Session ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue('session_id') || '-'}</span>
    ),
  },
  {
    accessorKey: 'device_type',
    header: 'Device',
    cell: ({ row }) => row.getValue('device_type') || 'Unknown',
  },
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as string
      return timestamp ? format(new Date(timestamp), 'MMM d, HH:mm:ss') : '-'
    },
  },
]

export function EventsPage() {
  const { dateRange } = useAppStore()
  const [page, setPage] = useState(1)
  const limit = 50

  const startDate = format(dateRange.from, 'yyyy-MM-dd')
  const endDate = format(dateRange.to, 'yyyy-MM-dd')

  const { data: rawEventsData, isLoading } = useQuery({
    queryKey: ['rawEvents', page, startDate, endDate],
    queryFn: () =>
      fetchRawEvents({
        limit,
        offset: (page - 1) * limit,
        start_date: startDate,
        end_date: endDate,
      }),
  })

  const events: RawEvent[] = (rawEventsData?.data || []).map((e) => ({
    event_id: e.user_id + e.timestamp,
    user_id: e.user_id,
    event_name: e.event_name,
    timestamp: e.timestamp,
    session_id: (e.properties?.session_id as string) || undefined,
    device_type: (e.properties?.device_type as string) || undefined,
    properties: e.properties,
  }))

  const totalEvents = rawEventsData?.total || 0
  const totalPages = Math.ceil(totalEvents / limit)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground mt-1">Browse individual events.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            <CardTitle>Events</CardTitle>
          </div>
          <CardDescription>Raw event data</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={events}
            loading={isLoading}
            showRowSelection={false}
            showRowActions={false}
            searchPlaceholder="Search events..."
            emptyMessage="No events found"
            getRowId={(row) => row.event_id}
          />
          {!isLoading && events.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {events.length} of {totalEvents} events
              </p>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
