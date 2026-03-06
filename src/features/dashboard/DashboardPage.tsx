import { useAppStore } from '@/stores'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PageTransition } from '@/components/layout/PageTransition'
import { MetricCard } from './components/MetricCard'
import { ActivityChart } from './components/ActivityChart'
import { TopEvents } from './components/TopEvents'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { MousePointerClick, Users, Layers } from 'lucide-react'
import { QueryError } from '@/components/ui/query-error'
import { SPACING, TYPOGRAPHY, GRID_COLS } from '@/lib/constants'

export function DashboardPage() {
  const { dateRange } = useAppStore()
  const { metrics, isLoading, isError, error, eventsLoading } = useDashboardMetrics({ dateRange })

  if (isError) return <QueryError error={error} />

  return (
    <TooltipProvider>
      <PageTransition>
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            <span className={TYPOGRAPHY.pageLabel}>Dashboard</span>

            {/* Metric Cards with staggered animations */}
            <div className={`grid ${GRID_COLS.metrics} ${SPACING.gridGap}`}>
              <div style={{ animationDelay: '0ms' }}>
                <MetricCard
                  title="Total Events"
                  value={metrics.totalEvents.toLocaleString()}
                  numericValue={metrics.totalEvents}
                  change={5.2}
                  changeType="positive"
                  icon={MousePointerClick}
                  description="vs previous period"
                  loading={isLoading}
                />
              </div>
              <div style={{ animationDelay: '100ms' }}>
                <MetricCard
                  title="Unique Users"
                  value={metrics.uniqueUsers.toLocaleString()}
                  numericValue={metrics.uniqueUsers}
                  change={-2.1}
                  changeType="negative"
                  icon={Users}
                  description="vs previous period"
                  loading={isLoading}
                />
              </div>
              <div style={{ animationDelay: '200ms' }}>
                <MetricCard
                  title="Total Sessions"
                  value={metrics.totalSessions.toLocaleString()}
                  numericValue={metrics.totalSessions}
                  change={0}
                  changeType="neutral"
                  icon={Layers}
                  description="unique sessions"
                  loading={isLoading}
                />
              </div>
            </div>

            {/* Charts Grid */}
            <div className={`grid gap-6 lg:grid-cols-3`}>
              <ActivityChart data={metrics.chartData} loading={isLoading} />
              <TopEvents events={metrics.topEvents} loading={eventsLoading} />
            </div>
          </div>
        </div>
      </PageTransition>
    </TooltipProvider>
  )
}
