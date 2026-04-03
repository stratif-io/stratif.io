import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores'
import { ShareModal } from '@/features/reports/ShareModal'
import { PageTransition } from '@/components/layout/PageTransition'
import { Header } from '@/components/layout/Header'
import { MissionControlGrid } from './components/MissionControlGrid'
import { TopEvents } from './components/TopEvents'
import { useMissionControl } from './hooks/useMissionControl'
import { useMissionControlTrends } from './hooks/useMissionControlTrends'
import { usePinnedMetrics } from './hooks/usePinnedMetrics'
import { QueryError } from '@/components/ui/query-error'
import { DevCard } from '@/components/dev'
import { NoConnectionScreen } from '@/components/ui/no-connection-guard'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendingUp } from 'lucide-react'
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  useEffect(() => {
    document.title = 'Mission Control — stratif.io'
  }, [])

  const [shareOpen, setShareOpen] = useState(false)
  const { dateRange, activeFilters, activeConnectionId, setActiveConnectionId } = useAppStore()
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
      <div className="flex flex-col h-full">
        <Header
          title={`${getGreeting()}, you`}
          subtitle="Mission Control"
          showShare
          onShare={() => setShareOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-5">
          {isError ? (
            <QueryError error={error} />
          ) : isEmpty ? (
            <EmptyState
              icon={TrendingUp}
              title="No events yet"
              description="Your dashboard will populate once events start flowing in. Try expanding the date range if you expect data."
            />
          ) : (
            <div data-testid="mission-control-grid">
              <MissionControlGrid
                data={data}
                trends={trends}
                metricLoading={metricLoading}
                metricSql={metricSql}
                togglePin={togglePin}
                isPinned={isPinned}
                resetToDefault={resetToDefault}
              />
              <div className="mt-8">
                <DevCard sql={topEventsSql}>
                  <TopEvents events={topEvents} loading={eventsLoading} />
                </DevCard>
              </div>
            </div>
          )}
        </div>
      </div>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        page="dashboard"
        pageLabel="Dashboard"
        params={{ dateRange, activeFilters }}
      />
    </PageTransition>
  )
}
