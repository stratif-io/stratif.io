import { useAppStore } from '@/stores'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PageTransition } from '@/components/layout/PageTransition'
import { MetricCard } from './components/MetricCard'
import { ActivityChart } from './components/ActivityChart'
import { TopEvents } from './components/TopEvents'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { MousePointerClick, Users, Clock, Target } from 'lucide-react'
import { SPACING, TYPOGRAPHY, GRID_COLS } from '@/lib/constants'

export function DashboardPage() {
  const { dateRange } = useAppStore()
  const { metrics, isLoading, eventsLoading } = useDashboardMetrics({ dateRange })

  return (
    <TooltipProvider>
      <PageTransition>
        <div className={SPACING.page}>
          <div className={SPACING.section}>
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className={TYPOGRAPHY.pageTitle}>Dashboard</h1>
                <p className={`${TYPOGRAPHY.muted} mt-1`}>
                  Welcome back! Here's what's happening with your product.
                </p>
              </div>
            </div>

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
                  title="Avg Session"
                  value={`${Math.floor(metrics.avgDuration / 60)}m ${Math.round(metrics.avgDuration % 60)}s`}
                  change={8.5}
                  changeType="positive"
                  icon={Clock}
                  description="vs previous period"
                  loading={isLoading}
                />
              </div>
              <div style={{ animationDelay: '300ms' }}>
                <MetricCard
                  title="Conversion Rate"
                  value={`${metrics.conversionRate.toFixed(1)}%`}
                  change={12.3}
                  changeType="positive"
                  icon={Target}
                  description="Users who purchased after viewing home"
                  tooltip="Calculated as: users who completed a Purchase event after their first Home event, divided by total users who viewed Home."
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
