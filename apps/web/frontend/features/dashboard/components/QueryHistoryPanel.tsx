import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Code2,
  ExternalLink,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SqlViewer } from '@/components/ui/sql-viewer'
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

function QueryRow({
  entry,
  onViewSql,
}: {
  entry: QueryHistoryEntry
  onViewSql: (e: QueryHistoryEntry) => void
}) {
  const hasSql = !!entry.sql

  return (
    <div
      role={hasSql ? 'button' : undefined}
      tabIndex={hasSql ? 0 : undefined}
      onClick={() => hasSql && onViewSql(entry)}
      onKeyDown={(e) => {
        if (hasSql && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onViewSql(entry)
        }
      }}
      className={cn(
        'flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors duration-150',
        hasSql
          ? 'cursor-pointer hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'hover:bg-muted/40',
        entry.status === 'failed' && 'bg-destructive/5 hover:bg-destructive/10'
      )}
    >
      <div className="mt-0.5">
        <StatusIcon status={entry.status} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold leading-tight">{entry.cardName}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <ElapsedBadge entry={entry} />
            {hasSql && (
              <Code2 className="h-3 w-3 text-muted-foreground/60" aria-label="SQL available" />
            )}
          </div>
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

function SqlDialog({
  entry,
  open,
  onClose,
}: {
  entry: QueryHistoryEntry | null
  open: boolean
  onClose: () => void
}) {
  const theme = useAppStore((s) => s.theme)
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const setPendingQueryStudioSql = useAppStore((s) => s.setPendingQueryStudioSql)
  const navigate = useNavigate()

  if (!entry?.sql) return null

  const queries = Array.isArray(entry.sql) ? entry.sql : [entry.sql]

  function openInStudio(q: string) {
    onClose()
    setPendingQueryStudioSql(q)
    navigate('/query-studio')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl h-[70vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-4 py-3 border-b shrink-0 space-y-0">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-semibold truncate">{entry.cardName}</DialogTitle>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
              {entry.querySnippet}
            </p>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto divide-y divide-border">
          {queries.map((q, i) => (
            <div key={i} className="flex flex-col">
              {queries.length > 1 && (
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Query {i + 1} of {queries.length}
                  </span>
                  <button
                    onClick={() => openInStudio(q)}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Studio
                  </button>
                </div>
              )}
              <div className="flex-1 p-2">
                <SqlViewer query={q} dark={dark} fontSize="13px" />
              </div>
              {queries.length === 1 && (
                <div className="px-4 py-2.5 border-t flex justify-end">
                  <button
                    onClick={() => openInStudio(q)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in SQL Studio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function QueryHistoryPanel() {
  const history = useAppStore((s) => s.queryHistory)
  const navigate = useNavigate()
  const [selectedEntry, setSelectedEntry] = useState<QueryHistoryEntry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openSqlDialog(entry: QueryHistoryEntry) {
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
        <Clock className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">No recent queries</p>
        <button
          onClick={() => navigate('/query-log')}
          className="text-[11px] text-primary hover:underline mt-1"
        >
          View full log →
        </button>
      </div>
    )
  }

  const running = history.filter((e) => e.status === 'running')
  const failed = history.filter((e) => e.status === 'failed')
  const done = history.filter((e) => e.status === 'done')

  return (
    <>
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

        {/* Hint when SQL is available */}
        {history.some((e) => e.sql) && (
          <p className="px-2.5 pt-2 text-[10px] text-muted-foreground/60 italic">
            Click a row to view its SQL
          </p>
        )}

        {/* Body */}
        <div className="max-h-72 overflow-y-auto pb-1.5">
          {running.length > 0 && (
            <section>
              <SectionLabel label="Running" count={running.length} />
              {running.map((e) => (
                <QueryRow key={e.id} entry={e} onViewSql={openSqlDialog} />
              ))}
            </section>
          )}

          {failed.length > 0 && (
            <section>
              <SectionLabel label="Failed" count={failed.length} />
              {failed.map((e) => (
                <QueryRow key={e.id} entry={e} onViewSql={openSqlDialog} />
              ))}
            </section>
          )}

          {done.length > 0 && (
            <section>
              {(running.length > 0 || failed.length > 0) && (
                <SectionLabel label="Completed" count={done.length} />
              )}
              {done.map((e) => (
                <QueryRow key={e.id} entry={e} onViewSql={openSqlDialog} />
              ))}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="text-[10px] text-muted-foreground/60">Session queries</span>
          <button
            onClick={() => navigate('/query-log')}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline transition-colors"
          >
            View full log
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      <SqlDialog entry={selectedEntry} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
