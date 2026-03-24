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

  // When queries become active again, reset dismissed state
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

  // Start dismiss timer when done
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

  if (!queryEverActive || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      onTransitionEnd={() => { if (fading) setDismissed(true) }}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs transition-opacity duration-300',
        fading && 'opacity-0'
      )}
    >
      {isActive ? (
        <>
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
          <span className="text-indigo-400 font-semibold">{runningQueries} running</span>
          {queuedQueries > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{queuedQueries} queued</span>
            </>
          )}
        </>
      ) : (
        <>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-muted-foreground">all done</span>
        </>
      )}
    </div>
  )
}
