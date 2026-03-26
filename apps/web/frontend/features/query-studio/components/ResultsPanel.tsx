import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { QueryStudioResponse } from '@/types'

interface ResultsPanelProps {
  result: QueryStudioResponse | null
  isRunning: boolean
  history: string[]
  onRestoreHistory: (sql: string) => void
}

type Tab = 'results' | 'history'

const PAGE_SIZE = 50

export function ResultsPanel({ result, isRunning, history, onRestoreHistory }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('results')
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [result])

  const allRows = result?.rows ?? []
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const rows = allRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  return (
    <div className="flex h-full flex-col border-t">
      {/* Tabs */}
      <div className="flex items-center border-b bg-muted/30">
        {(['results', 'history'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'border-b-2 px-4 py-1.5 text-[11px] font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
        {result && !result.error && activeTab === 'results' && (
          <div className="ml-auto flex items-center gap-2 px-3">
            <span className="text-[10px] text-muted-foreground">
              {allRows.length} row{allRows.length !== 1 ? 's' : ''} · {result.execution_time_ms}ms
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(0)}
                  disabled={safePage === 0}
                  className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="First page"
                >«</button>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Previous page"
                >‹</button>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage === totalPages - 1}
                  className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Next page"
                >›</button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={safePage === totalPages - 1}
                  className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Last page"
                >»</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'results' && (
          <>
            {isRunning && (
              <p className="px-4 py-3 text-xs text-muted-foreground">Running...</p>
            )}
            {!isRunning && result?.error && (
              <div className="px-4 py-3">
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono">
                  {result.error}
                </p>
              </div>
            )}
            {!isRunning && result && !result.error && (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="sticky top-0 bg-muted/60">
                    <th className="w-8 border-b px-2 py-1.5 text-right text-[10px] font-medium text-muted-foreground">
                      #
                    </th>
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        className="border-b px-3 py-1.5 text-left font-semibold text-foreground whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/40 transition-colors">
                      <td className="border-b px-2 py-1 text-right text-[10px] text-muted-foreground">
                        {i + 1}
                      </td>
                      {row.map((cell, j) => (
                        <td key={j} className="border-b px-3 py-1 whitespace-nowrap">
                          {cell === null || cell === undefined ? (
                            <span className="font-mono text-[10px] italic text-muted-foreground">null</span>
                          ) : typeof cell === 'object' ? (
                            <span className="font-mono text-[10px]">{JSON.stringify(cell)}</span>
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
            {!isRunning && !result && (
              <p className="px-4 py-3 text-xs text-muted-foreground">
                Run a query to see results.
              </p>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="divide-y">
            {history.length === 0 && (
              <p className="px-4 py-3 text-xs text-muted-foreground">No queries run yet.</p>
            )}
            {history.map((q, i) => (
              <button
                key={i}
                onClick={() => onRestoreHistory(q)}
                className="block w-full px-4 py-2 text-left font-mono text-[10px] text-muted-foreground hover:bg-muted/40 transition-colors truncate"
                title={q}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
