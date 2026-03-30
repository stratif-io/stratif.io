import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Users } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { NoConnectionGuard } from '@/components/ui/no-connection-guard'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryError } from '@/components/ui/query-error'
import { LoadingState } from '@/components/ui/loading-state'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserTimeline } from '@/components/ui/user-timeline'
import { cn } from '@/lib/utils'
import { usePeopleList } from './hooks/usePeopleList'
import { useUserTimeline } from './hooks/useUserTimeline'
import type { UserSummary } from '@/types'

function formatLastSeen(ts: string): string {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true })
  } catch {
    return ts
  }
}

function formatTimestamp(ts: string): string {
  try {
    return format(new Date(ts), 'MMM d, HH:mm:ss')
  } catch {
    return ts
  }
}

export function PeoplePage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(100)

  const { users, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    usePeopleList()

  const {
    events,
    isLoading: timelineLoading,
    isError: timelineError,
    error: timelineErr,
  } = useUserTimeline(selectedUserId, limit)

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].user_id)
    }
  }, [users, selectedUserId])

  const filteredUsers = users.filter((u) => u.user_id.toLowerCase().includes(search.toLowerCase()))

  const selectedUser: UserSummary | undefined = users.find((u) => u.user_id === selectedUserId)

  return (
    <PageTransition>
      <NoConnectionGuard>
        <div className="flex h-full overflow-hidden">
          {/* Left panel — user list */}
          <div className="w-[38%] border-r flex flex-col min-h-0">
            <div className="p-4 border-b shrink-0">
              <h1 className="text-lg font-semibold mb-3">People</h1>
              <Input
                placeholder="Search user_id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <LoadingState />
              ) : isError ? (
                <QueryError error={error} />
              ) : filteredUsers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No users found"
                  description="No events match the selected date range."
                />
              ) : (
                <>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => setSelectedUserId(user.user_id)}
                      className={cn(
                        'w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors',
                        selectedUserId === user.user_id && 'bg-muted'
                      )}
                    >
                      <div className="font-medium text-sm truncate">{user.user_id}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {user.event_count} events · {formatLastSeen(user.last_seen)}
                      </div>
                    </button>
                  ))}
                  {hasNextPage && (
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isFetchingNextPage ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right panel — timeline */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedUserId ? (
              <>
                {/* Right panel header */}
                <div className="p-4 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{selectedUserId}</div>
                      {selectedUser && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {selectedUser.event_count} events · first seen{' '}
                          {formatTimestamp(selectedUser.first_seen)} · last seen{' '}
                          {formatTimestamp(selectedUser.last_seen)}
                        </div>
                      )}
                    </div>
                    {!timelineLoading && events.length > 0 && (
                      <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="text-xs bg-transparent border border-border rounded px-1.5 py-0.5 text-muted-foreground cursor-pointer"
                      >
                        {[50, 100, 200, 500].map((n) => (
                          <option key={n} value={n}>
                            last {n}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <ScrollArea className="flex-1">
                  <div className="px-6 py-5">
                    {timelineError ? (
                      <QueryError error={timelineErr} />
                    ) : (
                      <UserTimeline events={events} isLoading={timelineLoading} />
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a user to view their timeline
              </div>
            )}
          </div>
        </div>
      </NoConnectionGuard>
    </PageTransition>
  )
}
