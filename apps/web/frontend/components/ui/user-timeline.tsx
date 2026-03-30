import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ChevronDown, ChevronRight, Activity } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Event } from '@/types'

const EVENT_PALETTE = [
  {
    dot: 'bg-violet-500',
    ring: 'ring-violet-500/25',
    text: 'text-violet-600 dark:text-violet-400',
  },
  { dot: 'bg-blue-500', ring: 'ring-blue-500/25', text: 'text-blue-600 dark:text-blue-400' },
  { dot: 'bg-cyan-500', ring: 'ring-cyan-500/25', text: 'text-cyan-600 dark:text-cyan-400' },
  { dot: 'bg-success', ring: 'ring-success/25', text: 'text-success' },
  { dot: 'bg-amber-500', ring: 'ring-amber-500/25', text: 'text-amber-600 dark:text-amber-400' },
  {
    dot: 'bg-orange-500',
    ring: 'ring-orange-500/25',
    text: 'text-orange-600 dark:text-orange-400',
  },
  { dot: 'bg-rose-500', ring: 'ring-rose-500/25', text: 'text-rose-600 dark:text-rose-400' },
  { dot: 'bg-pink-500', ring: 'ring-pink-500/25', text: 'text-pink-600 dark:text-pink-400' },
]

function getEventColor(eventName: string | null | undefined) {
  const s = eventName ?? ''
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) & 0x7fffffff
  }
  return EVENT_PALETTE[hash % EVENT_PALETTE.length]
}

function PropertiesExpander({
  properties,
}: {
  properties: Record<string, unknown> | null | undefined
}) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(properties ?? {})
  if (entries.length === 0) return null

  return (
    <div className="mt-1">
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {entries.length} {entries.length === 1 ? 'property' : 'properties'}
      </button>
      {open && (
        <div className="mt-1.5 ml-1 rounded-md border border-border/50 bg-muted/30 overflow-hidden">
          <table className="w-full text-xs">
            <tbody>
              {entries.map(([key, val]) => (
                <tr key={key} className="border-b border-border/30 last:border-0">
                  <td className="py-1 pl-2.5 pr-3 font-medium text-muted-foreground whitespace-nowrap w-1/3">
                    {key}
                  </td>
                  <td className="py-1 pr-2.5 text-foreground break-all">{String(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
            {i < 5 && <div className="w-0.5 flex-1 bg-border/30 min-h-[2.5rem] my-1" />}
          </div>
          <div className="flex-1 pb-6 space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelineEvent({ event, isLast }: { event: Event; isLast: boolean }) {
  const color = getEventColor(event.event_name)
  const ts = event.timestamp ? new Date(event.timestamp) : null
  const props = event.properties ?? {}
  const hasProps = Object.keys(props).length > 0

  return (
    <li className="flex gap-3.5">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={cn(
            'h-7 w-7 rounded-full flex items-center justify-center ring-4 bg-background z-10',
            color.dot,
            color.ring
          )}
        >
          <span className="text-white text-xs font-bold leading-none">
            {event.event_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border/50 min-h-[2rem] my-1" />}
      </div>
      <div className={cn('flex-1 min-w-0', isLast ? 'pb-0' : 'pb-5')}>
        <div className="flex items-start justify-between gap-2 pt-0.5">
          <span className={cn('text-sm font-semibold leading-snug', color.text)}>
            {event.event_name}
          </span>
          {ts && (
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-muted-foreground tabular-nums">
                {format(ts, 'MMM d, yyyy HH:mm:ss')}
              </div>
              <div className="text-xs text-muted-foreground/60">
                {formatDistanceToNow(ts, { addSuffix: true })}
              </div>
            </div>
          )}
        </div>
        {hasProps && <PropertiesExpander properties={props} />}
      </div>
    </li>
  )
}

export interface UserTimelineProps {
  events: Event[]
  isLoading: boolean
}

export function UserTimeline({ events, isLoading }: UserTimelineProps) {
  if (isLoading) return <TimelineSkeleton />

  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <Activity className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">No events found for this user</p>
      </div>
    )
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <TimelineEvent
          key={`${event.event_name}-${event.timestamp}-${index}`}
          event={event}
          isLast={index === events.length - 1}
        />
      ))}
    </ol>
  )
}
