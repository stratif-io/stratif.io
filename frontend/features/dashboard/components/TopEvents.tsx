import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <Card>
      <CardHeader>
        <CardTitle>Top Events</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted/40" />
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
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between gap-3">
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
                <div className="h-1 bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/50 transition-[width] duration-500"
                    style={{ width: `${(event.count / max) * 100}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
