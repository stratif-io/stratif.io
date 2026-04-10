import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores'
import { PageTransition } from '@/components/layout/PageTransition'
import { MissionControlGrid } from './components/MissionControlGrid'
import { LearnPanel } from './components/LearnPanel'
import { TopEvents } from './components/TopEvents'
import { useMissionControl } from './hooks/useMissionControl'
import { useMissionControlTrends } from './hooks/useMissionControlTrends'
import { usePinnedMetrics } from './hooks/usePinnedMetrics'
import { QueryError } from '@/components/ui/query-error'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { DevCard } from '@/components/dev'
import { NoConnectionScreen } from '@/components/ui/no-connection-guard'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { computePctChange, formatPeriodRange } from '@/lib/format-metric'
import type { TrendMetric } from './hooks/useMissionControlTrends'

export function DashboardPage() {
  useEffect(() => {
    document.title = 'Mission Control — stratif.io'
  }, [])

  const { dateRange, activeConnectionId, setActiveConnectionId } = useAppStore()
  const { pinned, togglePin, isPinned, resetToDefault } = usePinnedMetrics(
    activeConnectionId ?? null
  )
  const { data, metricLoading, metricSql, isError, error, topEvents, eventsLoading, topEventsSql } =
    useMissionControl({
      dateRange,
    })
  const { trends } = useMissionControlTrends({ dateRange, visibleMetrics: pinned })

  const [heroMetric, setHeroMetric] = useState<TrendMetric>('total_events')
  const [learnOpen, setLearnOpen] = useState(false)

  const isConnectionNotFound =
    isError &&
    error instanceof Error &&
    error.message.toLowerCase().includes('connection not found')

  useEffect(() => {
    if (isConnectionNotFound && activeConnectionId) {
      setActiveConnectionId(null)
    }
  }, [isConnectionNotFound, activeConnectionId, setActiveConnectionId])

  const allMetricsLoaded = Object.values(metricLoading).every((v) => !v)
  const isEmpty = !isError && allMetricsLoaded && topEvents.length === 0

  if (!activeConnectionId || isConnectionNotFound) {
    return (
      <PageTransition>
        <NoConnectionScreen />
      </PageTransition>
    )
  }

  // Hero metric values for the learn panel
  const heroCurrentValue = data?.current[heroMetric as keyof typeof data.current] ?? 0
  const heroPreviousValue = data?.previous[heroMetric as keyof typeof data.previous] ?? null
  const heroPctChange = computePctChange(heroCurrentValue, heroPreviousValue)
  const currentRange = formatPeriodRange(data?.period?.start_date, data?.period?.end_date)
  const previousRange = formatPeriodRange(
    data?.previous_period?.start_date,
    data?.previous_period?.end_date
  )

  return (
    <PageTransition>
      <div className="flex min-h-full">
        {/* Main scrollable content */}
        <div className={cn('flex-1 min-w-0', SPACING.page)}>
          <div className={SPACING.section}>
            <h1 className={TYPOGRAPHY.pageLabel}>Mission Control</h1>

            {isError ? (
              <QueryError error={error} />
            ) : isEmpty ? (
              <EmptyState
                icon={TrendingUp}
                title="No events yet"
                description="Your dashboard will populate once events start flowing in. Try expanding the date range if you expect data."
              />
            ) : (
              <>
                <MissionControlGrid
                  data={data}
                  trends={trends}
                  metricLoading={metricLoading}
                  metricSql={metricSql}
                  togglePin={togglePin}
                  isPinned={isPinned}
                  resetToDefault={resetToDefault}
                  heroMetric={heroMetric}
                  onHeroChange={setHeroMetric}
                  learnOpen={learnOpen}
                  onLearnToggle={() => setLearnOpen((v) => !v)}
                />
                <DevCard sql={topEventsSql}>
                  <TopEvents events={topEvents} loading={eventsLoading} />
                </DevCard>
              </>
            )}
          </div>
        </div>

        {/* Learn panel — in-flow, pushes main content */}
        <div
          className={cn(
            'shrink-0 border-l border-border bg-card',
            'sticky top-0 self-start h-screen overflow-hidden',
            'transition-[width] duration-300 ease-out',
            learnOpen ? 'w-80' : 'w-0'
          )}
        >
          <div className="w-80 h-full">
            <LearnPanel
              metricKey={heroMetric}
              label={heroMetric}
              currentMetrics={data?.current}
              previousMetrics={data?.previous}
              pctChange={heroPctChange}
              onClose={() => setLearnOpen(false)}
              currentRange={currentRange ?? undefined}
              previousRange={previousRange ?? undefined}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
