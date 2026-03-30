import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { useConnections, useDeleteConnection, useTestConnection } from '../hooks/useConnectionsData'
import { ConnectionFormDialog } from './ConnectionFormDialog'
import { DbLogo } from '@/components/DbLogo'
import type { Connection } from '@/types'
import { cn } from '@/lib/utils'
import { TYPOGRAPHY } from '@/lib/constants'

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

const DB_TYPE_COLORS: Record<string, string> = {
  duckdb: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  postgresql: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  databricks: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  snowflake: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  clickhouse: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  bigquery: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  redshift: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  mysql: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  sqlite: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

function ConnectionRow({ connection }: { connection: Connection }) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteConnection()
  const testMutation = useTestConnection()
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  function handleTest(e: React.MouseEvent) {
    e.stopPropagation()
    setTestResult(null)
    testMutation.mutate(connection.id, {
      onSuccess: (data) => setTestResult({ ok: data.ok, message: 'Connected successfully' }),
      onError: (err) => setTestResult({ ok: false, message: err.message }),
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`Delete connection "${connection.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(connection.id)
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/40 cursor-pointer transition-colors"
      onClick={() => navigate(`/connections/${connection.id}`)}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
        <DbLogo dbType={connection.db_type} size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{connection.name}</p>
        <p className="text-xs text-muted-foreground">
          Created {new Date(connection.created_at).toLocaleDateString()}
        </p>
      </div>

      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
          DB_TYPE_COLORS[connection.db_type]
        )}
      >
        {DB_TYPE_LABELS[connection.db_type] ?? connection.db_type}
      </span>

      {testResult && (
        <span
          className={cn(
            'shrink-0 text-xs font-medium',
            testResult.ok ? 'text-success' : 'text-destructive'
          )}
        >
          {testResult.ok ? '✓ Connected' : '✗ Failed'}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={testMutation.isPending}
          onClick={handleTest}
        >
          {testMutation.isPending ? 'Testing…' : 'Test connection'}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          aria-label="Delete connection"
          disabled={deleteMutation.isPending}
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function ConnectionList() {
  const { data, isLoading, error } = useConnections()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={TYPOGRAPHY.sectionTitle}>Connections</h1>
          <p className={`${TYPOGRAPHY.muted} mt-0.5`}>Manage your event database connections</p>
        </div>
        {data && data.length > 0 && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Connection
          </Button>
        )}
      </div>

      {isLoading && <LoadingState message="Loading connections…" />}

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {!isLoading && !error && data?.length === 0 && (
        <EmptyState
          icon={Database}
          title="No connections yet"
          description="Connect your event database to start exploring your analytics. Supports DuckDB, PostgreSQL, Snowflake, Databricks and more."
          action={{ label: 'Add your first connection', onClick: () => setCreateOpen(true) }}
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((conn) => (
            <ConnectionRow key={conn.id} connection={conn} />
          ))}
        </div>
      )}

      <ConnectionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
