import { memo, useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp, useFormattedCountUp } from '@/hooks/useCountUp'

export interface MiniMetricCardProps {
  label: string
  value: string // pre-formatted fallback
  rawValue?: number // raw number for count-up animation
  pctChange: number | null // null → show "—"
  sparklineValues?: number[]
  color?: string
  isHero?: boolean // highlight when this metric is the hero
  onClick?: () => void
  loading?: boolean
  fullWidth?: boolean // true for DAU/MAU which spans 2 cols
  description?: string
  changeLabel?: string
  sparklineFormatter?: (value: number) => string
  decimalsOverride?: number
  staggerIndex?: number
}

export const MiniMetricCard = memo(function MiniMetricCard({
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
  staggerIndex = 0,
}: MiniMetricCardProps) {
  const sparklineData = useMemo(
    () => (sparklineValues ?? []).map((v) => ({ v })),
    [sparklineValues]
  )
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
        'relative overflow-hidden rounded-xl border p-3 text-left w-full transition-colors',
        'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isHero
          ? 'border-2 border-primary bg-card shadow-md ring-2 ring-primary/40'
          : 'border-border bg-card shadow-sm opacity-80 hover:opacity-100 transition-opacity',
        fullWidth && 'col-span-2'
      )}
    >
      <CardLoadingBar loading={loading} />

      {/* Sparkline — subtle background */}
      {sparklineData.length > 1 && !loading && (
        <div className="absolute bottom-0 left-0 right-0 h-10 opacity-20 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color ?? 'hsl(var(--primary))'}
                fill={color ?? 'hsl(var(--primary))'}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-1 mb-1">
        <div className="text-[10px] font-semibold tracking-widest text-muted-foreground">
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

      <div
        className={cn('transition-opacity duration-500', loading ? 'opacity-0' : 'opacity-100')}
        style={{ transitionDelay: loading ? '0ms' : `${staggerIndex * 60}ms` }}
      >
        <div className="text-lg font-bold tracking-tight leading-none">{displayValue}</div>
        <div className="mt-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              {displayPct === null ? (
                <span className="text-xs text-muted-foreground cursor-default">—</span>
              ) : isNeutral ? (
                <span
                  className={cn(
                    'inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded text-muted-foreground bg-muted cursor-default',
                    !isHero && 'opacity-70'
                  )}
                >
                  0.0%
                </span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded cursor-default',
                    isPositive && 'text-success bg-success/10',
                    isNegative && 'text-destructive bg-destructive/10',
                    !isHero && 'opacity-70'
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

      {isHero && color && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg"
          style={{ backgroundColor: color }}
        />
      )}
    </button>
  )
})
