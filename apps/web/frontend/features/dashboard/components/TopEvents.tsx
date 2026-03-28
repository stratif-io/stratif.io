import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { TYPOGRAPHY } from '@/lib/constants'

export interface TopEvent {
  name: string
  count: number
}

export interface TopEventsProps {
  events: TopEvent[]
  loading?: boolean
}

export function TopEvents({ events, loading }: TopEventsProps) {
  return (
    <div className="relative space-y-3">
      <CardLoadingBar loading={loading} />
      <p className={TYPOGRAPHY.pageLabel}>Top Events</p>
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-start py-4">
          <p className="text-sm text-muted-foreground">No events in the selected period.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Try expanding the date range.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs tabular-nums text-muted-foreground w-4 shrink-0">
                  {idx + 1}
                </span>
                <p className="font-medium text-sm truncate">{event.name}</p>
              </div>
              <p className="text-xs tabular-nums text-muted-foreground shrink-0">
                {event.count.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
