import { useEffect } from 'react'
import { useAppStore } from '@/stores'
import { PageTransition } from '@/components/layout/PageTransition'
import { MissionControlGrid } from './components/MissionControlGrid'
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

  return (
    <PageTransition>
      <div className={SPACING.page}>
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
                dateRange={dateRange}
                togglePin={togglePin}
                isPinned={isPinned}
                resetToDefault={resetToDefault}
              />
              <DevCard sql={topEventsSql}>
                <TopEvents events={topEvents} loading={eventsLoading} />
              </DevCard>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
