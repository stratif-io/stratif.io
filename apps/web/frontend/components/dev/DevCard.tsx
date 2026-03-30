import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'
import { format as formatSql } from 'sql-formatter'
import { AnimatePresence, motion } from 'framer-motion'
import { Minimize2, PanelRightClose, PanelRightOpen, Play, Terminal } from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import { executeQueryStudio } from '@/lib/api/queries'
import type { QueryStudioResponse } from '@/types'

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#0000ff' },
  { tag: tags.string, color: '#a31515' },
  { tag: tags.number, color: '#098658' },
  { tag: tags.comment, color: '#008000', fontStyle: 'italic' },
  { tag: tags.operator, color: '#000000' },
  { tag: tags.punctuation, color: '#000000' },
  { tag: tags.name, color: '#001080' },
  { tag: tags.typeName, color: '#267f99' },
  { tag: tags.function(tags.name), color: '#795e26' },
])

function sqlLabel(q: string): string {
  const upper = q.toUpperCase()
  // WITH ... AS (...) SELECT ... FROM <table>  →  try to get the outermost FROM
  const fromMatch = upper.match(/\bFROM\s+([\w.]+)/)
  if (fromMatch) {
    const raw = fromMatch[1].toLowerCase()
    // strip schema prefix (schema.table → table)
    return raw.includes('.') ? raw.split('.').pop()! : raw
  }
  // INSERT INTO <table>
  const insertMatch = upper.match(/\bINSERT\s+INTO\s+([\w.]+)/)
  if (insertMatch) return insertMatch[1].toLowerCase()
  // UPDATE <table>
  const updateMatch = upper.match(/\bUPDATE\s+([\w.]+)/)
  if (updateMatch) return updateMatch[1].toLowerCase()
  // Fallback: first word
  const first = q.trim().split(/\s+/)[0]
  return first ? first.toLowerCase() : 'query'
}

function prettySql(q: string): string {
  try {
    return formatSql(q, { language: 'sql', tabWidth: 2, keywordCase: 'upper' })
  } catch {
    return q
  }
}

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

function SqlViewer({
  query,
  dark,
  fontSize = '11px',
}: {
  query: string
  dark: boolean
  fontSize?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: prettySql(query),
        extensions: [
          sql(),
          ...(dark ? [oneDark] : [syntaxHighlighting(lightHighlightStyle)]),
          EditorState.readOnly.of(true),
          EditorView.theme(
            {
              '&': { fontSize, background: dark ? '#282c34' : '#ffffff' },
              '&.cm-focused': { outline: 'none' },
              '.cm-content': { padding: '4px 0' },
              '.cm-gutters': { display: 'none' },
              '.cm-scroller': { overflow: 'auto' },
            },
            { dark }
          ),
        ],
      }),
      parent: containerRef.current,
    })
    return () => view.destroy()
  }, [query, dark, fontSize])

  return <div ref={containerRef} />
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface DevCardProps {
  sql?: string | string[] | null
  sqlLabels?: string | string[]
  children: React.ReactNode
  className?: string
}

export function DevCard({ sql, sqlLabels, children, className }: DevCardProps) {
  return (
    <DevCardInner sql={sql} sqlLabels={sqlLabels} className={className}>
      {children}
    </DevCardInner>
  )
}

function ResultsTable({
  result,
  running,
}: {
  result: QueryStudioResponse | null
  running: boolean
}) {
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => setPage(0), [result])

  if (running) {
    return <p className="px-4 py-3 text-xs text-muted-foreground animate-pulse">Running…</p>
  }
  if (!result) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground italic">
        Click Run to execute the query.
      </p>
    )
  }
  if (result.error) {
    return (
      <div className="px-4 py-3">
        <p className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono whitespace-pre-wrap">
          {result.error}
        </p>
      </div>
    )
  }

  const allRows = result.rows
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const rows = allRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col h-full">
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1 px-3 py-1.5 border-b border-border shrink-0">
          <button
            onClick={() => setPage(0)}
            disabled={safePage === 0}
            className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages - 1)}
            disabled={safePage === totalPages - 1}
            className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            »
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground italic">Query returned no rows.</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="sticky top-0 bg-muted/80">
                <th className="w-8 border-b border-border px-2 py-1.5 text-right text-[10px] font-medium text-muted-foreground">
                  #
                </th>
                {result.columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-border px-3 py-1.5 text-left font-semibold text-foreground whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  <td className="border-b border-border px-2 py-1 text-right text-[10px] text-muted-foreground">
                    {safePage * PAGE_SIZE + i + 1}
                  </td>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="border-b border-border px-3 py-1 whitespace-nowrap font-mono text-[11px]"
                    >
                      {cell === null || cell === undefined ? (
                        <span className="italic text-muted-foreground">null</span>
                      ) : typeof cell === 'object' ? (
                        <span className="truncate max-w-[200px] inline-block align-bottom">
                          {JSON.stringify(cell)}
                        </span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function DevCardInner({ sql, sqlLabels, children, className }: DevCardProps) {
  const devMode = useAppStore((s) => s.devMode)
  const setPendingQueryStudioSql = useAppStore((s) => s.setPendingQueryStudioSql)
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const navigate = useNavigate()
  const dark = useIsDark()
  const [rotation, setRotation] = useState(0)
  const flipped = (rotation / 180) % 2 === 1
  const [expanded, setExpanded] = useState(false)
  const [cardRect, setCardRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [queryResults, setQueryResults] = useState<Record<number, QueryStudioResponse | null>>({})
  const [queryRunning, setQueryRunning] = useState<Record<number, boolean>>({})
  const [activeResultIndex, setActiveResultIndex] = useState(0)
  const [resultsOpen, setResultsOpen] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false)
        setRotation((r) => Math.round(r / 360) * 360)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [expanded])

  const runQuery = useCallback(
    async (q: string, index: number) => {
      setQueryRunning((r) => ({ ...r, [index]: true }))
      setActiveResultIndex(index)
      setResultsOpen(true)
      try {
        const res = await executeQueryStudio({
          sql: q,
          connection_id: activeConnectionId ?? undefined,
        })
        setQueryResults((r) => ({ ...r, [index]: res }))
      } catch (e) {
        setQueryResults((r) => ({
          ...r,
          [index]: { columns: [], rows: [], execution_time_ms: 0, error: String(e) },
        }))
      } finally {
        setQueryRunning((r) => ({ ...r, [index]: false }))
      }
    },
    [activeConnectionId]
  )

  // Reset results when collapsed
  useEffect(() => {
    if (!expanded) {
      setQueryResults({})
      setQueryRunning({})
      setActiveResultIndex(0)
    }
  }, [expanded])

  if (!devMode) return <>{children}</>

  const queries = sql ? (Array.isArray(sql) ? sql : [sql]) : []
  const labels = sqlLabels ? (Array.isArray(sqlLabels) ? sqlLabels : [sqlLabels]) : []
  const getLabel = (q: string, i: number) => labels[i] ?? sqlLabel(q)
  const multiQuery = queries.length > 1

  const sqlBg = dark ? 'bg-[#282c34] border-border' : 'bg-white border-border'

  function openInStudio(query: string, collapseFirst?: () => void) {
    collapseFirst?.()
    setPendingQueryStudioSql(prettySql(query))
    navigate('/query-studio')
  }

  const sqlContent = (fontSize: string, collapseFirst?: () => void) => (
    <>
      {queries.length === 0 ? (
        <p className="text-[10px] italic text-muted-foreground">No SQL available</p>
      ) : (
        queries.map((q, i) => (
          <div key={i}>
            {multiQuery && (
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-mono text-muted-foreground">-- {getLabel(q, i)}</p>
                <button
                  onClick={() => openInStudio(q, collapseFirst)}
                  aria-label="Open in SQL Studio"
                  title="Open in SQL Studio"
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                    'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  <Terminal className="h-3 w-3" />
                  SQL Editor
                </button>
              </div>
            )}
            <SqlViewer query={q} dark={dark} fontSize={fontSize} />
            {i < queries.length - 1 && <hr className="my-2 border-border" />}
          </div>
        ))
      )}
    </>
  )

  function expand() {
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect)
      setCardRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    setExpanded(true)
  }

  function collapse() {
    setExpanded(false)
    setRotation((r) => Math.round(r / 360) * 360)
  }

  const collapsed: Rect = cardRect ?? { top: 0, left: 0, width: 200, height: 100 }
  const expandedRect: Rect = {
    top: window.innerHeight * 0.1,
    left: window.innerWidth * 0.1,
    width: window.innerWidth * 0.8,
    height: window.innerHeight * 0.75,
  }

  const firstQuery = queries[0]

  return (
    <>
      {/* Card with 3D flip */}
      <div
        ref={cardRef}
        className={cn('group relative flex flex-col', className)}
        style={{ perspective: '1000px' }}
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.45s ease',
            transform: `rotateY(${rotation}deg)`,
            position: 'relative',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Front face */}
          <div style={{ backfaceVisibility: 'hidden', height: '100%' }}>
            {children}
            <button
              onClick={() => setRotation((r) => r + 180)}
              aria-label="Show SQL"
              className="absolute top-2 right-2 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            >
              SQL
            </button>
          </div>

          {/* Back face */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              position: 'absolute',
              inset: 0,
            }}
            className={cn('rounded-[inherit] border flex flex-col', sqlBg)}
          >
            {flipped && (
              <div className="flex items-center justify-end gap-1.5 px-2 py-1.5 shrink-0 border-b border-border">
                {!multiQuery && firstQuery && (
                  <button
                    onClick={() => openInStudio(firstQuery)}
                    aria-label="Open in SQL Studio"
                    title="Open in SQL Studio"
                    className={cn(
                      'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                      'bg-muted text-muted-foreground hover:bg-muted/70'
                    )}
                  >
                    <Terminal className="h-3 w-3" />
                    SQL Editor
                  </button>
                )}
                <button
                  onClick={expand}
                  aria-label="Expand SQL"
                  className="transition-colors text-muted-foreground hover:text-foreground"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M1 8v3h3M11 4V1H8M1 4V1h3M11 8v3H8" />
                  </svg>
                </button>
                <button
                  onClick={() => setRotation((r) => Math.round(r / 360) * 360)}
                  aria-label="Close SQL"
                  className="text-sm leading-none transition-colors text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex-1 overflow-auto p-3">{sqlContent('11px')}</div>
          </div>
        </div>
      </div>

      {/* Expand overlay — separate from the flip, animates via measured rect */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={collapse}
            />
            <motion.div
              key="panel"
              className={cn('fixed z-50 flex flex-col overflow-hidden border', sqlBg)}
              initial={{ ...collapsed, borderRadius: 8 }}
              animate={{ ...expandedRect, borderRadius: 12 }}
              exit={{ ...collapsed, borderRadius: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
                <span className="text-xs font-mono font-semibold text-foreground">
                  SQL
                  {multiQuery && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {queries.length} queries
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {!multiQuery && firstQuery && (
                    <button
                      onClick={() => openInStudio(firstQuery, collapse)}
                      aria-label="Open in SQL Studio"
                      title="Open in SQL Studio"
                      className={cn(
                        'flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                        'bg-muted text-muted-foreground hover:bg-muted/70'
                      )}
                    >
                      <Terminal className="h-3 w-3" />
                      SQL Editor
                    </button>
                  )}
                  <button
                    onClick={() => setResultsOpen((o) => !o)}
                    aria-label={resultsOpen ? 'Hide results' : 'Show results'}
                    title={resultsOpen ? 'Hide results' : 'Show results'}
                    className="transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {resultsOpen ? (
                      <PanelRightClose className="h-3.5 w-3.5" />
                    ) : (
                      <PanelRightOpen className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={collapse}
                    aria-label="Collapse"
                    className="transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Body: SQL left | Results right */}
              <div className="flex flex-1 min-h-0 divide-x divide-border">
                {/* Left: SQL */}
                <div
                  className={cn(
                    'flex flex-col min-w-0 overflow-hidden',
                    resultsOpen ? 'w-[45%]' : 'flex-1'
                  )}
                >
                  <div className="flex-1 overflow-auto p-4">
                    {queries.length === 0 ? (
                      <p className="text-[10px] italic text-muted-foreground">No SQL available</p>
                    ) : (
                      queries.map((q, i) => (
                        <div key={i}>
                          {multiQuery && (
                            <div className="flex items-center justify-between mb-1">
                              <button
                                onClick={() => setActiveResultIndex(i)}
                                className={cn(
                                  'text-[9px] font-mono transition-colors',
                                  activeResultIndex === i
                                    ? 'text-primary font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                — {getLabel(q, i)}
                              </button>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => runQuery(q, i)}
                                  disabled={queryRunning[i]}
                                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                                >
                                  <Play className="h-2.5 w-2.5" />
                                  {queryRunning[i] ? 'Running…' : 'Run'}
                                </button>
                                <button
                                  onClick={() => openInStudio(q, collapse)}
                                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                                >
                                  <Terminal className="h-2.5 w-2.5" />
                                  Editor
                                </button>
                              </div>
                            </div>
                          )}
                          <SqlViewer query={q} dark={dark} fontSize="13px" />
                          {i < queries.length - 1 && <hr className="my-3 border-border" />}
                        </div>
                      ))
                    )}
                  </div>
                  {/* Run button for single query */}
                  {!multiQuery && firstQuery && (
                    <div className="px-4 py-2 border-t border-border shrink-0">
                      <button
                        onClick={() => runQuery(firstQuery, 0)}
                        disabled={queryRunning[0]}
                        className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                      >
                        <Play className="h-3 w-3" />
                        {queryRunning[0] ? 'Running…' : queryResults[0] ? 'Re-run' : 'Run'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Results */}
                {resultsOpen && (
                  <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background/50">
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <ResultsTable
                        result={queryResults[activeResultIndex] ?? null}
                        running={queryRunning[activeResultIndex] ?? false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
