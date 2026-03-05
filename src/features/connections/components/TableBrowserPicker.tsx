import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Database, FolderOpen, Table2, Check, Loader2, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchBrowse } from '@/lib/api/queries'

interface BrowseItem {
  name: string
  full_name: string
  kind: string // "catalog" | "schema" | "table"
}

interface Props {
  connId: string
  value: string
  onChange: (fullName: string) => void
  loading?: boolean
}

interface Level {
  label: string
  catalog?: string
  schema?: string
}

const ICONS: Record<string, React.ElementType> = {
  catalog: Database,
  schema: FolderOpen,
  table: Table2,
}

function useBrowse(connId: string, catalog?: string, schema?: string) {
  return useQuery({
    queryKey: ['browse', connId, catalog ?? '', schema ?? ''],
    queryFn: () => fetchBrowse(connId, catalog, schema),
    staleTime: 5 * 60 * 1000,
  })
}

export function TableBrowserPicker({ connId, value, onChange, loading: externalLoading }: Props) {
  // Stack of levels navigated into; starts at root
  const [stack, setStack] = useState<Level[]>([{ label: 'All' }])
  const current = stack[stack.length - 1]

  const { data, isLoading } = useBrowse(connId, current.catalog, current.schema)
  const items: BrowseItem[] = data?.items ?? []

  function enter(item: BrowseItem) {
    if (item.kind === 'table') {
      onChange(item.full_name)
      return
    }
    if (item.kind === 'catalog') {
      setStack((s) => [...s, { label: item.name, catalog: item.name }])
    } else {
      // schema
      setStack((s) => [...s, { label: item.name, catalog: current.catalog, schema: item.name }])
    }
  }

  function goTo(idx: number) {
    setStack((s) => s.slice(0, idx + 1))
  }

  if (externalLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground h-10 px-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Connecting…
      </div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/40 border-b text-xs min-h-[36px]">
        {stack.length > 1 && (
          <button
            onClick={() => setStack((s) => s.slice(0, -1))}
            className="text-muted-foreground hover:text-foreground transition-colors mr-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
        {stack.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            {i < stack.length - 1 ? (
              <button
                onClick={() => goTo(i)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
      </div>

      {/* Item list */}
      <ul className="max-h-52 overflow-y-auto divide-y divide-border/50">
        {!isLoading && items.length === 0 && (
          <li className="px-3 py-4 text-sm text-muted-foreground text-center">Nothing here.</li>
        )}
        {items.map((item) => {
          const Icon = ICONS[item.kind] ?? Table2
          const selected = item.kind === 'table' && item.full_name === value
          const isLeaf = item.kind === 'table'
          return (
            <li key={item.full_name}>
              <button
                onClick={() => enter(item)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left',
                  selected && 'bg-primary/5',
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5 flex-shrink-0',
                    selected ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <span className={cn('flex-1', selected && 'font-medium text-primary')}>
                  {item.name}
                </span>
                {selected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                {!isLeaf && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Selected value footer */}
      {value && (
        <div className="px-3 py-1.5 border-t bg-muted/20 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Selected:</span>
          <span className="font-mono font-medium text-foreground">{value}</span>
        </div>
      )}
    </div>
  )
}
