export function MetricCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
      <div className="h-7 w-1/3 rounded bg-muted animate-pulse" />
      <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
    </div>
  )
}
