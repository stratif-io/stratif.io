import { useEffect } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores'
import { useConnections } from '@/features/connections/hooks/useConnectionsData'
import { DbLogo } from '@/components/DbLogo'
import { cn } from '@/lib/utils'

const DB_TYPE_LABELS: Record<string, string> = {
  duckdb: 'DuckDB',
  postgresql: 'PostgreSQL',
  databricks: 'Databricks',
  snowflake: 'Snowflake',
  clickhouse: 'ClickHouse',
  bigquery: 'BigQuery',
  redshift: 'Redshift',
  mysql: 'MySQL',
  sqlite: 'SQLite',
}

export function ConnectionSelector() {
  const { data: connections, isLoading } = useConnections()
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)

  // Auto-select the first connection if none is active or the stored ID is stale;
  // clear the stored ID if no connections exist.
  useEffect(() => {
    if (!connections) return
    if (connections.length === 0) {
      if (activeConnectionId) setActiveConnectionId(null)
      return
    }
    const isValid = connections.some((c) => c.id === activeConnectionId)
    if (!activeConnectionId || !isValid) {
      setActiveConnectionId(connections[0].id)
    }
  }, [connections, activeConnectionId, setActiveConnectionId])

  const activeConnection = connections?.find((c) => c.id === activeConnectionId)

  if (isLoading) {
    return <Skeleton className="h-7 w-32 rounded-md" />
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning px-2">
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
          className="h-8 gap-1.5 text-xs font-medium max-w-[180px]"
        >
          <DbLogo dbType={activeConnection?.db_type ?? ''} size={14} className="shrink-0" />
          <span className="truncate" title={activeConnection?.name}>
            {activeConnection?.name ?? 'Select connection'}
          </span>
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
            <DbLogo dbType={conn.db_type} size={16} className="shrink-0" />
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
