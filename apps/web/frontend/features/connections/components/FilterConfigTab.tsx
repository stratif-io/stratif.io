import { useFilterConfig, useUpsertFilterConfig } from '../hooks/useConnectionsData'
import { LoadingState } from '@/components/ui/loading-state'

interface FilterConfigTabProps {
  connId: string
}

export function FilterConfigTab({ connId }: FilterConfigTabProps) {
  const { data: filterConfig, isLoading } = useFilterConfig(connId)
  const upsert = useUpsertFilterConfig(connId)

  if (isLoading) {
    return <LoadingState message="Loading filter configuration…" />
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure global filters to restrict which data is included in your analytics queries.
      </p>
      {filterConfig ? (
        <pre className="text-xs text-muted-foreground">{JSON.stringify(filterConfig, null, 2)}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">No filter configuration set.</p>
      )}
      <button
        className="text-sm text-primary"
        onClick={() => upsert.mutate({ filter_fields: [] })}
        disabled={upsert.isPending}
      >
        Save Filters
      </button>
    </div>
  )
}
