import { useQueryStudio } from './hooks/useQueryStudio'
import { CatalogBrowser } from './components/CatalogBrowser'
import { QueryEditor } from './components/QueryEditor'
import { ResultsPanel } from './components/ResultsPanel'
import { SPACING } from '@/lib/constants'

export function QueryStudioPage() {
  const { sql, setSql, result, isRunning, history, execute, restoreFromHistory } = useQueryStudio()

  const handleTableClick = (tableName: string) => {
    const insertion = sql.trim()
      ? `${sql.trimEnd()}\n${tableName}`
      : `SELECT * FROM ${tableName} LIMIT 100`
    setSql(insertion)
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`${SPACING.page} border-b pb-3`}>
        <h1 className="text-xl font-bold">Query Studio</h1>
        <p className="text-sm text-muted-foreground">
          Execute SQL directly against your analytics connection
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Catalog — fixed width */}
        <div className="w-52 shrink-0 overflow-hidden">
          <CatalogBrowser onTableClick={handleTableClick} />
        </div>

        {/* Editor + Results — flex column */}
        <div className="flex flex-1 flex-col overflow-hidden border-l">
          <div className="flex-1 overflow-hidden">
            <QueryEditor value={sql} onChange={setSql} onExecute={execute} />
          </div>

          {/* Results panel */}
          <div className="h-52 shrink-0 overflow-hidden">
            <ResultsPanel
              result={result}
              isRunning={isRunning}
              history={history}
              onRestoreHistory={restoreFromHistory}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
