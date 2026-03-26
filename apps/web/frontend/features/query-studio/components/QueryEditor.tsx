import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { format } from 'sql-formatter'

const LIMIT_VALUE = 1000

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute: (limit: number | null) => void
  limitEnabled: boolean
  onLimitToggle: (enabled: boolean) => void
  tableNames?: string[]
}

export function QueryEditor({ value, onChange, onExecute, limitEnabled, onLimitToggle, tableNames = [] }: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const limitEnabledRef = useRef(limitEnabled)
  const onExecuteRef = useRef(onExecute)
  useEffect(() => { limitEnabledRef.current = limitEnabled }, [limitEnabled])
  useEffect(() => { onExecuteRef.current = onExecute }, [onExecute])

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
          oneDark,
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-background px-3 py-1.5">
        {/* Split run button */}
        <div className="flex items-stretch">
          <button
            onClick={() => onExecute(limitEnabled ? LIMIT_VALUE : null)}
            className="flex items-center gap-1.5 rounded-l-md bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            ▶ Run {limitEnabled ? `(${LIMIT_VALUE.toLocaleString()})` : ''}
          </button>
          <button
            onClick={() => onLimitToggle(!limitEnabled)}
            aria-label="Toggle row limit"
            title={limitEnabled ? 'Remove LIMIT 1000' : 'Apply LIMIT 1000'}
            className="flex items-center gap-1 rounded-r-md border-l border-primary-foreground/20 bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground/80 hover:bg-primary/90 hover:text-primary-foreground transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
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
