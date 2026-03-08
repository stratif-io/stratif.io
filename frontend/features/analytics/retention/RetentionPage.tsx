import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PageTransition } from '@/components/layout/PageTransition'
import { TableSkeleton } from '@/components/ui/loading-state'
import { QueryError } from '@/components/ui/query-error'
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'
import { useAppStore } from '@/stores'
import { useRetentionData, type RetentionGranularity } from './hooks/useRetentionData'
import { RetentionTable } from './components/RetentionTable'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { cn } from '@/lib/utils'

const GRANULARITIES: { value: RetentionGranularity; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
]

// Benchmark thresholds per granularity+milestone
// Keyed as `${granularity}_${milestone}` → { good, ok }
const BENCHMARKS: Record<string, { good: number; ok: number }> = {
  day_1: { good: 25, ok: 10 },
  day_7: { good: 15, ok: 5 },
  day_14: { good: 10, ok: 3 },
  day_30: { good: 8, ok: 2 },
  day_90: { good: 5, ok: 1 },
  week_1: { good: 40, ok: 20 },
  week_2: { good: 25, ok: 10 },
  week_3: { good: 20, ok: 8 },
  week_4: { good: 15, ok: 5 },
  week_12: { good: 8, ok: 2 },
  month_1: { good: 35, ok: 15 },
  month_2: { good: 25, ok: 10 },
  month_3: { good: 20, ok: 8 },
  month_4: { good: 15, ok: 5 },
  month_5: { good: 12, ok: 3 },
  month_6: { good: 10, ok: 2 },
}

function getRetentionLabel(value: number, granularity: RetentionGranularity, milestone: number) {
  const key = `${granularity}_${milestone}`
  const b = BENCHMARKS[key] ?? { good: 20, ok: 5 }
  if (value >= b.good) return { label: 'Good', color: 'text-emerald-600 dark:text-emerald-400' }
  if (value >= b.ok) return { label: 'Average', color: 'text-amber-600 dark:text-amber-400' }
  return { label: 'Low', color: 'text-red-500 dark:text-red-400' }
}

function milestoneTitle(granularity: RetentionGranularity, unit: number): string {
  if (granularity === 'week') return `Week ${unit} Retention`
  if (granularity === 'month') return `Month ${unit} Retention`
  return `Day ${unit} Retention`
}


interface MetricCardProps {
  title: string
  value: number
  granularity: RetentionGranularity
  milestone: number
}

function MetricCard({ title, value, granularity, milestone }: MetricCardProps) {
  const { label, color } = getRetentionLabel(value, granularity, milestone)
  return (
    <Card hover="lift">
      <CardHeader className="pb-2">
        <CardTitle className={TYPOGRAPHY.label}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-end gap-2">
          <span className={TYPOGRAPHY.metric}>{value.toFixed(1)}%</span>
          <span className={cn('text-xs font-medium pb-0.5', color)}>{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function RetentionPage() {
  const { dateRange } = useAppStore()
  const [granularity, setGranularity] = useState<RetentionGranularity>('day')
  const [cohortLimit, setCohortLimit] = useState(10)

  const { retentionData, milestones, isLoading, isError, error, avgMilestones, totalAvailable } = useRetentionData({
    dateRange,
    granularity,
  })

  // Clamp limit to what's actually available
  const effectiveLimit = totalAvailable > 0 ? Math.min(cohortLimit, totalAvailable) : cohortLimit
  const visibleData = useMemo(
    () => retentionData.slice(0, effectiveLimit),
    [retentionData, effectiveLimit]
  )

  // Recompute averages over visible cohorts only
  const visibleAvgMilestones = useMemo(() => {
    if (visibleData.length === 0) return milestones.map(() => 0)
    return milestones.map(
      (_, i) =>
        visibleData.reduce((acc, r) => acc + (r.milestone_values[i] ?? 0), 0) / visibleData.length
    )
  }, [visibleData, milestones])

  const isEmpty = !isLoading && retentionData.length === 0

  if (isError) return <QueryError error={error} />

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className={TYPOGRAPHY.pageLabel}>Retention</span>
            <div className="flex items-center gap-3 shrink-0">
              {/* Granularity toggle */}
              <div className="flex items-center border rounded-md p-1">
                {GRANULARITIES.map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={granularity === value ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setGranularity(value)}
                    className="h-7"
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* Cohort count slider */}
              {totalAvailable > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {effectiveLimit} / {totalAvailable} cohorts
                  </span>
                  <Slider
                    min={1}
                    max={totalAvailable}
                    step={1}
                    value={[effectiveLimit]}
                    onValueChange={([v]) => setCohortLimit(v)}
                    className="w-32"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Milestone metric cards */}
          {milestones.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {milestones.map((unit, i) => (
                <MetricCard
                  key={unit}
                  title={milestoneTitle(granularity, unit)}
                  value={visibleAvgMilestones[i] ?? 0}
                  granularity={granularity}
                  milestone={unit}
                />
              ))}
            </div>
          )}

          {/* Cohort heatmap with sparklines */}
          <Card>
            <CardContent className="p-0 pb-0">
              {isLoading ? (
                <div className="p-6">
                  <TableSkeleton />
                </div>
              ) : isEmpty ? (
                <div className="p-6">
                  <EmptyState
                    icon={Users}
                    title="No retention data"
                    description="Try expanding the date range."
                  />
                </div>
              ) : (
                <RetentionTable
                  data={visibleData}
                  granularity={granularity}
                  milestones={milestones}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
