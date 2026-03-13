import { useAppStore } from '@/stores'
import { PageTransition } from '@/components/layout/PageTransition'
import { MetricCard } from './components/MetricCard'
import { ActivityChart } from './components/ActivityChart'
import { TopEvents } from './components/TopEvents'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { QueryError } from '@/components/ui/query-error'
import { SPACING, TYPOGRAPHY, GRID_COLS } from '@/lib/constants'

export function DashboardPage() {
  const { dateRange } = useAppStore()
  const { metrics, isLoading, isError, error, eventsLoading } = useDashboardMetrics({ dateRange })

  if (isError) return <QueryError error={error} />

  return (
    <PageTransition>
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            <span className={TYPOGRAPHY.pageLabel}>Dashboard</span>

            {/* Metric Cards */}
            <div className={`grid ${GRID_COLS.metrics} ${SPACING.gridGap}`}>
              <MetricCard
                title="Total Events"
                value={metrics.totalEvents.toLocaleString()}
                numericValue={metrics.totalEvents}
                change={0}
                changeType="neutral"
                description="in selected period"
                subtitle={metrics.uniqueUsers > 0 ? `${(metrics.totalEvents / metrics.uniqueUsers).toFixed(1)} events / user` : undefined}
                loading={isLoading}
              />
              <MetricCard
                title="Unique Users"
                value={metrics.uniqueUsers.toLocaleString()}
                numericValue={metrics.uniqueUsers}
                change={0}
                changeType="neutral"
                description="in selected period"
                loading={isLoading}
                className="motion-safe:[animation-delay:75ms]"
              />
              <MetricCard
                title="Total Sessions"
                value={metrics.totalSessions.toLocaleString()}
                numericValue={metrics.totalSessions}
                change={0}
                changeType="neutral"
                description="in selected period"
                subtitle={metrics.uniqueUsers > 0 ? `${(metrics.totalSessions / metrics.uniqueUsers).toFixed(1)} sessions / user` : undefined}
                loading={isLoading}
                className="motion-safe:[animation-delay:150ms]"
              />
            </div>

            {/* Charts Grid */}
            <div className={`grid ${SPACING.gridGap} lg:grid-cols-3`}>
              <ActivityChart data={metrics.chartData} loading={isLoading} />
              <TopEvents events={metrics.topEvents} loading={eventsLoading} />
            </div>
          </div>
        </div>
    </PageTransition>
  )
}
