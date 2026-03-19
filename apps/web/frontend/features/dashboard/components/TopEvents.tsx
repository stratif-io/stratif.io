import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Skeleton } from '@/components/ui/skeleton'

export interface TopEvent {
  name: string
  count: number
}

export interface TopEventsProps {
  events: TopEvent[]
  loading?: boolean
}

export function TopEvents({ events, loading }: TopEventsProps) {
  const max = events[0]?.count ?? 1

  return (
    <Card className="relative overflow-hidden">
      <CardLoadingBar loading={loading} />
      <CardHeader>
        <CardTitle>Top Events</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No events in the selected period.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try expanding the date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs tabular-nums text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                    <p className="font-medium text-sm truncate">{event.name}</p>
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {event.count.toLocaleString()}
                  </p>
                </div>
                <div className="h-1 bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/50 transition-[width] duration-500"
                    style={{ width: `${(event.count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
