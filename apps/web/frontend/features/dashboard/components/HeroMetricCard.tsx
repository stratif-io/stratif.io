import { AreaChartComponent } from '@/components/charts/area-chart'
import { cn } from '@/lib/utils'

export interface HeroMetricCardProps {
  label: string
  value: string
  pctChange: number | null
  previousValue: string    // formatted, shown as "prev: {previousValue}"
  sparklineValues: number[]
  color: string
  loading?: boolean
}

export function HeroMetricCard({
  label,
  value,
  pctChange,
  previousValue,
  sparklineValues,
  color,
  loading,
}: HeroMetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border p-5 flex flex-col gap-4 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="flex-1 min-h-[120px] bg-muted rounded-lg" />
      </div>
    )
  }

  const isPositive = pctChange !== null && pctChange > 0
  const isNegative = pctChange !== null && pctChange < 0
  const isNeutral = pctChange !== null && pctChange === 0

  // Build chart data from sparklineValues (index as x-axis key)
  const chartData = sparklineValues.map((v, i) => ({ day: String(i), value: v }))

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col"
      style={{
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        background: `color-mix(in srgb, ${color} 5%, transparent)`,
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color }}
      >
        {label}
      </div>

      <div className="text-4xl font-extrabold tracking-tight leading-none">{value}</div>

      <div className="flex items-center gap-2 mt-2">
        {pctChange === null ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : isNeutral ? (
          <span className="inline-flex items-center text-sm font-bold px-2 py-0.5 rounded-md text-muted-foreground bg-muted">
            0.0%
          </span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-md',
              isPositive && 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
              isNegative && 'text-destructive bg-destructive/10'
            )}
          >
            <span aria-hidden="true">{isPositive ? '↑' : '↓'}</span>
            <span className="sr-only">{isPositive ? 'increased by' : 'decreased by'}</span>
            {Math.abs(pctChange).toFixed(1)}%
          </span>
        )}
        <span className="text-xs text-muted-foreground">prev: {previousValue}</span>
      </div>

      <div className="mt-4 flex-1 min-h-[120px]">
        <AreaChartComponent
          data={chartData}
          dataKey="value"
          name={label}
          color={color}
          height={140}
          ariaLabel={`${label} daily trend chart`}
        />
      </div>
    </div>
  )
}
