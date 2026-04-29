import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores'
import { IDLE_DISMISS_DELAY_MS } from '@/lib/api/semaphore'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { QueryHistoryPanel } from '@/features/dashboard/components/QueryHistoryPanel'

export function QueryStatusIndicator() {
  const runningQueries = useAppStore((s) => s.runningQueries)
  const queuedQueries = useAppStore((s) => s.queuedQueries)
  const queryEverActive = useAppStore((s) => s.queryEverActive)
  const lastCompletedName = useAppStore((s) => s.lastCompletedName)
  const queryHistory = useAppStore((s) => s.queryHistory)

  const runningEntry = queryHistory.find((e) => e.status === 'running')

  const isActive = runningQueries > 0 || queuedQueries > 0
  const isDone = queryEverActive && !isActive

  const [fading, setFading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isActive) {
      setFading(false)
      setDismissed(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isActive])

  useEffect(() => {
    if (isDone && !fading && !dismissed) {
      timerRef.current = setTimeout(() => {
        setFading(true)
      }, IDLE_DISMISS_DELAY_MS)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isDone, fading, dismissed])

  const hidden = !queryEverActive || dismissed

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={hidden}
      onTransitionEnd={() => {
        if (fading) setDismissed(true)
      }}
      className={cn(
        'transition-opacity duration-700',
        hidden ? 'invisible opacity-0' : fading ? 'opacity-0' : 'opacity-100'
      )}
    >
      <Popover>
        <PopoverTrigger
          type="button"
          aria-label="Show query history"
          className="relative rounded-full border border-border bg-muted px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Real content */}
          <span className="flex items-center gap-1.5">
            {isActive ? (
              <>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary shrink-0" />
                {runningEntry && (
                  <span className="text-muted-foreground whitespace-nowrap">
                    {runningEntry.cardName}
                  </span>
                )}
                {runningEntry && <span className="text-muted-foreground">·</span>}
                <span className="text-primary/70 font-semibold whitespace-nowrap">
                  {runningQueries} running
                </span>
                {queuedQueries > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {queuedQueries} queued
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">
                  {lastCompletedName ?? 'all done'}
                </span>
              </>
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="p-0">
          <QueryHistoryPanel />
        </PopoverContent>
      </Popover>
    </div>
  )
}
