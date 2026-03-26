import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { format as formatSql } from 'sql-formatter'
import { AnimatePresence, motion } from 'framer-motion'
import { Minimize2 } from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'

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

function SqlViewer({ query, dark, fontSize = '11px' }: { query: string; dark: boolean; fontSize?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: prettySql(query),
        extensions: [
          sql(),
          ...(dark ? [oneDark] : [syntaxHighlighting(defaultHighlightStyle)]),
          EditorState.readOnly.of(true),
          EditorView.theme({
            '&': { fontSize, background: 'transparent' },
            '.cm-content': { padding: '4px 0' },
            '.cm-gutters': { display: 'none' },
            '.cm-scroller': { overflow: 'auto' },
          }),
        ],
      }),
      parent: containerRef.current,
    })
    return () => view.destroy()
  }, [query, dark, fontSize])

  return <div ref={containerRef} />
}

interface Rect { top: number; left: number; width: number; height: number }

const EXPANDED: Rect = {
  top: window.innerHeight * 0.1,
  left: window.innerWidth * 0.1,
  width: window.innerWidth * 0.8,
  height: window.innerHeight * 0.75,
}

interface DevCardProps {
  sql?: string | string[] | null
  children: React.ReactNode
  className?: string
}

export function DevCard({ sql, children, className }: DevCardProps) {
  const devMode = useAppStore((s) => s.devMode)
  const dark = useIsDark()
  const [showSql, setShowSql] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [cardRect, setCardRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  if (!devMode) return <>{children}</>

  const queries = sql ? (Array.isArray(sql) ? sql : [sql]) : []

  const sqlBg = dark ? 'bg-[#282c34] border-slate-700' : 'bg-slate-50 border-slate-200'

  const sqlContent = (fontSize: string) => (
    <>
      {queries.length === 0 ? (
        <p className={cn('text-[10px] italic', dark ? 'text-slate-500' : 'text-slate-400')}>
          No SQL available
        </p>
      ) : (
        queries.map((q, i) => (
          <div key={i}>
            {queries.length > 1 && (
              <p className={cn('text-[9px] mb-1 font-mono', dark ? 'text-slate-500' : 'text-slate-400')}>
                -- Query {i + 1}
              </p>
            )}
            <SqlViewer query={q} dark={dark} fontSize={fontSize} />
            {i < queries.length - 1 && (
              <hr className={cn('my-2', dark ? 'border-slate-700' : 'border-slate-200')} />
            )}
          </div>
        ))
      )}
    </>
  )

  function openSql() {
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) setCardRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    setShowSql(true)
  }

  function expand() {
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) setCardRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    setExpanded(true)
  }

  function collapse() {
    setExpanded(false)
  }

  const collapsed: Rect = cardRect ?? { top: 0, left: 0, width: 200, height: 100 }
  const target: Rect = expanded ? {
    top: window.innerHeight * 0.1,
    left: window.innerWidth * 0.1,
    width: window.innerWidth * 0.8,
    height: window.innerHeight * 0.75,
  } : collapsed

  return (
    <>
      <div ref={cardRef} className={cn('relative', className)}>
        <div style={{ height: '100%' }}>{children}</div>

        {/* SQL badge */}
        {!showSql && (
          <button
            onClick={openSql}
            aria-label="Show SQL"
            className="absolute top-2 right-2 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 transition-colors"
          >
            SQL
          </button>
        )}

        {/* Placeholder to prevent layout shift when panel is fixed */}
        {showSql && <div className="absolute inset-0 rounded-[inherit] border border-dashed border-amber-200 opacity-40 pointer-events-none" />}
      </div>

      {/* Single fixed panel — animates between card rect and expanded rect */}
      <AnimatePresence>
        {showSql && (
          <>
            {expanded && (
              <motion.div
                key="backdrop"
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={collapse}
              />
            )}

            <motion.div
              key="panel"
              className={cn('fixed z-50 flex flex-col overflow-hidden border', sqlBg)}
              initial={{ ...collapsed, borderRadius: 8, opacity: 0 }}
              animate={{ ...target, borderRadius: expanded ? 12 : 8, opacity: 1 }}
              exit={{ ...collapsed, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Toolbar */}
              <div className={cn(
                'flex items-center justify-between px-3 py-2 border-b shrink-0',
                dark ? 'border-slate-700' : 'border-slate-200',
              )}>
                <span className={cn('text-[10px] font-mono font-semibold', dark ? 'text-slate-300' : 'text-slate-600')}>
                  SQL{queries.length > 1 && <span className={cn('ml-1.5 font-normal', dark ? 'text-slate-500' : 'text-slate-400')}>{queries.length} queries</span>}
                </span>
                <div className="flex items-center gap-2">
                  {expanded ? (
                    <button onClick={collapse} aria-label="Collapse" className={cn('transition-colors', dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}>
                      <Minimize2 className="h-3 w-3" />
                    </button>
                  ) : (
                    <button onClick={expand} aria-label="Expand" className={cn('transition-colors', dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 8v3h3M11 4V1H8M1 4V1h3M11 8v3H8" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => { setShowSql(false); setExpanded(false) }}
                    aria-label="Close SQL"
                    className={cn('text-[10px] transition-colors', dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-3">
                {sqlContent(expanded ? '13px' : '11px')}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
