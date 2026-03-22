import { useState } from 'react'
import { HeroMetricCard } from './HeroMetricCard'
import { MiniMetricCard } from './MiniMetricCard'
import { formatMetricValue, computePctChange } from '@/lib/format-metric'
import type { MissionControlResponse } from '@/types'
import type { TrendMetric, MetricTrend } from '../hooks/useMissionControlTrends'

export interface MissionControlGridProps {
  data: MissionControlResponse | undefined
  trends: Record<TrendMetric, MetricTrend>
  isLoading: boolean
}

// Per-metric display config
const METRIC_CONFIG: Array<{
  key: TrendMetric
  label: string
  color: string
}> = [
  { key: 'total_events', label: 'Total Events', color: 'hsl(var(--chart-1))' },
  { key: 'unique_users', label: 'Unique Users', color: 'hsl(var(--chart-2))' },
  { key: 'total_sessions', label: 'Sessions', color: 'hsl(var(--chart-3))' },
  { key: 'avg_session_duration_sec', label: 'Avg Session', color: 'hsl(var(--chart-4))' },
  { key: 'avg_events_per_session', label: 'Events / Session', color: 'hsl(var(--chart-5))' },
  { key: 'new_users', label: 'New Users', color: 'hsl(var(--chart-3))' },
  { key: 'returning_users', label: 'Returning Users', color: 'hsl(var(--chart-4))' },
  { key: 'dau_mau_ratio', label: 'DAU / MAU', color: 'hsl(var(--chart-5))' },
]

const CATEGORIES: Array<{
  label: string
  metrics: TrendMetric[]
}> = [
  { label: 'Volume', metrics: ['unique_users', 'total_sessions'] },
  { label: 'Engagement', metrics: ['avg_session_duration_sec', 'avg_events_per_session'] },
  { label: 'Acquisition', metrics: ['new_users', 'returning_users'] },
  { label: 'Stickiness', metrics: ['dau_mau_ratio'] },
]

function getConfig(key: TrendMetric) {
  return METRIC_CONFIG.find((m) => m.key === key)!
}

export function MissionControlGrid({ data, trends, isLoading }: MissionControlGridProps) {
  const [heroMetric, setHeroMetric] = useState<TrendMetric>('total_events')

  const heroConfig = getConfig(heroMetric)
  const heroCurrentValue = data?.current[heroMetric as keyof typeof data.current] ?? 0
  const heroPreviousValue = data?.previous[heroMetric as keyof typeof data.previous] ?? 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
      {/* LEFT: Hero card */}
      <HeroMetricCard
        label={heroConfig.label}
        value={formatMetricValue(heroMetric, heroCurrentValue)}
        pctChange={computePctChange(heroCurrentValue, heroPreviousValue)}
        previousValue={formatMetricValue(heroMetric, heroPreviousValue)}
        sparklineValues={trends[heroMetric]?.values ?? []}
        color={heroConfig.color}
        loading={isLoading}
      />

      {/* RIGHT: Categorized mini-grid */}
      <div className="flex flex-col gap-4">
        {CATEGORIES.map(({ label, metrics }) => (
          <div key={label}>
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              {label}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map((metricKey) => {
                const cfg = getConfig(metricKey)
                const current = data?.current[metricKey as keyof typeof data.current] ?? 0
                const previous = data?.previous[metricKey as keyof typeof data.previous] ?? 0
                return (
                  <MiniMetricCard
                    key={metricKey}
                    label={cfg.label}
                    value={formatMetricValue(metricKey, current)}
                    pctChange={computePctChange(current, previous)}
                    sparklineValues={trends[metricKey]?.values ?? []}
                    color={cfg.color}
                    isHero={heroMetric === metricKey}
                    onClick={() => setHeroMetric(metricKey)}
                    loading={isLoading}
                    fullWidth={metricKey === 'dau_mau_ratio'}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
