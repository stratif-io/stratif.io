import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAppStore } from '@/stores'
import { fetchSessions } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, Users } from 'lucide-react'

export default function SessionsPage() {
  const { dateRange } = useAppStore()
  const [page, setPage] = useState(1)
  const limit = 20

  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions', page, startDate, endDate],
    queryFn: () => fetchSessions({ limit, offset: (page - 1) * limit }),
  })

  const sessions = sessionsData?.data || []
  const totalSessions = sessionsData?.total || 0
  const totalPages = Math.ceil(totalSessions / limit)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        <p className="text-muted-foreground mt-1">Browse individual user sessions.</p>
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
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sessions found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Start Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.session_id}>
                      <TableCell className="font-mono text-xs">{session.session_id}</TableCell>
                      <TableCell className="font-mono text-xs">{session.user_id}</TableCell>
                      <TableCell>{session.device_type || 'Unknown'}</TableCell>
                      <TableCell>{session.event_count || 0}</TableCell>
                      <TableCell>{formatDuration(session.duration_sec || 0)}</TableCell>
                      <TableCell>
                        {session.start_time
                          ? format(new Date(session.start_time), 'MMM d, HH:mm')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {sessions.length} of {totalSessions} sessions
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
