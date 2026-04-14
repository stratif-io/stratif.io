import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import type { QueryHistoryEntry } from '@/stores/app-store'

function ElapsedBadge({ entry }: { entry: QueryHistoryEntry }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (entry.status !== 'running') return
    const id = setInterval(() => setTick((t) => t + 1), 200)
    return () => clearInterval(id)
  }, [entry.status])

  const ms = (entry.finishedAt ?? Date.now()) - entry.startedAt
  const label = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`

  return (
    <span
      className={cn(
        'tabular-nums text-[10px] font-medium shrink-0',
        entry.status === 'running'
          ? 'text-primary'
          : entry.status === 'done'
            ? 'text-muted-foreground'
            : 'text-destructive'
      )}
    >
      {label}
    </span>
  )
}

function StatusIcon({ status }: { status: QueryHistoryEntry['status'] }) {
  if (status === 'running')
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
  if (status === 'done') return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
  return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
}

function QueryRow({ entry }: { entry: QueryHistoryEntry }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-muted/60',
        entry.status === 'failed' && 'bg-destructive/5 hover:bg-destructive/10'
      )}
    >
      <div className="mt-0.5">
        <StatusIcon status={entry.status} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold leading-tight">{entry.cardName}</span>
          <ElapsedBadge entry={entry} />
        </div>
        <p className="truncate font-mono text-[10px] leading-tight text-muted-foreground">
          {entry.querySnippet}
        </p>
      </div>
    </div>
  )
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  )
}

export function QueryHistoryPanel() {
  const history = useAppStore((s) => s.queryHistory)

  if (!history.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
        <Clock className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">No recent queries</p>
      </div>
    )
  }

  const running = history.filter((e) => e.status === 'running')
  const failed = history.filter((e) => e.status === 'failed')
  const done = history.filter((e) => e.status === 'done')

  return (
    <div className="flex w-80 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-xs font-semibold">Query activity</span>
        <div className="flex items-center gap-2.5 text-[10px]">
          {running.length > 0 && (
            <span className="flex items-center gap-1 text-primary">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {running.length} running
            </span>
          )}
          {failed.length > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {failed.length} failed
            </span>
          )}
          {running.length === 0 && failed.length === 0 && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3 w-3" />
              all done
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-h-72 overflow-y-auto pb-1.5">
        {running.length > 0 && (
          <section>
            <SectionLabel label="Running" count={running.length} />
            {running.map((e) => (
              <QueryRow key={e.id} entry={e} />
            ))}
          </section>
        )}

        {failed.length > 0 && (
          <section>
            <SectionLabel label="Failed" count={failed.length} />
            {failed.map((e) => (
              <QueryRow key={e.id} entry={e} />
            ))}
          </section>
        )}

        {done.length > 0 && (
          <section>
            {(running.length > 0 || failed.length > 0) && (
              <SectionLabel label="Completed" count={done.length} />
            )}
            {done.map((e) => (
              <QueryRow key={e.id} entry={e} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
