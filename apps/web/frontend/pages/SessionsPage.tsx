import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'
import { useAppStore } from '@/stores'
import { fetchSessions } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/DataTable'
import { Clock } from 'lucide-react'
import { TYPOGRAPHY } from '@/lib/constants'
import type { Session } from '@/types'

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

const columns: ColumnDef<Session>[] = [
  {
    accessorKey: 'session_id',
    header: 'Session ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue('session_id')}</span>
    ),
  },
  {
    accessorKey: 'user_id',
    header: 'User ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue('user_id')}</span>
    ),
  },
  {
    accessorKey: 'device_type',
    header: 'Device',
    cell: ({ row }) => row.getValue('device_type') || 'Unknown',
  },
  {
    accessorKey: 'event_count',
    header: 'Events',
    cell: ({ row }) => row.getValue('event_count') ?? 0,
  },
  {
    accessorKey: 'duration_sec',
    header: 'Duration',
    cell: ({ row }) => formatDuration(row.getValue('duration_sec') ?? 0),
  },
  {
    accessorKey: 'start_time',
    header: 'Start Time',
    cell: ({ row }) => {
      const val = row.getValue('start_time') as string | undefined
      return val ? format(new Date(val), 'MMM d, HH:mm') : '-'
    },
  },
]

export default function SessionsPage() {
  useEffect(() => {
    document.title = 'Sessions — stratif.io'
  }, [])

  const { dateRange } = useAppStore()

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions', startDate, endDate],
    queryFn: () => fetchSessions({ limit: 200, offset: 0, start_date: startDate, end_date: endDate }),
    staleTime: 5 * 60 * 1000,
  })

  const sessions = useMemo(() => sessionsData?.data ?? [], [sessionsData])

  return (
    <div className="space-y-8">
      <div>
        <h1 className={TYPOGRAPHY.pageTitle}>Sessions</h1>
        <p className={`${TYPOGRAPHY.muted} mt-1`}>Browse individual user sessions.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Sessions</CardTitle>
          </div>
          <CardDescription>Recent user sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sessions}
            isLoading={isLoading}
            emptyMessage="No sessions found"
            showRowSelection={false}
            showRowActions={false}
            showSearch={false}
            showColumnVisibility={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
