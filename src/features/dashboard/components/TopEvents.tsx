import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Zap } from 'lucide-react'

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>Top Events</CardTitle>
        </div>
        <CardDescription>Most frequent events in period</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.count.toLocaleString()} events
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
