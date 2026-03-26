import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Table2 } from 'lucide-react'
import { fetchConnectionTables } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { TableEntry } from '@/types'

interface CatalogBrowserProps {
  onTableClick: (tableName: string) => void
}

export function CatalogBrowser({ onTableClick }: CatalogBrowserProps) {
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['query-studio-tables', activeConnectionId],
    queryFn: () => fetchConnectionTables(activeConnectionId ?? ''),
    enabled: !!activeConnectionId,
    staleTime: QUERY_STALE_TIME.never,
  })

  const tables: TableEntry[] = data?.tables ?? []

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Catalog
        </span>
      </div>

      <div className="px-2 py-2">
        <input
          type="search"
          placeholder="Search tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-muted px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Loading...</p>
        )}
        {!activeConnectionId && (
          <p className="px-3 py-2 text-xs text-muted-foreground">No connection active.</p>
        )}
        {filteredTables.map((table) => {
          const isExpanded = expandedTables.has(table.name)
          return (
            <div key={table.full_name}>
              <button
                onClick={() => toggleTable(table.name)}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <Table2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span
                  className="cursor-pointer font-medium hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTableClick(table.full_name)
                  }}
                >
                  {table.name}
                </span>
              </button>
              {isExpanded && table.table_schema && (
                <div className="flex items-center justify-between px-3 py-1 pl-10 text-[10px] text-muted-foreground">
                  <span className="italic">{table.full_name}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
