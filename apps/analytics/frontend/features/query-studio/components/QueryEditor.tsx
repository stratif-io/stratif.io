import { useEffect, useRef, useState } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { format } from 'sql-formatter'
import { useAppStore } from '@/stores'

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

const lightTheme = EditorView.theme(
  {
    '&': { background: '#ffffff', color: '#000000' },
    '.cm-content': { caretColor: '#000000' },
    '.cm-cursor': { borderLeftColor: '#000000' },
    '.cm-activeLine': { backgroundColor: '#f0f0f0' },
    '.cm-gutters': { background: '#f5f5f5', color: '#999', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: '#e8e8e8' },
    '.cm-selectionBackground': { backgroundColor: '#add6ff' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#add6ff' },
  },
  { dark: false }
)

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

const LIMIT_VALUE = 1000

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute: (limit: number | null) => void
  limitEnabled: boolean
  onLimitToggle: (enabled: boolean) => void
  tableNames?: string[]
}

export function QueryEditor({
  value,
  onChange,
  onExecute,
  limitEnabled,
  onLimitToggle,
  tableNames = [],
}: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartmentRef = useRef(new Compartment())
  const limitEnabledRef = useRef(limitEnabled)
  const onExecuteRef = useRef(onExecute)
  const dark = useIsDark()
  useEffect(() => {
    limitEnabledRef.current = limitEnabled
  }, [limitEnabled])
  useEffect(() => {
    onExecuteRef.current = onExecute
  }, [onExecute])

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          closeBrackets(),
          autocompletion(),
          sql({
            upperCaseKeywords: true,
            schema: tableNames.length
              ? Object.fromEntries(tableNames.map((t) => [t, []]))
              : undefined,
          }),
          themeCompartmentRef.current.of(
            dark ? oneDark : [lightTheme, syntaxHighlighting(lightHighlightStyle)]
          ),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            {
              key: 'Mod-Enter',
              run: () => {
                onExecuteRef.current(limitEnabledRef.current ? LIMIT_VALUE : null)
                return true
              },
            },
            {
              key: 'Mod-Shift-f',
              run: (v) => {
                try {
                  const formatted = format(v.state.doc.toString(), { language: 'sql' })
                  v.dispatch({
                    changes: { from: 0, to: v.state.doc.length, insert: formatted },
                  })
                } catch {
                  // ignore format errors
                }
                return true
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount once

  // Swap theme when dark mode changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        dark ? oneDark : [lightTheme, syntaxHighlighting(lightHighlightStyle)]
      ),
    })
  }, [dark])

  // Sync external value changes (e.g. restoring from history)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }
  }, [value])

  const handleFormat = () => {
    const view = viewRef.current
    if (!view) return
    try {
      const formatted = format(view.state.doc.toString(), { language: 'sql' })
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      })
      onChange(formatted)
    } catch {
      // ignore
    }
  }

  const [runMenuOpen, setRunMenuOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-background px-3 py-1.5">
        {/* Split run button */}
        <div className="relative flex items-stretch">
          <button
            onClick={() => onExecute(limitEnabled ? LIMIT_VALUE : null)}
            className="flex items-center gap-1.5 rounded-l-md bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            ▶ Run {limitEnabled ? `(${LIMIT_VALUE.toLocaleString()})` : ''}
          </button>
          <button
            onClick={() => setRunMenuOpen((o) => !o)}
            aria-label="Run options"
            className="flex items-center rounded-r-md border-l border-primary-foreground/20 bg-primary px-2 py-1 text-primary-foreground/80 hover:bg-primary/90 hover:text-primary-foreground transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {runMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRunMenuOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-md border bg-popover shadow-md overflow-hidden py-1">
                <p className="px-3 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  Run options
                </p>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[11px] hover:bg-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={limitEnabled}
                    onChange={(e) => onLimitToggle(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span>Limit {LIMIT_VALUE.toLocaleString()} rows</span>
                </label>
              </div>
            </>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">Cmd+Enter</span>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          onClick={handleFormat}
          className="rounded-md border bg-muted px-2 py-1 text-[11px] font-medium hover:bg-muted/80 transition-colors"
        >
          ⌥ Format
        </button>
        <button
          onClick={() => {
            onChange('')
            const view = viewRef.current
            if (view) {
              view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } })
            }
          }}
          className="rounded-md border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          ✕ Clear
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
      />
    </div>
  )
}
