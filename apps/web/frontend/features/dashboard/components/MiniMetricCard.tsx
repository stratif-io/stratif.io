import { SparklineChart } from '@/components/charts/sparkline-chart'
import { cn } from '@/lib/utils'

export interface MiniMetricCardProps {
  label: string
  value: string           // pre-formatted (e.g. "48.2K", "2m 22s", "34.0%")
  pctChange: number | null  // null → show "—"
  sparklineValues: number[]
  color: string           // CSS color string for sparkline stroke
  isHero?: boolean        // highlight border when this metric is the hero
  onClick?: () => void
  loading?: boolean
  fullWidth?: boolean     // true for DAU/MAU which spans 2 cols
}

export function MiniMetricCard({
  label,
  value,
  pctChange,
  sparklineValues,
  color,
  isHero,
  onClick,
  loading,
  fullWidth,
}: MiniMetricCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border p-3 animate-pulse',
          fullWidth && 'col-span-2'
        )}
        aria-busy="true"
      >
        <div className="h-3 w-16 bg-muted rounded mb-3" />
        <div className="h-5 w-20 bg-muted rounded mb-2" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    )
  }

  const isPositive = pctChange !== null && pctChange >= 0
  const isNegative = pctChange !== null && pctChange < 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left w-full transition-colors',
        'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isHero ? 'border-2 border-primary' : 'border-border',
        fullWidth && 'col-span-2'
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold tracking-tight leading-none">{value}</div>
          <div className="mt-1.5">
            {pctChange === null ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
                  isPositive && 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
                  isNegative && 'text-destructive bg-destructive/10'
                )}
              >
                <span aria-hidden="true">{isPositive ? '↑' : '↓'}</span>
                <span className="sr-only">{isPositive ? 'increased by' : 'decreased by'}</span>
                {Math.abs(pctChange).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <SparklineChart
          data={sparklineValues}
          width={fullWidth ? 100 : 60}
          height={24}
          color={color}
          showArea={false}
          strokeWidth={1.5}
        />
      </div>
    </button>
  )
}
