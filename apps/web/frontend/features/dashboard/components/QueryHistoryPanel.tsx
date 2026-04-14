import { useEffect, useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'

export function QueryHistoryPanel() {
  const history = useAppStore((s) => s.queryHistory)
  const [, setTick] = useState(0)
  const hasRunning = history.some((q) => q.status === 'running')
  useEffect(() => {
    if (!hasRunning) return
    const id = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [hasRunning])

  if (!history.length) {
    return <p className="p-2 text-xs text-muted-foreground">No recent queries</p>
  }

  return (
    <ul className="flex max-h-80 w-80 flex-col gap-1 overflow-auto p-1 text-xs">
      {history.map((q) => {
        const durationMs = (q.finishedAt ?? Date.now()) - q.startedAt
        const durationS = (durationMs / 1000).toFixed(1)
        const Icon = q.status === 'running' ? Loader2 : q.status === 'done' ? Check : X
        const iconCls =
          q.status === 'running'
            ? 'animate-spin text-primary'
            : q.status === 'done'
              ? 'text-success'
              : 'text-destructive'
        return (
          <li key={q.id} className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-muted">
            <Icon className={cn('h-3 w-3 mt-0.5 shrink-0', iconCls)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{q.cardName}</span>
                <span className="tabular-nums text-muted-foreground">{durationS}s</span>
              </div>
              <div className="truncate font-mono text-muted-foreground">{q.querySnippet}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
