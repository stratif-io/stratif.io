import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { format as formatSql } from 'sql-formatter'
import { AnimatePresence, motion } from 'framer-motion'
import { Minimize2, Terminal } from 'lucide-react'
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

interface DevCardProps {
  sql?: string | string[] | null
  children: React.ReactNode
  className?: string
}

export function DevCard({ sql, children, className }: DevCardProps) {
  const devMode = useAppStore((s) => s.devMode)
  const setPendingQueryStudioSql = useAppStore((s) => s.setPendingQueryStudioSql)
  const navigate = useNavigate()
  const dark = useIsDark()
  const [rotation, setRotation] = useState(0)
  const flipped = (rotation / 180) % 2 === 1
  const [expanded, setExpanded] = useState(false)
  const [cardRect, setCardRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setExpanded(false); setRotation((r) => Math.round(r / 360) * 360) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [expanded])

  if (!devMode) return <>{children}</>

  const firstQuery = Array.isArray(sql) ? sql[0] : sql

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

  function expand() {
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) setCardRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
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

  return (
    <>
      {/* Card with 3D flip */}
      <div ref={cardRef} className={cn('relative flex flex-col', className)} style={{ perspective: '1000px' }}>
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
              className="absolute top-2 right-2 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 transition-colors"
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
              <div className={cn('flex items-center justify-end gap-1.5 px-2 py-1.5 shrink-0 border-b', dark ? 'border-slate-700' : 'border-slate-200')}>
                {firstQuery && (
                  <button
                    onClick={() => { setPendingQueryStudioSql(prettySql(firstQuery)); navigate('/query-studio') }}
                    aria-label="Open in Query Studio"
                    title="Open in Query Studio"
                    className={cn('transition-colors', dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}
                  >
                    <Terminal className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={expand}
                  aria-label="Expand SQL"
                  className={cn('transition-colors', dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}
                >
                  <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 8v3h3M11 4V1H8M1 4V1h3M11 8v3H8" />
                  </svg>
                </button>
                <button
                  onClick={() => setRotation((r) => Math.round(r / 360) * 360)}
                  aria-label="Close SQL"
                  className={cn('text-sm leading-none transition-colors', dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex-1 overflow-auto p-3">
              {sqlContent('11px')}
            </div>
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
              <div className={cn('flex items-center justify-between px-4 py-2.5 border-b shrink-0', dark ? 'border-slate-700' : 'border-slate-200')}>
                <span className={cn('text-xs font-mono font-semibold', dark ? 'text-slate-300' : 'text-slate-600')}>
                  SQL
                  {queries.length > 1 && (
                    <span className={cn('ml-2 font-normal', dark ? 'text-slate-500' : 'text-slate-400')}>
                      {queries.length} queries
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {firstQuery && (
                    <button
                      onClick={() => { collapse(); setPendingQueryStudioSql(prettySql(firstQuery)); navigate('/query-studio') }}
                      aria-label="Open in Query Studio"
                      title="Open in Query Studio"
                      className={cn('flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors', dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                    >
                      <Terminal className="h-3 w-3" />
                      Query Studio
                    </button>
                  )}
                  <button
                    onClick={collapse}
                    aria-label="Collapse"
                    className={cn('transition-colors', dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {sqlContent('13px')}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
