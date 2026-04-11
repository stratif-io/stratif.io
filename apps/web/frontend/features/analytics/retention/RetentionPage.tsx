import { useState, useEffect } from 'react'
import type { Granularity } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { CardLoadingBar } from '@/components/ui/card-loading-bar'
import { Slider } from '@/components/ui/slider'
import { PageTransition } from '@/components/layout/PageTransition'
import { TableSkeleton } from '@/components/ui/loading-state'
import { QueryError } from '@/components/ui/query-error'
import { EmptyState } from '@/components/ui/empty-state'
import { BookOpen, Users } from 'lucide-react'
import { useAppStore } from '@/stores'
import { useRetentionData, type RetentionGranularity } from './hooks/useRetentionData'
import { RetentionTable } from './components/RetentionTable'
import { RetentionLearnPanel } from './components/RetentionLearnPanel'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { NoConnectionGuard } from '@/components/ui/no-connection-guard'
import { DevCard } from '@/components/dev'
import { cn } from '@/lib/utils'
import { useAnalytics } from '@/lib/analytics'

function toRetentionGranularity(g: Granularity): RetentionGranularity {
  if (g === 'hour') return 'day'
  return g
}

export function RetentionPage() {
  const { track } = useAnalytics()
  const [learnOpen, setLearnOpen] = useState(false)

  useEffect(() => {
    track('chart_viewed', { chart_type: 'retention' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.title = 'Retention — stratif.io'
  }, [])

  const { dateRange, granularity: globalGranularity } = useAppStore()
  const granularity = toRetentionGranularity(globalGranularity)
  const [cohortLimit, setCohortLimit] = useState(10)

  const { retentionData, milestones, isLoading, isError, error, refetch, totalAvailable, sql } =
    useRetentionData({ dateRange, granularity })

  const effectiveLimit = totalAvailable > 0 ? Math.min(cohortLimit, totalAvailable) : cohortLimit
  const visibleData = retentionData.slice(0, effectiveLimit)
  const isEmpty = !isLoading && retentionData.length === 0

  return (
    <PageTransition>
      <NoConnectionGuard>
        <div className={cn(SPACING.page, 'flex flex-col h-full')}>
          <div className={cn(SPACING.section, 'flex flex-col flex-1 min-h-0')}>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className={TYPOGRAPHY.pageLabel}>Retention</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                {/* Learn */}
                <button
                  onClick={() => setLearnOpen((v) => !v)}
                  aria-pressed={learnOpen}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all',
                    learnOpen
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  <BookOpen className="h-3 w-3" />
                  Learn
                </button>
              </div>
            </div>

            {/* Cohort table + Learn panel */}
            <div className="flex flex-1 overflow-hidden">
              <DevCard sql={sql} className="flex-1 min-w-0">
                <Card className="relative overflow-hidden h-full">
                  <CardLoadingBar loading={isLoading} />
                  <CardContent className="p-0 pb-0 h-full">
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

              {/* Learn panel */}
              <div
                className={cn(
                  'shrink-0 border-l border-border bg-card overflow-hidden',
                  'transition-[width] duration-300 ease-out',
                  learnOpen ? 'w-80' : 'w-0'
                )}
              >
                <div className="w-80 h-full">
                  <RetentionLearnPanel onClose={() => setLearnOpen(false)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </NoConnectionGuard>
    </PageTransition>
  )
}
