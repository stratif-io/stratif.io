import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Table2, Database, Layers, Columns } from 'lucide-react'
import { fetchConnectionTables, fetchConnectionColumns } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { TableEntry } from '@/types'
import { cn } from '@/lib/utils'

interface CatalogBrowserProps {
  onTableClick: (tableName: string) => void
  onColumnClick: (columnName: string) => void
}

interface ColumnRowProps {
  connId: string
  table: TableEntry
  onColumnClick: (name: string) => void
  indent: string
}

function ColumnRows({ connId, table, onColumnClick, indent }: ColumnRowProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['columns', connId, table.full_name],
    queryFn: () => fetchConnectionColumns(connId, table.full_name),
    staleTime: QUERY_STALE_TIME.never,
  })

  if (isLoading) return <div className={cn(indent, 'py-1 text-[10px] text-muted-foreground')}>Loading…</div>

  return (
    <>
      {(data?.columns ?? []).map((col) => (
        <button
          key={col}
          onClick={() => onColumnClick(col)}
          title="Insert column name"
          className={cn('flex w-full items-center gap-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors group', indent)}
        >
          <Columns className="h-2.5 w-2.5 shrink-0 opacity-50" />
          <span className="flex-1 text-left">{col}</span>
          <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary mr-2" />
        </button>
      ))}
    </>
  )
}

interface TreeNode {
  catalog: string | null
  schema: string | null
  tables: TableEntry[]
}

function buildTree(tables: TableEntry[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  for (const t of tables) {
    const key = `${t.catalog ?? ''}::${t.table_schema ?? ''}`
    if (!map.has(key)) map.set(key, { catalog: t.catalog, schema: t.table_schema, tables: [] })
    map.get(key)!.tables.push(t)
  }
  return Array.from(map.values())
}

export function CatalogBrowser({ onTableClick, onColumnClick }: CatalogBrowserProps) {
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const [search, setSearch] = useState('')
  const [expandedCatalogs, setExpandedCatalogs] = useState<Set<string>>(new Set())
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['query-studio-tables', activeConnectionId],
    queryFn: () => fetchConnectionTables(activeConnectionId ?? ''),
    enabled: !!activeConnectionId,
    staleTime: QUERY_STALE_TIME.never,
  })

  const allTables: TableEntry[] = data?.tables ?? []
  const filtered = search
    ? allTables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTables

  const tree = buildTree(filtered)
  const hasCatalogs = tree.some((n) => n.catalog !== null)
  const hasSchemas = tree.some((n) => n.schema !== null)

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setter(next)
  }

  const chevron = (open: boolean) =>
    open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
         : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />

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
          placeholder="Search tables…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-muted px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>}
        {!activeConnectionId && <p className="px-3 py-2 text-xs text-muted-foreground">No connection active.</p>}

        {tree.map((node) => {
          const catalogKey = node.catalog ?? '__none__'
          const schemaKey = `${catalogKey}::${node.schema ?? '__none__'}`
          const catalogOpen = hasCatalogs ? expandedCatalogs.has(catalogKey) : true
          const schemaOpen = hasSchemas ? expandedSchemas.has(schemaKey) : true

          const schemaContent = (
            <div key={schemaKey}>
              {hasSchemas && (
                <button
                  onClick={() => toggle(expandedSchemas, schemaKey, setExpandedSchemas)}
                  className={cn('flex w-full items-center gap-1.5 py-1 text-left text-xs hover:bg-muted transition-colors', hasCatalogs ? 'pl-5' : 'pl-2')}
                >
                  {chevron(schemaOpen)}
                  <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">{node.schema}</span>
                </button>
              )}
              {schemaOpen && node.tables.map((table) => {
                const tableOpen = expandedTables.has(table.full_name)
                return (
                  <div key={table.full_name}>
                    <div className={cn('flex w-full items-center gap-1.5 py-1 text-left text-xs hover:bg-muted transition-colors group', hasCatalogs && hasSchemas ? 'pl-8' : hasSchemas || hasCatalogs ? 'pl-5' : 'pl-2')}>
                      <button
                        onClick={() => toggle(expandedTables, table.full_name, setExpandedTables)}
                        className="flex items-center gap-1.5 flex-1 min-w-0"
                      >
                        {chevron(tableOpen)}
                        <Table2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span
                          className="truncate font-medium hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); onTableClick(table.full_name) }}
                        >
                          {table.name}
                        </span>
                      </button>
                    </div>
                    {tableOpen && activeConnectionId && (
                      <ColumnRows
                        connId={activeConnectionId}
                        table={table}
                        onColumnClick={onColumnClick}
                        indent={hasCatalogs && hasSchemas ? 'pl-12' : hasSchemas || hasCatalogs ? 'pl-9' : 'pl-6'}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )

          if (!hasCatalogs) return schemaContent

          return (
            <div key={catalogKey}>
              <button
                onClick={() => toggle(expandedCatalogs, catalogKey, setExpandedCatalogs)}
                className="flex w-full items-center gap-1.5 pl-2 py-1 text-left text-xs hover:bg-muted transition-colors"
              >
                {chevron(catalogOpen)}
                <Database className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="font-medium">{node.catalog}</span>
              </button>
              {catalogOpen && schemaContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}
