import { useState, useMemo, useEffect } from 'react'
import { ShareModal } from '@/features/reports/ShareModal'
import type { Granularity } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'

import { Slider } from '@/components/ui/slider'
import { PageTransition } from '@/components/layout/PageTransition'
import { Header } from '@/components/layout/Header'
import { PageConfigBar } from '@/components/layout/PageConfigBar'
import { SummaryPanel } from '@/components/layout/SummaryPanel'
import { TableSkeleton } from '@/components/ui/loading-state'
import { QueryError } from '@/components/ui/query-error'
import { EmptyState } from '@/components/ui/empty-state'
import { Info, Users } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/stores'
import { useRetentionData, type RetentionGranularity } from './hooks/useRetentionData'
import { RetentionTable } from './components/RetentionTable'
import { DevCard } from '@/components/dev'
import { NoConnectionGuard } from '@/components/ui/no-connection-guard'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

function toRetentionGranularity(g: Granularity): RetentionGranularity {
  if (g === 'hour') return 'day'
  return g
}

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
  quarter_1: { good: 30, ok: 12 },
  quarter_2: { good: 20, ok: 8 },
  quarter_3: { good: 15, ok: 5 },
  quarter_4: { good: 10, ok: 3 },
  year_1: { good: 25, ok: 10 },
  year_2: { good: 15, ok: 5 },
  year_3: { good: 10, ok: 3 },
}

function getRetentionLabel(value: number, granularity: RetentionGranularity, milestone: number) {
  const key = `${granularity}_${milestone}`
  const b = BENCHMARKS[key] ?? { good: 20, ok: 5 }
  if (value >= b.good) return { label: 'Good', color: 'text-success' }
  if (value >= b.ok) return { label: 'Average', color: 'text-[hsl(var(--warning))]' }
  return { label: 'Low', color: 'text-destructive' }
}

function milestoneTitle(granularity: RetentionGranularity, unit: number): string {
  if (granularity === 'week') return `Week ${unit} Retention`
  if (granularity === 'month') return `Month ${unit} Retention`
  if (granularity === 'quarter') return `Quarter ${unit} Retention`
  if (granularity === 'year') return `Year ${unit} Retention`
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
  const animatedValue = useCountUp(value, { decimals: 1 })
  const key = `${granularity}_${milestone}`
  const b = BENCHMARKS[key] ?? { good: 20, ok: 5 }
  const unit = granularity === 'week' ? 'week' : granularity === 'month' ? 'month' : 'day'
  const tooltipText = `Good ≥ ${b.good}% · Average ≥ ${b.ok}% · based on industry benchmarks for ${unit} ${milestone} retention`
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm p-3 transition-colors hover:border-primary/50">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">{title}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-lg font-bold tracking-tight leading-none">{animatedValue.toFixed(1)}%</p>
        <span className={cn('text-xs font-medium pb-0.5', color)}>{label}</span>
      </div>
    </div>
  )
}

export function RetentionPage() {
  useEffect(() => {
    document.title = 'Retention — stratif.io'
  }, [])

  const [shareOpen, setShareOpen] = useState(false)
  const { dateRange, activeFilters, granularity: globalGranularity, dashboardView } = useAppStore()
  const granularity = toRetentionGranularity(globalGranularity)
  const [cohortLimit, setCohortLimit] = useState(10)

  const {
    retentionData,
    milestones,
    isLoading,
    isError,
    error,
    refetch,
    avgMilestones: _avgMilestones,
    totalAvailable,
    sql,
  } = useRetentionData({
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

  const d1Value = visibleAvgMilestones[0] ?? 0
  const d7Index = milestones.findIndex((m) => m === 7)
  const d7Value = d7Index >= 0 ? (visibleAvgMilestones[d7Index] ?? 0) : null
  const d30Index = milestones.findIndex((m) => m === 30)
  const d30Value = d30Index >= 0 ? (visibleAvgMilestones[d30Index] ?? 0) : null
  const summaryInsight =
    milestones.length > 0
      ? `${milestoneTitle(granularity, milestones[0])}: ${d1Value.toFixed(1)}%${d7Value !== null ? ` · ${milestoneTitle(granularity, 7)}: ${d7Value.toFixed(1)}%` : ''}${d30Value !== null ? ` · ${milestoneTitle(granularity, 30)}: ${d30Value.toFixed(1)}%` : ''}`
      : 'No retention data available for this date range.'

  const summaryTotals = milestones.slice(0, 3).map((unit, i) => ({
    label: milestoneTitle(granularity, unit),
    value: `${(visibleAvgMilestones[i] ?? 0).toFixed(1)}%`,
    color: `hsl(var(--chart-${i + 1}))`,
  }))

  return (
    <PageTransition>
      <NoConnectionGuard>
        <div className="flex flex-col h-full">
          {/* Zone 1: Header */}
          <Header
            title="Retention"
            subtitle="Cohort analysis"
            showShare
            onShare={() => setShareOpen(true)}
          />

          {/* Zone 2: Config bar */}
          <PageConfigBar>
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
                  className="w-24 sm:w-32"
                />
              </div>
            )}
          </PageConfigBar>

          {/* Zone 3: Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex gap-3">
              <div className="flex-1 min-w-0 space-y-4">
                {/* Milestone metric cards */}
                {milestones.length > 0 && (
                  <>
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
                    {visibleAvgMilestones.length > 0 &&
                      visibleAvgMilestones.every((v) => v === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Not enough return visits in this date range — try widening the date range
                          or removing filters.
                        </p>
                      )}
                  </>
                )}

                {/* Cohort heatmap with sparklines */}
                <DevCard sql={sql}>
                  <Card className="relative overflow-hidden">
                    <CardLoadingBar loading={isLoading} />
                    <CardContent className="p-0 pb-0">
                      {isError ? (
                        <div className="p-6">
                          <QueryError error={error} onRetry={refetch} />
                        </div>
                      ) : isLoading ? (
                        <div className="p-6">
                          <TableSkeleton />
                        </div>
                      ) : isEmpty ? (
                        <div className="p-6">
                          <EmptyState
                            icon={Users}
                            title="No cohorts to show"
                            description="No new users were found in this date range. Try widening it to see retention cohorts."
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
                </DevCard>
              </div>
              {dashboardView === 'summary' && summaryTotals.length > 0 && (
                <SummaryPanel insight={summaryInsight} totals={summaryTotals} />
              )}
            </div>
          </div>
        </div>
      </NoConnectionGuard>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        page="retention"
        pageLabel="Retention"
        params={{ dateRange, activeFilters }}
      />
    </PageTransition>
  )
}
