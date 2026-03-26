import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { format as formatSql } from 'sql-formatter'
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion'
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

  const layoutId = useRef(`devcard-${Math.random().toString(36).slice(2)}`).current

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

  return (
    <LayoutGroup>
      <div className={cn('relative', className)}>
        {/* Card content */}
        <div style={{ height: '100%' }}>
          {children}
        </div>

        {/* SQL badge */}
        {!showSql && (
          <button
            onClick={() => setShowSql(true)}
            aria-label="Show SQL"
            className="absolute top-2 right-2 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 transition-colors"
          >
            SQL
          </button>
        )}

        {/* Inline SQL overlay — source of the expand animation */}
        <AnimatePresence>
          {showSql && !expanded && (
            <motion.div
              layoutId={layoutId}
              className={cn('absolute inset-0 border rounded-[inherit] overflow-auto p-3', sqlBg)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ zIndex: 10 }}
            >
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  onClick={() => setExpanded(true)}
                  aria-label="Expand SQL"
                  className={cn(
                    'transition-colors',
                    dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 8v3h3M11 4V1H8M1 4V1h3M11 8v3H8" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowSql(false)}
                  aria-label="Close SQL"
                  className={cn(
                    'text-[10px] transition-colors',
                    dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  ✕
                </button>
              </div>
              {sqlContent('11px')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded overlay */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
            />
            <motion.div
              layoutId={layoutId}
              className={cn(
                'fixed z-50 flex flex-col overflow-hidden border',
                sqlBg,
              )}
              style={{ borderRadius: 12, top: '10vh', left: '10vw', width: '80vw', height: '75vh' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <div className={cn(
                'flex items-center justify-between px-4 py-2.5 border-b shrink-0',
                dark ? 'border-slate-700' : 'border-slate-200',
              )}>
                <span className={cn('text-xs font-mono font-semibold', dark ? 'text-slate-300' : 'text-slate-600')}>
                  SQL
                  {queries.length > 1 && (
                    <span className={cn('ml-2 font-normal', dark ? 'text-slate-500' : 'text-slate-400')}>
                      {queries.length} queries
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  aria-label="Collapse"
                  className={cn(
                    'transition-colors',
                    dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {sqlContent('13px')}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </LayoutGroup>
  )
}
