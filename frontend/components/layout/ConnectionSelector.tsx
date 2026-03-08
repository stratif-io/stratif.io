import { useEffect } from 'react'
import { Database, ChevronDown, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores'
import { useConnections } from '@/features/connections/hooks/useConnectionsData'
import { cn } from '@/lib/utils'

const DB_TYPE_LABELS: Record<string, string> = {
  duckdb: 'DuckDB',
  postgresql: 'PostgreSQL',
  databricks: 'Databricks',
  sqlite: 'SQLite',
}

export function ConnectionSelector() {
  const { data: connections, isLoading } = useConnections()
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)

  // Auto-select the first connection if none is active
  useEffect(() => {
    if (!activeConnectionId && connections && connections.length > 0) {
      setActiveConnectionId(connections[0].id)
    }
  }, [connections, activeConnectionId, setActiveConnectionId])

  const activeConnection = connections?.find((c) => c.id === activeConnectionId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
        <Database className="h-3.5 w-3.5" />
        <span>Loading…</span>
      </div>
    )
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 px-2">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>No connection</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs font-medium max-w-[180px]"
        >
          <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{activeConnection?.name ?? 'Select connection'}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Active Connection
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {connections.map((conn) => (
          <DropdownMenuItem
            key={conn.id}
            onClick={() => setActiveConnectionId(conn.id)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              conn.id === activeConnectionId && 'bg-accent'
            )}
          >
            <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{conn.name}</p>
              <p className="text-xs text-muted-foreground">
                {DB_TYPE_LABELS[conn.db_type] ?? conn.db_type}
              </p>
            </div>
            {conn.id === activeConnectionId && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
