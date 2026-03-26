import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { format as formatSql } from 'sql-formatter'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'

function prettySql(q: string): string {
  try {
    return formatSql(q, { language: 'sql', tabWidth: 2, keywordCase: 'upper' })
  } catch {
    return q
  }
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

function SqlViewer({ query }: { query: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dark = isDarkMode()

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: prettySql(query),
        extensions: [
          sql(),
          ...(dark ? [oneDark] : []),
          EditorState.readOnly.of(true),
          EditorView.theme({
            '&': { fontSize: '11px', background: 'transparent' },
            '.cm-content': { padding: '4px 0' },
            '.cm-gutters': { display: 'none' },
            '.cm-scroller': { overflow: 'auto' },
          }),
        ],
      }),
      parent: containerRef.current,
    })
    return () => view.destroy()
  }, [query, dark])

  return <div ref={containerRef} />
}

interface DevCardProps {
  sql?: string | string[] | null
  children: React.ReactNode
  className?: string
}

export function DevCard({ sql, children, className }: DevCardProps) {
  const devMode = useAppStore((s) => s.devMode)
  useAppStore((s) => s.theme) // subscribe so we re-render on theme change
  const [flipped, setFlipped] = useState(false)
  const dark = isDarkMode()

  if (!devMode) return <>{children}</>

  const queries = sql ? (Array.isArray(sql) ? sql : [sql]) : []

  return (
    <div className={cn('relative', className)} style={{ perspective: '1000px' }}>
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
        }}
      >
        {/* Front face */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          {children}
          <button
            onClick={() => setFlipped(true)}
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
          className={cn(
            'rounded-[inherit] overflow-auto p-3',
            dark ? 'bg-[#282c34]' : 'bg-slate-50 border border-slate-200',
          )}
        >
          {flipped && (
            <button
              onClick={() => setFlipped(false)}
              aria-label="Close SQL"
              className={cn(
                'absolute top-2 right-2 z-10 text-[10px] transition-colors',
                dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              ✕
            </button>
          )}
          {queries.length === 0 ? (
            <p className={cn('text-[10px] italic', dark ? 'text-slate-500' : 'text-slate-400')}>No SQL available</p>
          ) : (
            queries.map((q, i) => (
              <div key={i}>
                {queries.length > 1 && (
                  <p className={cn('text-[9px] mb-1 font-mono', dark ? 'text-slate-500' : 'text-slate-400')}>-- Query {i + 1}</p>
                )}
                <SqlViewer query={q} />
                {i < queries.length - 1 && <hr className="my-2 border-slate-700" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
