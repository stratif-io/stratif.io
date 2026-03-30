import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Activity,
  X,
  Monitor,
  MapPin,
  Globe,
  Clock,
  User,
  Tag,
  MousePointerClick,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { getEventColor } from '@/lib/event-color'
import type { Event } from '@/types'

// ─── Property categories ─────────────────────────────────────────────────────

type Category = {
  id: string
  label: string
  icon: React.ElementType
  keywords: string[]
}

const CATEGORIES: Category[] = [
  {
    id: 'device',
    label: 'Device',
    icon: Monitor,
    keywords: [
      'device',
      'os',
      'browser',
      'screen',
      'platform',
      'user_agent',
      'viewport',
      'resolution',
    ],
  },
  {
    id: 'location',
    label: 'Location',
    icon: MapPin,
    keywords: ['country', 'city', 'region', 'timezone', 'locale', 'language', 'lat', 'lon'],
  },
  {
    id: 'traffic',
    label: 'Traffic',
    icon: Globe,
    keywords: ['source', 'referrer', 'campaign', 'medium', 'utm', 'channel', 'ad', 'keyword'],
  },
  {
    id: 'session',
    label: 'Session',
    icon: Clock,
    keywords: ['session', 'duration', 'page', 'url', 'path', 'title', 'tab', 'scroll'],
  },
  {
    id: 'user',
    label: 'User',
    icon: User,
    keywords: ['plan', 'tier', 'role', 'subscription', 'user_type', 'segment', 'cohort'],
  },
]

function categorise(key: string): Category {
  const lower = key.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat
  }
  return { id: 'other', label: 'Other', icon: Tag, keywords: [] }
}

// ─── Event properties panel ───────────────────────────────────────────────────

export function EventPropertiesPanel({
  event,
  onClose,
}: {
  event: Event | null
  onClose?: () => void
}) {
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <MousePointerClick className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground/60">Click an event to inspect its properties</p>
      </div>
    )
  }

  const color = getEventColor(event.event_name)
  const ts = event.timestamp ? new Date(event.timestamp) : null
  const entries = Object.entries(event.properties ?? {})

  const grouped = new Map<string, { cat: Category; entries: [string, unknown][] }>()
  for (const entry of entries) {
    const cat = categorise(entry[0])
    if (!grouped.has(cat.id)) grouped.set(cat.id, { cat, entries: [] })
    grouped.get(cat.id)!.entries.push(entry)
  }
  const catOrder = [...CATEGORIES.map((c) => c.id), 'other']
  const groups = [...grouped.values()].sort(
    (a, b) => catOrder.indexOf(a.cat.id) - catOrder.indexOf(b.cat.id)
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={cn('text-sm font-semibold leading-snug block truncate', color.text)}>
            {event.event_name}
          </span>
          {ts && (
            <div className="text-xs text-muted-foreground/60 tabular-nums mt-0.5">
              {format(ts, 'MMM d, yyyy HH:mm:ss')}
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            aria-label="Close properties"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-5">
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 italic">No properties</p>
          ) : (
            groups.map(({ cat, entries: catEntries }) => {
              const Icon = cat.icon
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </div>
                  <div className="space-y-2 pl-0.5">
                    {catEntries.map(([key, val]) => (
                      <div key={key} className="flex flex-col min-w-0">
                        <span className="text-xs text-muted-foreground/50 leading-none">{key}</span>
                        <span className="text-xs text-foreground break-all leading-snug mt-0.5">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Timeline event row ───────────────────────────────────────────────────────

function TimelineEvent({
  event,
  isLast,
  isSelected,
  onClick,
}: {
  event: Event
  isLast: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const color = getEventColor(event.event_name)
  const ts = event.timestamp ? new Date(event.timestamp) : null
  const hasProps = Object.keys(event.properties ?? {}).length > 0

  return (
    <li
      className={cn(
        'flex gap-3.5 rounded-md -mx-2 px-2 cursor-pointer transition-colors',
        isSelected ? 'bg-muted/60' : 'hover:bg-muted/30'
      )}
      onClick={onClick}
    >
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
      <div className={cn('flex-1 min-w-0 pt-0.5', isLast ? 'pb-0' : 'pb-5')}>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-sm font-semibold leading-snug', color.text)}>
            {event.event_name}
          </span>
          {hasProps && !isSelected && (
            <MousePointerClick className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
          )}
        </div>
        {ts && (
          <div className="mt-0.5">
            <div className="text-xs text-muted-foreground tabular-nums">
              {format(ts, 'MMM d, yyyy HH:mm:ss')}
            </div>
            <div className="text-xs text-muted-foreground/60">
              {formatDistanceToNow(ts, { addSuffix: true })}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface UserTimelineProps {
  events: Event[]
  isLoading: boolean
  /** Controlled mode: selected event managed by parent */
  selectedEvent?: Event | null
  onEventSelect?: (event: Event | null) => void
}

export function UserTimeline({
  events,
  isLoading,
  selectedEvent: controlledSelected,
  onEventSelect,
}: UserTimelineProps) {
  const [internalSelected, setInternalSelected] = useState<Event | null>(null)

  const isControlled = onEventSelect !== undefined
  const selectedEvent = isControlled ? (controlledSelected ?? null) : internalSelected

  function handleSelect(event: Event) {
    const next = selectedEvent === event ? null : event
    if (isControlled) {
      onEventSelect(next)
    } else {
      setInternalSelected(next)
    }
  }

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

  const list = (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <TimelineEvent
          key={`${event.event_name}-${event.timestamp}-${index}`}
          event={event}
          isLast={index === events.length - 1}
          isSelected={selectedEvent === event}
          onClick={() => handleSelect(event)}
        />
      ))}
    </ol>
  )

  // Uncontrolled: render list + inline properties panel
  if (!isControlled) {
    return (
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">{list}</div>
        {selectedEvent && (
          <div className="w-64 flex-shrink-0 border-l border-border/50 pl-4">
            <EventPropertiesPanel event={selectedEvent} onClose={() => setInternalSelected(null)} />
          </div>
        )}
      </div>
    )
  }

  // Controlled: parent owns the panel, just render the list
  return list
}
