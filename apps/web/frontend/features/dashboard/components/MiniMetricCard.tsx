import { SparklineChart } from '@/components/charts/sparkline-chart'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp, useFormattedCountUp } from '@/hooks/useCountUp'

export interface MiniMetricCardProps {
  label: string
  value: string           // pre-formatted fallback
  rawValue?: number       // raw number for count-up animation
  pctChange: number | null  // null → show "—"
  sparklineValues: number[]
  color: string           // CSS color string for sparkline stroke
  isHero?: boolean        // highlight border when this metric is the hero
  onClick?: () => void
  loading?: boolean
  fullWidth?: boolean     // true for DAU/MAU which spans 2 cols
  description?: string
  changeLabel?: string
  sparklineFormatter?: (value: number) => string
  decimalsOverride?: number
}

export function MiniMetricCard({
  label,
  value,
  rawValue,
  pctChange,
  sparklineValues,
  color,
  isHero,
  onClick,
  loading,
  fullWidth,
  description,
  changeLabel,
  sparklineFormatter,
  decimalsOverride = 0,
}: MiniMetricCardProps) {
  const animatedTarget = loading ? 0 : (rawValue ?? 0)
  const animatedValue = useFormattedCountUp(animatedTarget, {
    duration: 700,
    decimals: decimalsOverride,
    formatter: sparklineFormatter ?? ((v) => String(v)),
  })

  const pctTarget = loading || pctChange === null ? 0 : pctChange
  const animatedPct = useCountUp(pctTarget, { duration: 700, decimals: 1 })

  const displayValue = rawValue !== undefined ? animatedValue : value
  const displayPct = pctChange !== null ? animatedPct : null

  const isPositive = pctChange !== null && pctChange > 0
  const isNegative = pctChange !== null && pctChange < 0
  const isNeutral = pctChange !== null && pctChange === 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${label} trend`}
      aria-pressed={isHero}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card shadow-sm p-3 text-left w-full transition-colors',
        'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isHero ? 'border-2 border-primary' : 'border-border',
        fullWidth && 'col-span-2'
      )}
    >
      <CardLoadingBar loading={loading} />
      <div className="flex items-center gap-1 mb-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        {description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[180px] text-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div
          className={cn(
            'transition-opacity duration-500',
            loading ? 'opacity-0' : 'opacity-100'
          )}
        >
          <div className="text-lg font-bold tracking-tight leading-none">{displayValue}</div>
          <div className="mt-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                {displayPct === null ? (
                  <span className="text-xs text-muted-foreground cursor-default">—</span>
                ) : isNeutral ? (
                  <span className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded text-muted-foreground bg-muted cursor-default">
                    0.0%
                  </span>
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded cursor-default',
                      isPositive && 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
                      isNegative && 'text-destructive bg-destructive/10'
                    )}
                  >
                    <span aria-hidden="true">{isPositive ? '↑' : '↓'}</span>
                    <span className="sr-only">{isPositive ? 'increased by' : 'decreased by'}</span>
                    {Math.abs(displayPct).toFixed(1)}%
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[180px]">
                {changeLabel ?? 'Change vs. previous period'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <SparklineChart
          key={loading ? 'loading' : 'loaded'}
          data={sparklineValues}
          width={fullWidth ? 120 : 80}
          height={32}
          color={color}
          showArea={false}
          strokeWidth={1.5}
          formatter={sparklineFormatter}
          animated={!loading}
        />
      </div>
    </button>
  )
}
