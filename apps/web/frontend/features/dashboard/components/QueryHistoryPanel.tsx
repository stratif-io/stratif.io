import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SqlViewer } from '@/components/ui/sql-viewer'
import type { QueryHistoryEntry } from '@/stores/app-store'

// ── Elapsed timer ─────────────────────────────────────────────────────────────

function useElapsed(entry: QueryHistoryEntry) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (entry.status !== 'running') return
    const id = setInterval(() => setTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [entry.status])
  const ms = (entry.finishedAt ?? Date.now()) - entry.startedAt
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: QueryHistoryEntry['status'] }) {
  if (status === 'running')
    return <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
  if (status === 'done') return <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
  return <XCircle className="h-3 w-3 text-destructive shrink-0" />
}

// ── Row ───────────────────────────────────────────────────────────────────────

function QueryRow({
  entry,
  onViewSql,
}: {
  entry: QueryHistoryEntry
  onViewSql: (e: QueryHistoryEntry) => void
}) {
  const elapsed = useElapsed(entry)
  const hasSql = !!entry.sql

  return (
    <div
      role={hasSql ? 'button' : undefined}
      tabIndex={hasSql ? 0 : undefined}
      title={hasSql ? 'Click to view SQL' : undefined}
      onClick={() => hasSql && onViewSql(entry)}
      onKeyDown={(e) => {
        if (hasSql && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onViewSql(entry)
        }
      }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 transition-colors duration-100',
        hasSql
          ? 'cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none'
          : '',
        entry.status === 'failed' ? 'bg-destructive/5' : ''
      )}
    >
      <StatusDot status={entry.status} />

      <div className="min-w-0 flex-1 leading-none">
        <p className="truncate text-xs font-medium">{entry.cardName}</p>
        <p className="truncate text-[10px] text-muted-foreground/60 font-mono mt-0.5">
          {entry.querySnippet}
        </p>
      </div>

      <div className="shrink-0 text-right leading-none">
        <p
          className={cn(
            'text-[10px] font-medium tabular-nums',
            entry.status === 'running' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {elapsed}
        </p>
        {hasSql && <p className="text-[9px] text-muted-foreground/40 mt-0.5">sql</p>}
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <p className="flex items-center gap-1.5 px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
      {label}
      <span className="rounded-full bg-muted px-1.5 py-px font-medium text-muted-foreground">
        {count}
      </span>
    </p>
  )
}

// ── SQL dialog ────────────────────────────────────────────────────────────────

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
      <DialogContent className="max-w-2xl h-[65vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">{entry.cardName}</DialogTitle>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
            {entry.querySnippet}
          </p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto divide-y divide-border">
          {queries.map((q, i) => (
            <div key={i}>
              {queries.length > 1 && (
                <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Query {i + 1} / {queries.length}
                  </span>
                  <button
                    onClick={() => openInStudio(q)}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Open in Studio
                  </button>
                </div>
              )}
              <div className="p-3">
                <SqlViewer query={q} dark={dark} fontSize="12.5px" />
              </div>
              {queries.length === 1 && (
                <div className="flex justify-end px-4 py-2 border-t">
                  <button
                    onClick={() => openInStudio(q)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in SQL Studio
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

// ── Panel ─────────────────────────────────────────────────────────────────────

export function QueryHistoryPanel() {
  const history = useAppStore((s) => s.queryHistory)
  const navigate = useNavigate()
  const [selectedEntry, setSelectedEntry] = useState<QueryHistoryEntry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openSqlDialog(entry: QueryHistoryEntry) {
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  const running = history.filter((e) => e.status === 'running')
  const failed = history.filter((e) => e.status === 'failed')
  const done = history.filter((e) => e.status === 'done')

  return (
    <>
      <div className="w-72 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold">Query activity</span>
          <div className="flex items-center gap-2 text-[10px]">
            {running.length > 0 && (
              <span className="flex items-center gap-1 text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                {running.length} running
              </span>
            )}
            {failed.length > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> {failed.length} failed
              </span>
            )}
            {running.length === 0 && failed.length === 0 && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" /> all done
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="h-6 w-6 text-muted-foreground/25" />
            <p className="text-xs text-muted-foreground">No recent queries</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto py-1">
            {running.length > 0 && (
              <div>
                {(failed.length > 0 || done.length > 0) && (
                  <SectionLabel label="Running" count={running.length} />
                )}
                {running.map((e) => (
                  <QueryRow key={e.id} entry={e} onViewSql={openSqlDialog} />
                ))}
              </div>
            )}
            {failed.length > 0 && (
              <div>
                <SectionLabel label="Failed" count={failed.length} />
                {failed.map((e) => (
                  <QueryRow key={e.id} entry={e} onViewSql={openSqlDialog} />
                ))}
              </div>
            )}
            {done.length > 0 && (
              <div>
                {(running.length > 0 || failed.length > 0) && (
                  <SectionLabel label="Completed" count={done.length} />
                )}
                {done.map((e) => (
                  <QueryRow key={e.id} entry={e} onViewSql={openSqlDialog} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="text-[10px] text-muted-foreground/40">Session</span>
          <button
            onClick={() => navigate('/query-log')}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            View full log <ExternalLink className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      <SqlDialog entry={selectedEntry} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
