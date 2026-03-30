import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { NoConnectionGuard } from '@/components/ui/no-connection-guard'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryError } from '@/components/ui/query-error'
import { LoadingState } from '@/components/ui/loading-state'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserTimeline, EventPropertiesPanel } from '@/components/ui/user-timeline'
import { cn } from '@/lib/utils'
import { usePeopleList } from './hooks/usePeopleList'
import { useUserTimeline } from './hooks/useUserTimeline'
import type { UserSummary, Event } from '@/types'

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

function CollapseButton({
  collapsed,
  onToggle,
  title,
  flipIcon,
}: {
  collapsed: boolean
  onToggle: () => void
  title: string
  flipIcon?: boolean
}) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <button
      onClick={onToggle}
      title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
      className={cn(
        'text-muted-foreground hover:text-foreground transition-colors shrink-0',
        flipIcon && 'scale-x-[-1]'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function PeoplePage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(100)
  const [col1Collapsed, setCol1Collapsed] = useState(false)
  const [col2Collapsed, setCol2Collapsed] = useState(false)
  const [col3Collapsed, setCol3Collapsed] = useState(false)

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

  useEffect(() => {
    setSelectedEvent(null)
  }, [selectedUserId])

  const filteredUsers = users.filter((u) => u.user_id.toLowerCase().includes(search.toLowerCase()))
  const selectedUser: UserSummary | undefined = users.find((u) => u.user_id === selectedUserId)

  return (
    <PageTransition>
      <NoConnectionGuard>
        <div className="flex h-full overflow-hidden">
          {/* Column 1 — user list */}
          <div
            className={cn(
              'border-r flex flex-col min-h-0 transition-all duration-200',
              col1Collapsed ? 'w-10' : 'w-[28%]'
            )}
          >
            {col1Collapsed ? (
              <div className="flex flex-col items-center py-3 gap-3 h-full">
                <CollapseButton collapsed onToggle={() => setCol1Collapsed(false)} title="People" />
                <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180 mt-2 select-none">
                  People
                </span>
              </div>
            ) : (
              <>
                <div className="p-4 border-b shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h1 className="text-lg font-semibold">People</h1>
                    <CollapseButton
                      collapsed={false}
                      onToggle={() => setCol1Collapsed(true)}
                      title="People"
                    />
                  </div>
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
              </>
            )}
          </div>

          {/* Column 2 — timeline */}
          <div
            className={cn(
              'flex flex-col min-h-0 overflow-hidden border-r transition-all duration-200',
              col2Collapsed ? 'w-10' : 'w-[36%]'
            )}
          >
            {col2Collapsed ? (
              <div className="flex flex-col items-center py-3 gap-3 h-full">
                <CollapseButton
                  collapsed
                  onToggle={() => setCol2Collapsed(false)}
                  title="Timeline"
                  flipIcon
                />
                <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180 mt-2 select-none">
                  Timeline
                </span>
              </div>
            ) : selectedUserId ? (
              <>
                <div className="p-4 border-b shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{selectedUserId}</div>
                      {selectedUser && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {selectedUser.event_count} events · first seen{' '}
                          {formatTimestamp(selectedUser.first_seen)} · last seen{' '}
                          {formatTimestamp(selectedUser.last_seen)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                      <CollapseButton
                        collapsed={false}
                        onToggle={() => setCol2Collapsed(true)}
                        title="Timeline"
                        flipIcon
                      />
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="px-6 py-5">
                    {timelineError ? (
                      <QueryError error={timelineErr} />
                    ) : (
                      <UserTimeline
                        events={events}
                        isLoading={timelineLoading}
                        selectedEvent={selectedEvent}
                        onEventSelect={setSelectedEvent}
                      />
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b shrink-0 flex items-center justify-between">
                  <span className="text-sm font-semibold">Timeline</span>
                  <CollapseButton
                    collapsed={false}
                    onToggle={() => setCol2Collapsed(true)}
                    title="Timeline"
                    flipIcon
                  />
                </div>
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a user to view their timeline
                </div>
              </div>
            )}
          </div>

          {/* Column 3 — event properties */}
          <div
            className={cn(
              'flex flex-col min-h-0 transition-all duration-200',
              col3Collapsed ? 'w-10' : 'flex-1'
            )}
          >
            {col3Collapsed ? (
              <div className="flex flex-col items-center py-3 gap-3 h-full">
                <CollapseButton
                  collapsed
                  onToggle={() => setCol3Collapsed(false)}
                  title="Properties"
                  flipIcon
                />
                <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180 mt-2 select-none">
                  Properties
                </span>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Properties</h2>
                  <CollapseButton
                    collapsed={false}
                    onToggle={() => setCol3Collapsed(true)}
                    title="Properties"
                    flipIcon
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <EventPropertiesPanel
                    event={selectedEvent}
                    onClose={selectedEvent ? () => setSelectedEvent(null) : undefined}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </NoConnectionGuard>
    </PageTransition>
  )
}
