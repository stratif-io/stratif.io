import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { QueryStudioResponse } from '@/types'

interface ResultsPanelProps {
  result: QueryStudioResponse | null
  isRunning: boolean
  history: string[]
  onRestoreHistory: (sql: string) => void
}

type Tab = 'results' | 'history'

const MAX_DISPLAY_ROWS = 1000

export function ResultsPanel({ result, isRunning, history, onRestoreHistory }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('results')

  const rows = result?.rows.slice(0, MAX_DISPLAY_ROWS) ?? []
  const truncated = (result?.rows.length ?? 0) > MAX_DISPLAY_ROWS

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
          <span className="ml-auto px-3 text-[10px] text-muted-foreground">
            {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} · {result.execution_time_ms}ms
            {truncated && ` · showing first ${MAX_DISPLAY_ROWS}`}
          </span>
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
                            <span className="font-mono text-[10px] italic text-muted-foreground">
                              null
                            </span>
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
