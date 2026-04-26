import { QUERY_STALE_TIME } from '@/lib/constants'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchUserEvents } from '@/lib/api'
import { UserTimeline } from '@/components/ui/user-timeline'

const LIMIT_OPTIONS = [50, 100, 200, 500]

export interface UserTimelineModalProps {
  userId: string | null
  connectionId: string | null
  open: boolean
  onClose: () => void
}

export function UserTimelineModal({ userId, connectionId, open, onClose }: UserTimelineModalProps) {
  const [limit, setLimit] = useState(100)

  const { data, isLoading } = useQuery({
    queryKey: ['userEvents', userId, connectionId, limit],
    queryFn: () =>
      fetchUserEvents({ user_id: userId!, connection_id: connectionId ?? undefined, limit }),
    enabled: open && !!userId,
    staleTime: QUERY_STALE_TIME.short,
  })

  const events = data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight">
                User Timeline
              </DialogTitle>
              {userId && (
                <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">{userId}</p>
              )}
            </div>
          </div>
          {!isLoading && events.length > 0 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </p>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs bg-transparent border border-border rounded px-1.5 py-0.5 text-muted-foreground cursor-pointer"
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    last {n}
                  </option>
                ))}
              </select>
            </div>
          )}
        </DialogHeader>

        {/* Timeline */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 py-5">
            <UserTimeline events={events} isLoading={isLoading} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
