import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowLeft,
  Database,
  ExternalLink,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { SqlViewer } from '@/components/ui/sql-viewer'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { PageTransition } from '@/components/layout/PageTransition'
import type { QueryHistoryEntry } from '@/stores/app-store'

function useIsDark(): boolean {
  const theme = useAppStore((s) => s.theme)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      setDark(mq.matches)
      const handler = (e: MediaQueryListEvent) => setDark(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      setDark(theme === 'dark')
    }
  }, [theme])

  return dark
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 1000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

function formatDuration(entry: QueryHistoryEntry): string {
  const end = entry.finishedAt ?? Date.now()
  const ms = end - entry.startedAt
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

type StatusFilter = 'all' | 'running' | 'done' | 'failed'

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'done', label: 'Done' },
  { id: 'failed', label: 'Failed' },
]

function StatusBadge({ status }: { status: QueryHistoryEntry['status'] }) {
  if (status === 'running')
    return (
      <span className="flex items-center gap-1 text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-[10px] font-medium">running</span>
      </span>
    )
  if (status === 'done')
    return (
      <span className="flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium">done</span>
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-destructive">
      <XCircle className="h-3.5 w-3.5" />
      <span className="text-[10px] font-medium">failed</span>
    </span>
  )
}

function QueryLogRow({
  entry,
  dark,
  expanded,
  onToggle,
  onOpenInStudio,
}: {
  entry: QueryHistoryEntry
  dark: boolean
  expanded: boolean
  onToggle: () => void
  onOpenInStudio: (sql: string) => void
}) {
  const hasSql = !!entry.sql
  const queries = entry.sql ? (Array.isArray(entry.sql) ? entry.sql : [entry.sql]) : []

  return (
    <div
      className={cn(
        'border-b border-border last:border-0 transition-colors duration-150',
        entry.status === 'failed' && 'bg-destructive/3'
      )}
    >
      {/* Row */}
      <div
        role={hasSql ? 'button' : undefined}
        tabIndex={hasSql ? 0 : undefined}
        onClick={hasSql ? onToggle : undefined}
        onKeyDown={(e) => {
          if (hasSql && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onToggle()
          }
        }}
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          hasSql
            ? 'cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50'
            : 'hover:bg-muted/30'
        )}
      >
        {/* Expand chevron */}
        <span className="w-4 shrink-0 text-muted-foreground/40">
          {hasSql ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : null}
        </span>

        {/* Status */}
        <div className="w-20 shrink-0">
          <StatusBadge status={entry.status} />
        </div>

        {/* Card name + snippet */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{entry.cardName}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground leading-tight mt-0.5">
            {entry.querySnippet}
            {queries.length > 1 && (
              <span className="ml-1 text-muted-foreground/60">· {queries.length} queries</span>
            )}
          </p>
        </div>

        {/* Duration */}
        <span className="tabular-nums text-xs text-muted-foreground shrink-0 w-14 text-right">
          {formatDuration(entry)}
        </span>

        {/* Timestamp */}
        <span className="tabular-nums text-[10px] text-muted-foreground/60 shrink-0 w-16 text-right">
          {formatRelativeTime(entry.startedAt)}
        </span>
      </div>

      {/* SQL expansion */}
      {expanded && hasSql && (
        <div className="border-t border-border bg-muted/20">
          {queries.map((q, i) => (
            <div key={i} className={cn(i > 0 && 'border-t border-border')}>
              {queries.length > 1 && (
                <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30">
                  <span className="text-[10px] font-mono text-muted-foreground">Query {i + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenInStudio(q)
                    }}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Studio
                  </button>
                </div>
              )}
              <div className="px-4 py-3">
                <SqlViewer query={q} dark={dark} fontSize="12px" />
              </div>
              {queries.length === 1 && (
                <div className="flex justify-end px-4 pb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenInStudio(q)
                    }}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in SQL Studio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function QueryLogPage() {
  useEffect(() => {
    document.title = 'Query Log — stratif.io'
  }, [])

  const navigate = useNavigate()
  const dark = useIsDark()
  const queryLog = useAppStore((s) => s.queryLog)
  const clearQueryLog = useAppStore((s) => s.clearQueryLog)
  const setPendingQueryStudioSql = useAppStore((s) => s.setPendingQueryStudioSql)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showAuxiliary, setShowAuxiliary] = useState(false)

  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openInStudio(sql: string) {
    setPendingQueryStudioSql(sql)
    navigate('/query-studio')
  }

  const visibleLog = showAuxiliary ? queryLog : queryLog.filter((e) => !e.auxiliary)
  const filtered =
    statusFilter === 'all' ? visibleLog : visibleLog.filter((e) => e.status === statusFilter)

  const counts = {
    running: visibleLog.filter((e) => e.status === 'running').length,
    done: visibleLog.filter((e) => e.status === 'done').length,
    failed: visibleLog.filter((e) => e.status === 'failed').length,
  }
  const auxiliaryCount = queryLog.filter((e) => e.auxiliary).length

  return (
    <PageTransition>
      <div className={SPACING.page}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className={TYPOGRAPHY.pageLabel}>Query Log</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {queryLog.length === 0
                  ? 'No queries this session'
                  : `${visibleLog.length} quer${visibleLog.length === 1 ? 'y' : 'ies'} this session`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {auxiliaryCount > 0 && (
              <button
                onClick={() => setShowAuxiliary((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
                  showAuxiliary
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {showAuxiliary ? 'Hide' : 'Show'} dimension queries
                <span className="rounded-full bg-muted px-1.5 py-px text-[10px]">
                  {auxiliaryCount}
                </span>
              </button>
            )}
            {queryLog.length > 0 && (
              <button
                onClick={clearQueryLog}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear log
              </button>
            )}
          </div>
        </div>

        {/* Status filter tabs */}
        {queryLog.length > 0 && (
          <div className="flex items-center gap-1 mb-4 border-b border-border">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.id === 'all' ? queryLog.length : counts[tab.id as keyof typeof counts]
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                    statusFilter === tab.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-px text-[10px]',
                        statusFilter === tab.id
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Table */}
        {queryLog.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Database className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No queries yet this session</p>
            <p className="text-xs text-muted-foreground/60">
              Queries will appear here as you navigate the dashboard
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">No {statusFilter} queries</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="w-4 shrink-0" />
              <span className="w-20 shrink-0">Status</span>
              <span className="flex-1">Query</span>
              <span className="w-14 text-right shrink-0">Duration</span>
              <span className="w-16 text-right shrink-0">Time</span>
            </div>

            {filtered.map((entry) => (
              <QueryLogRow
                key={entry.id}
                entry={entry}
                dark={dark}
                expanded={expandedIds.has(entry.id)}
                onToggle={() => toggleRow(entry.id)}
                onOpenInStudio={openInStudio}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
