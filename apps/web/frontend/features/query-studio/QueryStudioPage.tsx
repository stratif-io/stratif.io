import { useCallback, useRef, useState } from 'react'
import { NoConnectionGuard } from '@/components/ui/no-connection-guard'
import { SPACING } from '@/lib/constants'
import { useQueryStudio } from './hooks/useQueryStudio'
import { CatalogBrowser } from './components/CatalogBrowser'
import { QueryEditor } from './components/QueryEditor'
import { ResultsPanel } from './components/ResultsPanel'

const MIN_EDITOR_HEIGHT = 80
const MIN_RESULTS_HEIGHT = 60

export function QueryStudioPage() {
  const { sql, setSql, result, isRunning, history, execute, restoreFromHistory } = useQueryStudio()
  const [editorHeight, setEditorHeight] = useState(380)
  const [limitEnabled, setLimitEnabled] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const handleTableClick = (tableName: string) => {
    const insertion = sql.trim()
      ? `${sql.trimEnd()}\n${tableName}`
      : `SELECT * FROM ${tableName} LIMIT 100`
    setSql(insertion)
  }

  const handleColumnClick = (columnName: string) => {
    setSql(sql.trimEnd() ? `${sql.trimEnd()}, ${columnName}` : columnName)
  }

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const containerTop = containerRef.current.getBoundingClientRect().top
      const containerHeight = containerRef.current.getBoundingClientRect().height
      const newEditorHeight = ev.clientY - containerTop
      const maxEditorHeight = containerHeight - MIN_RESULTS_HEIGHT
      setEditorHeight(Math.max(MIN_EDITOR_HEIGHT, Math.min(newEditorHeight, maxEditorHeight)))
    }

    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <NoConnectionGuard screenClassName={SPACING.page}>
      <div className="flex h-full flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* Catalog — fixed width */}
          <div className="w-52 shrink-0 h-full">
            <CatalogBrowser onTableClick={handleTableClick} onColumnClick={handleColumnClick} />
          </div>

          {/* Editor + Results — flex column */}
          <div ref={containerRef} className="flex flex-1 flex-col overflow-hidden border-l">
            <div style={{ height: editorHeight }} className="shrink-0 overflow-hidden">
              <QueryEditor
                value={sql}
                onChange={setSql}
                onExecute={execute}
                limitEnabled={limitEnabled}
                onLimitToggle={setLimitEnabled}
              />
            </div>

            {/* Drag handle */}
            <div
              onMouseDown={onDragStart}
              className="h-1.5 shrink-0 cursor-row-resize bg-border/40 hover:bg-primary/40 transition-colors"
              role="separator"
              aria-orientation="horizontal"
            />

            {/* Results panel — takes remaining space */}
            <div className="flex-1 overflow-hidden">
              <ResultsPanel
                result={result}
                isRunning={isRunning}
                hasRun={result !== null || history.length > 0}
                history={history}
                onRestoreHistory={restoreFromHistory}
              />
            </div>
          </div>
        </div>
      </div>
    </NoConnectionGuard>
  )
}
