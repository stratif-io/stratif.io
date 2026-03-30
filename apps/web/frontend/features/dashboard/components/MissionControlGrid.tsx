import { memo, useState, useRef, useEffect } from 'react'
import { HeroMetricCard } from './HeroMetricCard'
import { MiniMetricCard } from './MiniMetricCard'
import { MetricCardSkeleton } from '@/components/ui/loading-state'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Settings2 } from 'lucide-react'
import { formatMetricValue, computePctChange } from '@/lib/format-metric'
import { cn } from '@/lib/utils'
import type { MissionControlResponse } from '@/types'
import type { TrendMetric, MetricTrend } from '../hooks/useMissionControlTrends'
import { DevCard } from '@/components/dev'
import { usePinnedMetrics } from '../hooks/usePinnedMetrics'
import { useAppStore } from '@/stores/app-store'

export interface MissionControlGridProps {
  data: MissionControlResponse | undefined
  trends: Record<TrendMetric, MetricTrend>
  metricLoading: Record<TrendMetric, boolean>
  metricSql?: Record<TrendMetric, string | string[] | null>
}

// Per-metric display config
const METRIC_CONFIG: Array<{
  key: TrendMetric
  label: string
  color: string
}> = [
  { key: 'total_events', label: 'Total Events', color: 'hsl(var(--chart-1))' },
  { key: 'unique_users', label: 'Unique Users', color: 'hsl(var(--chart-2))' },
  { key: 'wau', label: 'WAU', color: 'hsl(var(--chart-3))' },
  { key: 'total_sessions', label: 'Sessions', color: 'hsl(var(--chart-3))' },
  { key: 'avg_session_duration_sec', label: 'Avg Session', color: 'hsl(var(--chart-4))' },
  { key: 'avg_events_per_session', label: 'Events / Session', color: 'hsl(var(--chart-5))' },
  { key: 'avg_active_days', label: 'Active Days', color: 'hsl(var(--chart-1))' },
  { key: 'power_users', label: 'Power Users', color: 'hsl(var(--chart-2))' },
  { key: 'new_users', label: 'New Users', color: 'hsl(var(--chart-3))' },
  { key: 'returning_users', label: 'Returning Users', color: 'hsl(var(--chart-4))' },
  { key: 'resurrected_users', label: 'Resurrected', color: 'hsl(var(--chart-5))' },
  { key: 'churned_users', label: 'Churned', color: 'hsl(var(--chart-1))' },
  { key: 'retention_rate', label: 'Retention Rate', color: 'hsl(var(--chart-2))' },
  { key: 'dau_mau_ratio', label: 'DAU / MAU', color: 'hsl(var(--chart-5))' },
]

const CATEGORIES: Array<{
  label: string
  metrics: TrendMetric[]
}> = [
  { label: 'Volume', metrics: ['total_events', 'unique_users', 'wau'] },
  {
    label: 'Engagement',
    metrics: [
      'total_sessions',
      'avg_session_duration_sec',
      'avg_events_per_session',
      'avg_active_days',
      'power_users',
    ],
  },
  {
    label: 'Acquisition',
    metrics: ['new_users', 'returning_users', 'resurrected_users', 'churned_users'],
  },
  { label: 'Stickiness', metrics: ['retention_rate', 'dau_mau_ratio'] },
]

function getConfig(key: TrendMetric) {
  return METRIC_CONFIG.find((m) => m.key === key)!
}

function buildAllSql(
  metricSql: string | string[] | null | undefined,
  trendSql: string | string[] | undefined,
  label: string
): { sql: string | string[] | undefined; sqlLabels: string | string[] | undefined } {
  const parts: string[] = []
  const labelParts: string[] = []
  if (metricSql) {
    const qs = Array.isArray(metricSql) ? metricSql : [metricSql]
    parts.push(...qs)
    labelParts.push(
      ...qs.map((_, i) =>
        qs.length > 1
          ? `Number of ${label} this period (${i + 1})`
          : `Number of ${label} this period`
      )
    )
  }
  if (trendSql) {
    const qs = Array.isArray(trendSql) ? trendSql : [trendSql]
    parts.push(...qs)
    labelParts.push(
      ...qs.map((_, i) => (qs.length > 1 ? `${label} per day (${i + 1})` : `${label} per day`))
    )
  }
  if (parts.length === 0) return { sql: undefined, sqlLabels: undefined }
  if (parts.length === 1) return { sql: parts[0], sqlLabels: labelParts[0] }
  return { sql: parts, sqlLabels: labelParts }
}

export const MissionControlGrid = memo(function MissionControlGrid({
  data,
  trends,
  metricLoading,
  metricSql,
}: MissionControlGridProps) {
  const [heroMetric, setHeroMetric] = useState<TrendMetric>('total_events')
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)
  const { togglePin, isPinned, resetToDefault } = usePinnedMetrics(activeConnectionId ?? null)

  const heroWrapperRef = useRef<HTMLDivElement>(null)
  const rightColRef = useRef<HTMLDivElement>(null)

  const allMetricKeys = METRIC_CONFIG.map((m) => m.key)
  const isInitialLoading = allMetricKeys.every((key) => metricLoading[key] ?? true)

  useEffect(() => {
    if (isInitialLoading) return
    const rightCol = rightColRef.current
    const heroWrapper = heroWrapperRef.current
    if (!rightCol || !heroWrapper) return
    const observer = new ResizeObserver(([entry]) => {
      heroWrapper.style.height = `${entry.contentRect.height}px`
    })
    observer.observe(rightCol)
    return () => observer.disconnect()
  }, [isInitialLoading])

  if (isInitialLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        {/* LEFT: Hero skeleton */}
        <MetricCardSkeleton />

        {/* RIGHT: Mini skeletons in category layout */}
        <div className="flex flex-col gap-5">
          {CATEGORIES.map(({ label, metrics }) => (
            <div key={label}>
              <div className="h-3 w-16 rounded bg-muted animate-pulse mb-2" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2">
                {metrics.map((metricKey) => (
                  <div
                    key={metricKey}
                    className={
                      metricKey === 'dau_mau_ratio' || metricKey === 'retention_rate'
                        ? 'col-span-2'
                        : undefined
                    }
                  >
                    <MetricCardSkeleton />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const heroConfig = getConfig(heroMetric)
  const heroCurrentValue = data?.current[heroMetric as keyof typeof data.current] ?? 0
  const heroPreviousValue = data?.previous[heroMetric as keyof typeof data.previous] ?? null

  const flatMetrics = CATEGORIES.flatMap((c) => c.metrics)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] lg:items-start gap-4">
      {/* LEFT: Hero card — height synced to right column via ResizeObserver */}
      <div ref={heroWrapperRef}>
        <DevCard
          {...buildAllSql(metricSql?.[heroMetric], trends[heroMetric]?.sql, heroConfig.label)}
          className="h-full"
        >
          <HeroMetricCard
            label={heroConfig.label}
            metricKey={heroMetric}
            value={formatMetricValue(heroMetric, heroCurrentValue)}
            rawValue={heroCurrentValue}
            pctChange={computePctChange(heroCurrentValue, heroPreviousValue)}
            previousValue={
              heroPreviousValue !== null ? formatMetricValue(heroMetric, heroPreviousValue) : '—'
            }
            sparklineValues={trends[heroMetric]?.values ?? []}
            sparklineDates={trends[heroMetric]?.dates}
            sparklinePreviousValues={trends[heroMetric]?.previousValues}
            sparklinePreviousDates={trends[heroMetric]?.previousDates}
            color={heroConfig.color}
            loading={(metricLoading[heroMetric] ?? true) || (trends[heroMetric]?.loading ?? true)}
            currentMetrics={data?.current}
          />
        </DevCard>
      </div>

      {/* RIGHT: Categorized mini-grid */}
      <div ref={rightColRef} className="flex flex-col gap-5">
        {CATEGORIES.map(({ label, metrics }) => {
          const visibleMetrics = metrics.filter((k) => isPinned(k))
          if (visibleMetrics.length === 0) return null
          return (
            <div key={label}>
              <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-2">
                {label}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleMetrics.map((metricKey) => {
                  const cfg = getConfig(metricKey)
                  const current = data?.current[metricKey as keyof typeof data.current] ?? 0
                  const previous = data?.previous[metricKey as keyof typeof data.previous] ?? null
                  const isFullWidth =
                    metricKey === 'dau_mau_ratio' || metricKey === 'retention_rate'
                  const cardLoading =
                    (metricLoading[metricKey] ?? true) || (trends[metricKey]?.loading ?? true)
                  // Float metrics need 2 decimal places during count-up animation
                  const decimalsOverride =
                    metricKey === 'dau_mau_ratio' ||
                    metricKey === 'avg_events_per_session' ||
                    metricKey === 'retention_rate' ||
                    metricKey === 'avg_active_days'
                      ? 2
                      : 0
                  const staggerIndex = flatMetrics.indexOf(metricKey)
                  return (
                    <DevCard
                      key={metricKey}
                      {...buildAllSql(metricSql?.[metricKey], trends[metricKey]?.sql, cfg.label)}
                      className={isFullWidth ? 'col-span-2' : undefined}
                    >
                      <MiniMetricCard
                        staggerIndex={staggerIndex}
                        label={cfg.label}
                        metricKey={metricKey}
                        value={formatMetricValue(metricKey, current)}
                        rawValue={current}
                        pctChange={computePctChange(current, previous)}
                        sparklineValues={trends[metricKey]?.values ?? []}
                        color={cfg.color}
                        isHero={heroMetric === metricKey}
                        onClick={() => setHeroMetric(metricKey)}
                        loading={cardLoading}
                        fullWidth={isFullWidth}
                        currentMetrics={data?.current}
                        sparklineFormatter={(v) => formatMetricValue(metricKey, v)}
                        decimalsOverride={decimalsOverride}
                      />
                    </DevCard>
                  )
                })}
              </div>
            </div>
          )
        })}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-3">
              <Settings2 className="h-3 w-3" /> Customize metrics
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2 mt-2">
              {METRIC_CONFIG.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => togglePin(key)}
                  className={cn(
                    'text-xs px-2 py-1 rounded-md border transition-colors',
                    isPinned(key)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={resetToDefault}
              className="text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              Reset to defaults
            </button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
})
