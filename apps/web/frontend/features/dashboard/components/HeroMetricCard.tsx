import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { useReducedMotion } from '@/hooks'
import { formatMetricValue } from '@/lib/format-metric'
import { useCountUp, useFormattedCountUp } from '@/hooks/useCountUp'

export interface HeroMetricCardProps {
  label: string
  metricKey: string
  value: string
  rawValue?: number
  pctChange: number | null
  previousValue: string
  sparklineValues: number[]
  sparklineDates?: string[]
  sparklinePreviousValues?: number[]
  sparklinePreviousDates?: string[]
  color: string
  loading?: boolean
  description?: string
  changeLabel?: string
}

function formatAxisDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d')
  } catch {
    return dateStr
  }
}

export function HeroMetricCard({
  label,
  metricKey,
  value,
  rawValue,
  pctChange,
  previousValue,
  sparklineValues,
  sparklineDates,
  sparklinePreviousValues,
  sparklinePreviousDates,
  color,
  loading,
  description,
  changeLabel,
}: HeroMetricCardProps) {
  const reducedMotion = useReducedMotion()

  const animatedTarget = loading ? 0 : (rawValue ?? 0)
  const animatedValue = useFormattedCountUp(animatedTarget, {
    duration: 900,
    decimals: 2,
    formatter: (v) => formatMetricValue(metricKey, v),
  })

  const pctTarget = loading || pctChange === null ? 0 : pctChange
  const animatedPct = useCountUp(pctTarget, { duration: 700, decimals: 1 })

  const displayValue = rawValue !== undefined ? animatedValue : value
  const displayPct = pctChange !== null ? animatedPct : null

  const isPositive = pctChange !== null && pctChange > 0
  const isNegative = pctChange !== null && pctChange < 0
  const isNeutral = pctChange !== null && pctChange === 0

  // Merge current + previous by index
  const chartData = sparklineValues.map((v, i) => ({
    date: sparklineDates?.[i] ?? String(i),
    value: v,
    previous: sparklinePreviousValues?.[i] ?? null,
    previousDate: sparklinePreviousDates?.[i] ?? null,
  }))

  // Show ~5 evenly-spaced ticks on x-axis
  const tickIndices =
    chartData.length > 1
      ? Array.from({ length: Math.min(5, chartData.length) }, (_, k) =>
          Math.round((k / (Math.min(5, chartData.length) - 1)) * (chartData.length - 1))
        )
      : [0]
  const tickDates = new Set(tickIndices.map((i) => chartData[i]?.date))

  const gradientId = `hero-gradient-${metricKey}`

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm p-0 flex flex-col h-full">

      {/* Chart fills the card — no padding, chart is the primary visual */}
      <div
        className={cn(
          'flex-1 min-h-[160px] h-0 transition-opacity duration-700',
          loading ? 'opacity-0' : 'opacity-100'
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 80, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatAxisDate}
              padding={{ left: 24, right: 24 }}
              interval={0}
              ticks={chartData.filter((d) => tickDates.has(d.date)).map((d) => d.date)}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const cur = payload.find((p) => p.dataKey === 'value')
                const prev = payload.find((p) => p.dataKey === 'previous')
                const entry = payload[0]?.payload as { previousDate?: string } | undefined
                return (
                  <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg text-xs space-y-1.5">
                    {cur && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-muted-foreground">{formatAxisDate(label as string)}:</span>
                        <span className="font-semibold">
                          {formatMetricValue(metricKey, cur.value as number)}
                        </span>
                      </div>
                    )}
                    {prev && prev.value != null && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        <span className="text-muted-foreground">
                          {entry?.previousDate ? formatAxisDate(entry.previousDate) : 'Prev'}:
                        </span>
                        <span className="font-semibold text-muted-foreground">
                          {formatMetricValue(metricKey, prev.value as number)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              }}
              cursor={{ strokeDasharray: '3 3', opacity: 0.5 }}
            />

            {/* Ghost line — previous period */}
            <Area
              type="monotone"
              dataKey="previous"
              name="Previous"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.4}
              fill="none"
              dot={false}
              isAnimationActive={!reducedMotion}
              animationDuration={800}
            />

            {/* Current period */}
            <Area
              type="monotone"
              dataKey="value"
              name="Current"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={!reducedMotion}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Metric overlay — sits at the top-left of the chart area */}
      <div
        className={cn(
          'absolute top-4 left-5 right-5 pointer-events-none transition-opacity duration-500',
          loading ? 'opacity-0' : 'opacity-100'
        )}
      >
        {/* Label row */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          {description && (
            <UITooltip>
              <TooltipTrigger asChild className="pointer-events-auto">
                <Info className="h-3 w-3 text-muted-foreground/60 cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] text-xs">
                {description}
              </TooltipContent>
            </UITooltip>
          )}
        </div>

        {/* Value */}
        <div className="text-3xl font-bold tracking-tight leading-none">{displayValue}</div>

        {/* Pct badge + prev period */}
        <div className="flex items-center gap-2 mt-1.5">
          <UITooltip>
            <TooltipTrigger asChild className="pointer-events-auto">
              {displayPct === null ? (
                <span className="text-sm text-muted-foreground cursor-default">—</span>
              ) : isNeutral ? (
                <span className="inline-flex items-center text-sm font-bold px-2 py-0.5 rounded-md text-muted-foreground bg-muted cursor-default">
                  0.0%
                </span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-md cursor-default',
                    isPositive &&
                      'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
                    isNegative && 'text-destructive bg-destructive/10'
                  )}
                >
                  <span aria-hidden="true">{isPositive ? '↑' : '↓'}</span>
                  <span className="sr-only">{isPositive ? 'increased by' : 'decreased by'}</span>
                  {Math.abs(displayPct).toFixed(1)}%
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              {changeLabel ?? 'Change vs. previous period'}
            </TooltipContent>
          </UITooltip>
          <span className="text-xs text-muted-foreground">
            prev. period: <span className="font-medium">{previousValue}</span>
          </span>
        </div>
      </div>
      <CardLoadingBar loading={loading} />
    </div>
  )
}
