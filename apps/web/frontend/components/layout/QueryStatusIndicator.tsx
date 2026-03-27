import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores'
import { IDLE_DISMISS_DELAY_MS } from '@/lib/api/semaphore'
import { cn } from '@/lib/utils'

export function QueryStatusIndicator() {
  const runningQueries = useAppStore((s) => s.runningQueries)
  const queuedQueries = useAppStore((s) => s.queuedQueries)
  const queryEverActive = useAppStore((s) => s.queryEverActive)

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
        'relative rounded-full border border-border bg-muted px-3 py-1 text-xs transition-opacity duration-700',
        hidden ? 'invisible opacity-0' : fading ? 'opacity-0' : 'opacity-100'
      )}
    >
      {/* Ghost: fixed max-width content — drives the container width */}
      <span className="invisible flex items-center gap-1.5 whitespace-nowrap" aria-hidden>
        <span className="inline-block h-1.5 w-1.5 rounded-full" />
        <span className="font-semibold">99 running</span>
        <span>·</span>
        <span>99 queued</span>
      </span>

      {/* Real content — overlaid absolutely */}
      <span className="absolute inset-0 flex items-center justify-center gap-1.5 px-3">
        {isActive ? (
          <>
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500 shrink-0" />
            <span className="text-indigo-400 font-semibold whitespace-nowrap">
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
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-muted-foreground whitespace-nowrap">all done</span>
          </>
        )}
      </span>
    </div>
  )
}
