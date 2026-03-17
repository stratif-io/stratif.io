import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { Separator } from '@/components/ui/separator'
import { SPACING } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useConnection } from './hooks/useConnectionsData'
import { ConnectionConfigTab } from './components/ConnectionConfigTab'
import { SchemaConfigTab } from './components/SchemaConfigTab'
import { FilterConfigTab } from './components/FilterConfigTab'
import { useDeferredLoading, useReducedMotion } from '@/hooks'
import { motion } from 'framer-motion'

type Tab = 'connection' | 'schema' | 'filters'

const TABS: { id: Tab; label: string }[] = [
  { id: 'connection', label: 'Connection' },
  { id: 'schema', label: 'Schema Mapping' },
  { id: 'filters', label: 'Global Filters' },
]

const DB_TYPE_LABELS: Record<string, string> = {
  duckdb: 'DuckDB',
  postgresql: 'PostgreSQL',
  databricks: 'Databricks',
  sqlite: 'SQLite',
}

export function ConnectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: connection, isLoading: isLoadingRaw, error } = useConnection(id ?? '')
  const [tab, setTab] = useState<Tab>('connection')

  const showSkeleton = useDeferredLoading(isLoadingRaw)
  const prefersReducedMotion = useReducedMotion()

  if (showSkeleton) {
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
    <motion.div
      className={SPACING.page}
      initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
    >
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
            <h1 className="text-xl font-semibold">{connection.name}</h1>
            <p className="text-sm text-muted-foreground">
              {DB_TYPE_LABELS[connection.db_type] ?? connection.db_type}
            </p>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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
      {tab === 'filters' && <FilterConfigTab connId={connection.id} />}
    </motion.div>
  )
}
