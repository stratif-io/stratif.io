import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { Separator } from '@/components/ui/separator'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { useConnection, useTestConnection } from './hooks/useConnectionsData'
import { useAppStore } from '@/stores'
import { ConnectionConfigTab } from './components/ConnectionConfigTab'
import { SchemaConfigTab } from './components/SchemaConfigTab'
import { ConnectionWizardProgress } from './components/ConnectionWizardProgress'

type Tab = 'connection' | 'schema'

const TABS: { id: Tab; label: string }[] = [
  { id: 'connection', label: 'Connection' },
  { id: 'schema', label: 'Schema Mapping' },
]

const DB_TYPE_LABELS: Record<string, string> = {
  duckdb: 'DuckDB',
  postgresql: 'PostgreSQL',
  databricks: 'Databricks',
  sqlite: 'SQLite',
}

export function ConnectionDetailPage() {
  const { id, tab: tabParam } = useParams<{ id: string; tab?: string }>()
  const tab: Tab = (tabParam === 'schema' ? 'schema' : 'connection') as Tab
  const navigate = useNavigate()
  const { data: connection, isLoading, error } = useConnection(id ?? '')
  const setActiveConnectionId = useAppStore((s) => s.setActiveConnectionId)
  const autoTest = useTestConnection()
  const isWizardMode = !connection?.schema_config

  useEffect(() => {
    if (!connection) return
    autoTest.mutate(connection.id, {
      onSuccess: (data) => {
        if (data.ok) setActiveConnectionId(connection.id)
      },
    })
    // Run once when connection data first becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.id])

  if (isLoading) {
    return (
      <div className={SPACING.page}>
        <LoadingState message="Loading connection…" />
      </div>
    )
  }

  if (error || !connection) {
    return (
      <div className={SPACING.page}>
        <p className="text-sm text-destructive">{error?.message ?? 'Connection not found'}</p>
        <Button variant="link" className="px-0 mt-2" onClick={() => navigate('/connections')}>
          Back to Connections
        </Button>
      </div>
    )
  }

  return (
    <div className={SPACING.page}>
      {/* Back + header */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate('/connections')}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Connections
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-card">
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <PageHeader title={connection.name} />
            <p className={TYPOGRAPHY.muted}>
              {DB_TYPE_LABELS[connection.db_type] ?? connection.db_type}
            </p>
            <div className="mt-1" data-testid="auto-test-status">
              {autoTest.isPending && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verifying…
                </span>
              )}
              {!autoTest.isPending && autoTest.data?.ok && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </span>
              )}
              {!autoTest.isPending && (autoTest.error || autoTest.data?.ok === false) && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <XCircle className="h-3 w-3" />
                  Connection failed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {isWizardMode ? (
        <>
          <ConnectionWizardProgress
            currentStep={tab}
            onStepClick={(value) => navigate(`/connections/${id}/${value}`)}
          />

          {/* Tab content */}
          {tab === 'connection' && <ConnectionConfigTab connection={connection} />}
          {tab === 'schema' && <SchemaConfigTab connId={connection.id} />}
        </>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b mb-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/connections/${id}/${t.id}`)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'connection' && <ConnectionConfigTab connection={connection} />}
          {tab === 'schema' && <SchemaConfigTab connId={connection.id} />}
        </>
      )}
    </div>
  )
}
