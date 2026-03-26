import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { format as formatSql } from 'sql-formatter'
import { Maximize2 } from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

function SqlModal({ queries, dark, open, onClose }: {
  queries: string[]
  dark: boolean
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn(
        'max-w-4xl w-full h-[70vh] flex flex-col p-0 gap-0 overflow-hidden',
        dark ? 'bg-[#282c34] border-slate-700' : 'bg-white',
      )}>
        <DialogHeader className={cn(
          'px-4 py-3 border-b shrink-0',
          dark ? 'border-slate-700' : 'border-slate-200',
        )}>
          <DialogTitle className={cn('text-sm font-mono', dark ? 'text-slate-300' : 'text-slate-700')}>
            SQL
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
          {queries.map((q, i) => (
            <div key={i}>
              {queries.length > 1 && (
                <p className={cn('text-[10px] mb-1 font-mono', dark ? 'text-slate-500' : 'text-slate-400')}>
                  -- Query {i + 1}
                </p>
              )}
              <SqlViewer query={q} dark={dark} fontSize="13px" />
              {i < queries.length - 1 && (
                <hr className={cn('my-3', dark ? 'border-slate-700' : 'border-slate-200')} />
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface DevCardProps {
  sql?: string | string[] | null
  children: React.ReactNode
  className?: string
}

export function DevCard({ sql, children, className }: DevCardProps) {
  const devMode = useAppStore((s) => s.devMode)
  const dark = useIsDark()
  const [flipped, setFlipped] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  if (!devMode) return <>{children}</>

  const queries = sql ? (Array.isArray(sql) ? sql : [sql]) : []

  return (
    <>
      <div className={cn('relative', className)} style={{ perspective: '1000px' }}>
        <div
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.4s ease',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
            height: '100%',
          }}
        >
          {/* Front face */}
          <div style={{ backfaceVisibility: 'hidden', height: '100%' }}>
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
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                <button
                  onClick={() => setModalOpen(true)}
                  aria-label="Expand SQL"
                  className={cn(
                    'text-[10px] transition-colors',
                    dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setFlipped(false)}
                  aria-label="Close SQL"
                  className={cn(
                    'text-[10px] transition-colors',
                    dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  ✕
                </button>
              </div>
            )}
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
                  <SqlViewer query={q} dark={dark} />
                  {i < queries.length - 1 && <hr className="my-2 border-slate-700" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {queries.length > 0 && (
        <SqlModal
          queries={queries}
          dark={dark}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
