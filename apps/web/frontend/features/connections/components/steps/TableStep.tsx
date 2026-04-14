import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useConnectionTables } from '../../hooks/useConnectionsData'
import { TableBrowserPicker } from '../TableBrowserPicker'

interface TableStepProps {
  connId: string
  currentTable: string
  onConfirm: (tableName: string) => void
}

export function TableStep({ connId, currentTable, onConfirm }: TableStepProps) {
  const { data: tablesData, isLoading } = useConnectionTables(connId, true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(currentTable)

  const allTables = tablesData?.tables ?? []
  const filtered = search.trim()
    ? allTables.filter((t) => t.full_name.toLowerCase().includes(search.toLowerCase()))
    : allTables

  if (isLoading) {
    return (
      <div className="p-5" data-testid="table-step-loading">
        <p className="text-sm text-muted-foreground">Loading tables…</p>
      </div>
    )
  }

  return (
    <div className="p-5 flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-sm font-bold text-foreground">Select Events Table</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Search across all schemas and tables.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tables…"
          className="pl-8 pr-8 h-9 text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {search.trim() ? (
        <div className="flex flex-col gap-1 overflow-auto max-h-52">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No tables found.</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.full_name}
              type="button"
              onClick={() => setSelected(t.full_name)}
              className={cn(
                'flex items-start justify-between px-3 py-2 rounded-md border text-left',
                selected === t.full_name
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-border bg-background hover:border-blue-300'
              )}
            >
              <span className="text-[11px] font-semibold text-foreground">{t.full_name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          <TableBrowserPicker connId={connId} value={selected} onChange={setSelected} />
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t gap-3">
        {selected ? (
          <div
            data-testid="selected-table-bar"
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/30 bg-primary/5 flex-1 min-w-0"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-mono font-semibold text-primary truncate">
              {selected}
            </span>
            <button
              type="button"
              onClick={() => setSelected('')}
              className="ml-auto text-[10px] text-muted-foreground hover:text-foreground shrink-0"
            >
              Clear
            </button>
          </div>
        ) : (
          <div />
        )}
        <Button
          size="sm"
          disabled={!selected}
          onClick={() => onConfirm(selected)}
          className="shrink-0"
        >
          Confirm Table →
        </Button>
      </div>
    </div>
  )
}
