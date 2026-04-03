import { useEffect } from 'react'
import { useAppStore } from '@/stores'
import { PageTransition } from '@/components/layout/PageTransition'
import { Header } from '@/components/layout/Header'
import { MissionControlGrid } from './components/MissionControlGrid'
import { SummaryDashboard } from './components/SummaryDashboard'
import { TopEvents } from './components/TopEvents'
import { useMissionControl } from './hooks/useMissionControl'
import { useMissionControlTrends } from './hooks/useMissionControlTrends'
import { usePinnedMetrics } from './hooks/usePinnedMetrics'
import { QueryError } from '@/components/ui/query-error'
import { DevCard } from '@/components/dev'
import { NoConnectionScreen } from '@/components/ui/no-connection-guard'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const { dateRange, activeConnectionId, setActiveConnectionId, dashboardView, setDashboardView } =
    useAppStore()
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
        <Header title={`${getGreeting()}, you`} subtitle="Mission Control">
          <div className="flex bg-muted/60 border border-border rounded-lg p-0.5 gap-0.5">
            {(['summary', 'detail'] as const).map((view) => (
              <button
                key={view}
                aria-label={view}
                onClick={() => setDashboardView(view)}
                className={cn(
                  'px-3 py-1 rounded-md text-[10px] font-semibold capitalize transition-colors',
                  dashboardView === view
                    ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {view}
              </button>
            ))}
          </div>
        </Header>

        <div className="flex-1 overflow-y-auto p-5">
          {isError ? (
            <QueryError error={error} />
          ) : isEmpty ? (
            <EmptyState
              icon={TrendingUp}
              title="No events yet"
              description="Your dashboard will populate once events start flowing in. Try expanding the date range if you expect data."
            />
          ) : dashboardView === 'summary' ? (
            <SummaryDashboard />
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
              <DevCard sql={topEventsSql}>
                <TopEvents events={topEvents} loading={eventsLoading} />
              </DevCard>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
